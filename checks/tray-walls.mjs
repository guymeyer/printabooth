// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module());
const c = structuredClone(g.DEFAULTS); c.fitMode='hug';
const m = E.printed('cassette', c); const bb = m.boundingBox();
for (const z of [1, 3, 4.5, 6, 8.5]) {
  const cs = m.slice(z); const parts = cs.decompose();
  // min wall: erode until topology changes
  let minW = null; for (let w = 0.2; w < 4; w += 0.2) { const e = cs.offset(-w/2,'Round',2,24); if (e.decompose().length !== parts.length || e.area() < 1) { minW = w; break; } }
  console.log('z', z, 'area', cs.area().toFixed(0), 'pieces', parts.length, 'splits at wall ~', minW);
}
const d = g.derive(c); console.log('Cw', d.Cw, 'Ch', d.Ch, 'rCass', d.rCass, 'pw?');
