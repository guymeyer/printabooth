// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module());
for (const mode of ['universal','hug']) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = mode; c.shell.nExt = 1;
  const asm = g.assembly(c), d = g.derive(c);
  const parts = asm.items.map((it, k) => ({ n: it.part, m: g.place(E.raw(it.part, c), it) }));
  const bad = [];
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const v = parts[i].m.intersect(parts[j].m).volume(); if (v > 1) bad.push(`${parts[i].n}x${parts[j].n}:${v.toFixed(0)}`);
  }
  const cas = parts.find(p => p.n === 'cassette').m.boundingBox();
  console.log(mode, 'lip', d.lip, 'fd', d.fd, 'Sy', d.Sy, 'cassette top', cas.max[1].toFixed(2), 'parts', asm.items.map(i=>i.part).join(','), 'overlaps', bad, g.validate(c).map(i => i.msg.slice(0, 50)));
  E.flush();
}
