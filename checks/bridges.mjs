// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Bridged roofs in the parts as they print (frame face down, rings and wall case front edge down). A slicer gives each
// separately bridged island one bridge direction; an island that turns a corner (the LED channel's U, a ring's socket loop)
// gets bridged lengthwise along some of its runs and sags. So every island bridged on a layer must be one straight run:
// its bounding box at most 60 mm across in one direction.   node checks/bridges.mjs
import Module from "manifold-3d";
import * as g from "../app/geom.js";
const E = g.makeEngine(await Module());
let bad = 0;
for (const fm of ["hug", "universal"]) for (const nz of [0.4, 0.8]) for (const strip of ["topxcdz", "adafruit"]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = fm; c.print.nozzle = nz; c.led.strip = strip; Object.assign(c.led, g.ledFit(c, strip));
  const lh = nz * 0.5;
  for (const p of ["frame", "ring1", "ringExt"]) {
    const m = E.printed(p, c), bb = m.boundingBox(), worst = [];
    for (let z = lh * 1.5; z < bb.max[2] - lh; z += lh) {
      const below = m.slice(z - lh), here = m.slice(z), cut = here.subtract(below.offset(0.5, "Square")), roof = cut.offset(-0.3, "Square");   // new material over air; one-sided ledges up to ~1 mm drop out
      for (const isl of roof.decompose()) {
        if (isl.area() < 20) { isl.delete(); continue; }
        const b = isl.bounds(), w = b.max[0] - b.min[0], h = b.max[1] - b.min[1];
        if (Math.min(w, h) > 60) worst.push(`z${z.toFixed(1)} ${w.toFixed(0)}x${h.toFixed(0)}`);
        isl.delete();
      }
      [below, here, cut, roof].forEach((x) => x.delete());
    }
    const ok = !worst.length; if (!ok) bad++;
    console.log(ok ? "ok  " : "FAIL", fm.padEnd(9), `${nz} mm`, strip.padEnd(8), p.padEnd(8), ok ? "every bridged island is one straight run" : worst.join(", "));
    E.flush();
  }
}
process.exit(bad ? 1 : 0);
