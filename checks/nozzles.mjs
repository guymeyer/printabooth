// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Builds the head at every nozzle size and fit and checks the parts still fit together, are single bodies, and that the
// shell walls landed on whole extrusion widths.   node checks/nozzles.mjs
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module());
let bad = 0;
for (const nozzle of g.NOZZLES) for (const [mode, ori, led] of [['hug', 'landscape', true], ['hug', 'portrait', true], ['hug', 'landscape', false], ['universal', 'landscape', true]]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = mode; c.orientation = ori; c.led.on = led; c.print.nozzle = nozzle;
  const d = g.derive(c), P = d.plan, base = structuredClone(c); base.print.nozzle = 0.4;
  const parts = g.assembly(c).items.map((it) => ({ n: it.part, m: g.place(E.raw(it.part, c), it) }));
  const over = [];
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const v = parts[i].m.intersect(parts[j].m).volume(); if (v > 1) over.push(`${parts[i].n}x${parts[j].n}:${v.toFixed(0)}`); }
  const multi = parts.filter((p) => p.m.decompose().length > (p.n === 'diffuser' ? 2 : 1)).map((p) => p.n);
  const lines = (t) => +(t / P.ew).toFixed(3);
  const walls = { wall: d.wall, tongue: d.lapT, socketSkin: P.sock, ledSkin: led ? d.ledSkin : null, ledGap: led ? +d.ledGap.toFixed(3) : null };
  const notWhole = Object.entries(walls).filter(([k, v]) => v != null && (v / P.ew > 8 ? false : Math.abs(lines(v) - Math.round(lines(v))) > 0.01)).map(([k]) => k);
  const ok = !over.length && !multi.length && !notWhole.length;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${nozzle} ${mode} ${ori} led:${led}  Sw ${d.Sw.toFixed(1)} x ${d.Sh.toFixed(1)}  wall ${d.wall} tongue ${d.lapT}@${d.lapA} skin ${P.sock} lip ${d.lip} back ${d.backT} led ${d.ledSkin}/${d.ledW}/${d.ledGap.toFixed(2)} seamX ${d.seamX}`,
    over.length ? 'OVERLAP ' + over : '', multi.length ? 'MULTI ' + multi : '', notWhole.length ? 'NOT WHOLE ' + notWhole : '', g.validate(c).map((i) => i.msg.slice(0, 60)).join(' | '));
  E.flush();
}
process.exit(bad ? 1 : 0);
