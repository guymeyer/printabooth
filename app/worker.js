// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
import Module from "./manifold.js";
import { makeEngine, PART_INFO, SEAM_REAR } from "./geom.js";
import { PRINTERS, MAX_BEDS, packBeds, projectFiles } from "./pack3mf.js";

let E = null;
const ready = Module({ locateFile: (p) => new URL("./" + p, import.meta.url).href }).then((wasm) => {
  E = makeEngine(wasm);
  postMessage({ type: "ready" });
}).catch((err) => postMessage({ type: "fatal", msg: String(err && err.message || err) }));

onmessage = async (ev) => {
  await ready;
  const { id, type, cfg, parts } = ev.data;
  try {
    if (type === "build") {
      const out = {}, transfer = [];
      for (const p of parts) {
        const m = E.build(p, cfg, true);
        const pos = m.pos.slice(), idx = m.idx.slice();
        out[p] = { pos, idx, vol: m.vol, bbox: m.bbox };
        transfer.push(pos.buffer, idx.buffer);
      }
      const holes = E.backHoles(cfg);
      const sockets = E.sockets(cfg);
      postMessage({ id, type: "built", parts: out, holes, sockets }, transfer);
    } else if (type === "export") {
      const out = {}, transfer = [], meshes = {};
      for (const p of parts) {
        postMessage({ id, type: "progress", part: p });
        const r = E.exportSTL(p, cfg);
        meshes[p] = { pos: r.pos, idx: r.idx, mods: r.mods || [] };
        out[p] = { buf: r.buf, size: r.size };
        transfer.push(r.buf);
      }
      // PrusaSlicer projects: one per printer, parts laid out over as many beds as they need; or (oneProject) every part in a
      // single XL project, since every part fits the XL's bed but not every part fits the Core One's
      let projects = [];
      if (ev.data.qty) {
        postMessage({ id, type: "progress", part: "projects" });
        const groups = { xl: [], coreone: [] };
        const fits = (s, bed) => { const a = [s[0], s[1]].sort((x, y) => y - x), b = bed.slice().sort((x, y) => y - x); return a[0] <= b[0] - 12 && a[1] <= b[1] - 12; };
        for (const p of parts) {
          const want = (PART_INFO[p] || {}).printer === "Core One" ? "coreone" : "xl";
          const g = ev.data.oneProject || (want === "coreone" && !fits(out[p].size, PRINTERS.coreone.bed)) ? "xl" : want;
          const n = ev.data.qty[p] || 1;
          for (let k = 0; k < n; k++) groups[g].push({ name: p, fixed: SEAM_REAR.has(p), objName: ev.data.labels[p], label: ev.data.labels[p] + (n > 1 ? ` ${k + 1}` : ""), w: out[p].size[0], h: out[p].size[1] });
        }
        for (const [key, items] of Object.entries(groups)) {
          if (!items.length) continue;
          const P = PRINTERS[key], beds = packBeds(items, P.bed);
          for (let f = 0; f * MAX_BEDS < beds.length; f++) {
            const chunk = beds.slice(f * MAX_BEDS, (f + 1) * MAX_BEDS);
            const used = new Set(chunk.flat().map((q) => q.item.name)), sub = {};
            for (const n of used) sub[n] = meshes[n];
            const suffix = beds.length > MAX_BEDS ? `-${f + 1}` : "";
            projects.push({ printer: key, name: `${ev.data.title}-${ev.data.oneProject ? "all-parts" : key}${suffix}`, beds: chunk.length, files: projectFiles(chunk, sub, P.bed, cfg, `${ev.data.title} (${P.label})`, ev.data.per || {}) });
          }
        }
      }
      postMessage({ id, type: "exported", files: out, projects }, transfer);
    }
  } catch (err) {
    postMessage({ id, type: "error", msg: String(err && err.message || err) });
  }
};
