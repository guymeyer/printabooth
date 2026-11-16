// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Slices the front frame's PrusaSlicer project with the real slicer and measures the bridge lines over the LED channel: with
// the bridge-angle modifiers every line must run across the channel, so no line spans more than 12 mm of open air (a line
// may run on further over solid wall, where it's anchored). Needs prusa-slicer on the PATH
// (it skips otherwise).   node checks/slicer-bridges.mjs
import Module from "manifold-3d";
import * as g from "../app/geom.js";
import { packBeds, projectFiles, PRINTERS } from "../app/pack3mf.js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os"; import { join } from "node:path";
try { execFileSync("prusa-slicer", ["--help"], { stdio: "ignore" }); } catch (e) { console.log("skip  prusa-slicer not installed"); process.exit(0); }
const E = g.makeEngine(await Module()), dir = mkdtempSync(join(tmpdir(), "pb-slice-"));
let bad = 0;
const cases = [["universal, 0.8", { print: { nozzle: 0.8 } }], ["hug portrait + dock, 0.4", { fitMode: "hug", orientation: "portrait", camSide: "right", dock: { on: true }, print: { nozzle: 0.4 } }],
  ["hug landscape, Adafruit, 0.6", { fitMode: "hug", led: { strip: "adafruit" }, print: { nozzle: 0.6 } }],
  ["no cassette, portrait + dock, 0.8", { fitMode: "direct", orientation: "portrait", camSide: "right", dock: { on: true }, print: { nozzle: 0.8 } }]];
for (const [name, o] of cases) {
  const c = structuredClone(g.DEFAULTS);
  for (const [k, v] of Object.entries(o)) c[k] = typeof v === "object" ? { ...c[k], ...v } : v;
  if (o.led) Object.assign(c.led, g.ledFit(c, c.led.strip));
  const r = E.exportSTL("frame", c), beds = packBeds([{ name: "frame", fixed: true, label: "Front frame", w: r.size[0], h: r.size[1] }], PRINTERS.xl.bed);
  const files = projectFiles(beds, { frame: { pos: r.pos, idx: r.idx, mods: r.mods } }, PRINTERS.xl.bed, c, "check", {});
  // the printer's own system preset, minus its custom G-code (not needed to slice)
  const key = `xl-${c.print.nozzle}-${c.print.material.toLowerCase()}`, pre = readFileSync(new URL(`../app/presets/${key}.config`, import.meta.url), "utf8");
  const ini = pre.split("\n").filter((l) => /^; [a-z_0-9]+ = /.test(l) && !/_gcode = /.test(l)).map((l) => l.slice(2)).join("\n") + "\nlayer_gcode = G92 E0\n";
  const pj = join(dir, "p.json"), p3 = join(dir, "frame.3mf"), pi = join(dir, "p.ini"), pg = join(dir, "frame.gcode");
  writeFileSync(pj, JSON.stringify(files)); writeFileSync(pi, ini);
  execFileSync("python3", ["-c", "import json,sys,zipfile\nf=json.load(open(sys.argv[1]))\nz=zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED)\nfor k,v in f.items(): z.writestr(k,v)\nz.close()", pj, p3]);
  execFileSync("prusa-slicer", ["--export-gcode", "--load", pi, p3, "--output", pg], { stdio: "ignore" });
  // bridge lines on the layers over the channel floor and the end bays (PrusaSlicer's bridges over sparse infill, under the
  // lip's and back face's solid layers, are on other layers and are supported by the infill)
  const d = g.derive(c), zTop = Math.max(d.led.bayZ, d.ledDepth) + 2 * d.plan.lh, lh = d.plan.lh;
  // the part as placed on the bed, to tell open air (nothing in the layer below) from wall under each line
  let pm = E.printed("frame", c); const pb = pm.boundingBox(), at = beds[0][0];
  pm = pm.translate([at.x - (pb.min[0] + pb.max[0]) / 2, at.y - (pb.min[1] + pb.max[1]) / 2, -pb.min[2]]);
  const air = new Map(), airAt = (zl) => { if (!air.has(zl)) air.set(zl, pm.slice(zl - lh / 2).subtract(pm.slice(zl - 1.5 * lh))); return air.get(zl); };
  const overAir = (zl, x0, y0, x1, y1) => {
    const L = Math.hypot(x1 - x0, y1 - y0), w = 0.1, a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    const strip = E.CrossSection.square([L, w], false).translate([0, -w / 2]).rotate(a).translate([x0, y0]);
    return strip.intersect(airAt(zl)).area() / w;
  };
  let z = 0, typ = "", x = null, y = null, worst = 0, n = 0, where = "";
  for (const line of readFileSync(pg, "utf8").split("\n")) {
    if (line.startsWith(";Z:")) { z = +line.slice(3); continue; }
    if (line.startsWith(";TYPE:")) { typ = line.slice(6).trim(); continue; }
    if (!line.startsWith("G1")) continue;
    const m = Object.fromEntries([...line.matchAll(/([XYE])([-\d.]+)/g)].map((q) => [q[1], +q[2]])), nx = m.X ?? x, ny = m.Y ?? y;
    if (typ === "Bridge infill" && (m.E || 0) > 0 && x !== null && z <= zTop && z >= d.ledDepth - d.plan.lh) { const L = Math.hypot(nx - x, ny - y); if (L > 2) { const A = overAir(z, x, y, nx, ny); if (A > worst + 0.01) where = `z${z} (${x.toFixed(0)},${y.toFixed(0)})-(${nx.toFixed(0)},${ny.toFixed(0)}), ${L.toFixed(1)} mm long`; n++; worst = Math.max(worst, A); } if (false) { n++; if (L > worst) { worst = L; where = `z${z} (${x.toFixed(0)},${y.toFixed(0)})-(${nx.toFixed(0)},${ny.toFixed(0)})`; } } }
    x = nx; y = ny;
  }
  const ok = n > 0 && worst <= 12; if (!ok) bad++;
  console.log(ok ? "ok  " : "FAIL", name.padEnd(30), `${r.mods.length} modifiers, ${n} bridge lines over the channel, longest span over air ${worst.toFixed(1)} mm${ok ? "" : " at " + where}`);
  E.flush();
}
process.exit(bad ? 1 : 0);
