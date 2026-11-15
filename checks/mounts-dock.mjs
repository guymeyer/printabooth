// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Builds every mount (tripod, post hollow/solid, wall) and the USB-C dock: one body per part, no overlaps in the assembly,
// and the dock refused in landscape.
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module());
const mk = (f) => { const c = structuredClone(g.DEFAULTS); f(c); return c; };
const cfgs = {
  tripod: mk(c => {}),
  postHollow: mk(c => { c.mount.type = 'post'; }),
  postSolid: mk(c => { c.mount.type = 'post'; c.mount.pole = 'dowel15'; }),
  wall: mk(c => { c.mount.type = 'wall'; }),
  dockP: mk(c => { c.fitMode = 'hug'; c.orientation = 'portrait'; c.camSide = 'right'; c.dock.on = true; }),
  dockWallAnker: mk(c => { c.fitMode = 'hug'; c.orientation = 'portrait'; c.camSide = 'right'; c.dock.on = true; c.dock.brand = 'anker'; c.mount.type = 'wall'; c.led.on = false; }),
  dockLand: mk(c => { c.fitMode = 'hug'; c.dock.on = true; }),
};
for (const [n, c] of Object.entries(cfgs)) {
  const asm = g.assembly(c), d = g.derive(c);
  const issues = g.validate(c).map(i => i.level[0] + ':' + i.msg.slice(0, 60));
  console.log('==', n, 'Sy', d.Sy, 'Sh', d.Sh.toFixed(1), 'depth', asm.headDepth.toFixed(0), 'dock', d.dock && [d.dock.yS.toFixed(1), d.dock.yFace.toFixed(1), d.dock.zF.toFixed(2), d.dock.zB.toFixed(2), d.chZ1.toFixed(2)].join('/'), issues);
  if (issues.some(i => i[0] === 'e')) continue;
  const parts = asm.items.map(it => ({ n: it.part, m: g.place(E.raw(it.part, c), it) }));
  const extra = d.mount === 'post' ? ['flange'] : [];
  for (const p of [...parts.map(p => p.n), ...extra, 'threadTest']) {
    const m = E.printed(p, c); const bb = m.boundingBox();
    const dec = m.decompose(); const nb = dec.length; dec.forEach(x => x.delete());
    console.log('  ', p.padEnd(10), bb.max.map(v => v.toFixed(0)).join('x'), 'bodies', nb, 'vol', (m.volume()/1000).toFixed(0));
  }
  const bad = [];
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const v = parts[i].m.intersect(parts[j].m).volume(); if (v > 1) bad.push(`${parts[i].n}x${parts[j].n}:${v.toFixed(0)}`); }
  console.log('   overlaps', bad);
  E.flush();
}
