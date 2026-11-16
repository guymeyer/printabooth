// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Bridged roofs in the parts as they print (frame face down, rings front edge down). PrusaSlicer gives each bridged area one
// direction and often picks lengthwise, so the lines sag:
//  - the rings' glue sockets have pointed roofs, so they must have no bridged area at all (beyond ledges under ~1 mm);
//  - the frame's LED channel floor is bridged, and its 3MF project carries modifier boxes setting the angle per run, so every
//    bridged area of the frame must lie inside those boxes. (checks/slicer-bridges.mjs then slices it in PrusaSlicer.)
//   node checks/bridges.mjs
import Module from "manifold-3d";
import * as g from "../app/geom.js";
const E = g.makeEngine(await Module());
let bad = 0;
for (const fm of ["hug", "universal"]) for (const nz of [0.4, 0.8]) for (const strip of ["topxcdz", "adafruit"]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = fm; c.print.nozzle = nz; c.led.strip = strip; Object.assign(c.led, g.ledFit(c, strip));
  const lh = nz * 0.5;
  for (const p of ["frame", "ring1", "ringExt"]) {
    let m = E.printed(p, c); const pb = m.boundingBox();
    m = m.translate([-(pb.min[0] + pb.max[0]) / 2, -(pb.min[1] + pb.max[1]) / 2, -pb.min[2]]);   // as exported (exportSTL)
    const mods = p === "frame" ? E.exportSTL(p, c).mods : [];
    const cover = mods.length ? E.CrossSection.union(mods.map((b) => E.CrossSection.square([b.max[0] - b.min[0], b.max[1] - b.min[1]], false).translate([b.min[0], b.min[1]]))) : null;
    const bb = m.boundingBox(), worst = [];
    let bridged = 0;
    for (let z = lh * 1.5; z < bb.max[2] - lh; z += lh) {
      const below = m.slice(z - lh), here = m.slice(z), cut = here.subtract(below.offset(0.5, "Square")), roof = cut.offset(-0.3, "Square");
      for (const isl of roof.decompose()) {
        if (isl.area() < 20) { isl.delete(); continue; }
        bridged++;
        const b = isl.bounds();
        if (!cover) worst.push(`z${z.toFixed(1)} ${(b.max[0] - b.min[0]).toFixed(0)}x${(b.max[1] - b.min[1]).toFixed(0)}`);
        else { const out = isl.subtract(cover), a = out.area(); if (a > 1) worst.push(`z${z.toFixed(1)} ${a.toFixed(0)} mm2 outside the modifiers`); out.delete(); }
        isl.delete();
      }
      [below, here, cut, roof].forEach((x) => x.delete());
    }
    const ok = !worst.length && (p !== "frame" || bridged > 0); if (!ok) bad++;
    console.log(ok ? "ok  " : "FAIL", fm.padEnd(9), `${nz} mm`, strip.padEnd(8), p.padEnd(8),
      ok ? (p === "frame" ? `${bridged} bridged areas, all inside ${mods.length} bridge-angle modifiers` : "no bridges") : worst.slice(0, 4).join(", "));
    E.flush();
  }
}
// the no-cassette fit with its top cap and screw lock: the cap (printed face down like the frame) and ring 1 with the cap's
// notches and insert boss have no bridged area either, except ring 1's rear-camera keep-outs, bridged across by modifier
for (const [ori, nz] of [["landscape", 0.4], ["portrait", 0.8]]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = "direct"; c.orientation = ori; c.print.nozzle = nz; c.cap.slot = "lock";
  const lh = nz * 0.5;
  for (const p of ["slotCap", "ring1"]) {
    const mods = E.exportSTL(p, c).mods, m = E.printed(p, c);   // ring 1's rear-camera keep-outs are bridged across, by modifier (exportSTL flushes, so first)
    const cover = mods.length ? E.CrossSection.union(mods.map((b) => E.CrossSection.square([b.max[0] - b.min[0], b.max[1] - b.min[1]], false).translate([b.min[0], b.min[1]]))) : null;
    const bb = m.boundingBox(), worst = [];
    for (let z = lh * 1.5; z < bb.max[2] - lh; z += lh) {
      const below = m.slice(z - lh), here = m.slice(z), cut = here.subtract(below.offset(0.5, "Square")), roof = cut.offset(-0.3, "Square");
      for (const isl of roof.decompose()) {
        const out = cover ? isl.subtract(cover) : isl;
        if (out.area() >= 20) { const b = out.bounds(); worst.push(`z${z.toFixed(1)} ${(b.max[0] - b.min[0]).toFixed(0)}x${(b.max[1] - b.min[1]).toFixed(0)} @ x${b.min[0].toFixed(0)} y${b.min[1].toFixed(0)}`); }
        isl.delete(); }
      [below, here, cut, roof].forEach((x) => x.delete());
    }
    if (worst.length) bad++;
    console.log(worst.length ? "FAIL" : "ok  ", "direct   ", `${nz} mm`, ori.padEnd(9), p.padEnd(8), worst.length ? worst.slice(0, 4).join(", ") : mods.length ? `bridged only inside ${mods.length} bridge-angle modifiers` : "no bridges");
    E.flush();
  }
}
process.exit(bad ? 1 : 0);
