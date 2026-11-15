// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
import { PRINTERS, MAX_BEDS, packBeds, projectFiles, bedOffset } from '../app/pack3mf.js';
import { printSettings, applyConfig, presetKey } from '../app/printsettings.js';
import fs from 'fs';
const E = g.makeEngine(await Module());
const mode = process.argv[2] || 'hug', nExt = +(process.argv[3] || 1);
const c = structuredClone(g.DEFAULTS); c.fitMode = mode; c.shell.nExt = nExt;
const qty = { cassette:1, frame:1, ring1:1, diffuser:1, ringExt:nExt, back:1, hub:1, ferrule:3, cassKey: 1 };
const parts = Object.keys(qty).filter(p => p !== 'cassKey' || mode !== 'hug').filter(p => qty[p] > 0);
const out = {}, meshes = {};
for (const p of parts) { const r = E.exportSTL(p, c); out[p] = r; meshes[p] = { pos: r.pos, idx: r.idx }; }
const groups = { xl: [], coreone: [] };
const fits = (s, bed) => { const a = [s[0], s[1]].sort((x, y) => y - x), b = bed.slice().sort((x, y) => y - x); return a[0] <= b[0] - 12 && a[1] <= b[1] - 12; };
for (const p of parts) {
  const want = (g.PART_INFO[p] || {}).printer === 'Core One' ? 'coreone' : 'xl';
  const grp = want === 'coreone' && !fits(out[p].size, PRINTERS.coreone.bed) ? 'xl' : want;
  for (let k = 0; k < qty[p]; k++) groups[grp].push({ name: p, fixed: g.SEAM_REAR.has(p), objName: g.PART_INFO[p].label, label: g.PART_INFO[p].label + (qty[p] > 1 ? ` ${k+1}` : ''), w: out[p].size[0], h: out[p].size[1] });
}
fs.mkdirSync('3mf', { recursive: true });
for (const [key, items] of Object.entries(groups)) {
  const P = PRINTERS[key], beds = packBeds(items, P.bed);
  console.log(key, 'beds', beds.length);
  beds.forEach((b, i) => {
    const [ox, oy] = bedOffset(i, P.bed);
    for (const p of b) {
      const inside = p.x - p.w/2 >= 0 && p.x + p.w/2 <= P.bed[0] && p.y - p.h/2 >= 0 && p.y + p.h/2 <= P.bed[1];
      console.log(`   bed ${i} @(${ox.toFixed(0)},${oy.toFixed(0)}) ${p.item.label.padEnd(18)} ${p.w.toFixed(0)}x${p.h.toFixed(0)} rot ${p.rot} centre ${p.x.toFixed(0)},${p.y.toFixed(0)} ${inside ? 'inside' : '!! OUTSIDE'}`);
    }
  });
  const base = JSON.parse(fs.readFileSync(new URL('../app/presets/index.json', import.meta.url)));
  const ps = printSettings(c, base);
  const files = projectFiles(beds, meshes, P.bed, c, 'test', ps.per);
  const dir = `3mf/${mode}-${key}`; fs.rmSync(dir, { recursive: true, force: true });
  for (const [path, text] of Object.entries(files)) { fs.mkdirSync(`${dir}/${path.split('/').slice(0,-1).join('/') || '.'}`, { recursive: true }); fs.writeFileSync(`${dir}/${path}`, text); }
  fs.mkdirSync(`${dir}/Metadata`, { recursive: true }); fs.writeFileSync(`${dir}/Metadata/Slic3r_PE.config`, applyConfig(fs.readFileSync(new URL(`../app/presets/${presetKey(c, key)}.config`, import.meta.url), 'utf8'), ps[key]));
}
