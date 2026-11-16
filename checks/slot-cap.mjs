// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// The no-cassette fit's top cap (cap.slot "snap" | "lock"), placed as assembled across a spread of booths: it is one body, it
// touches neither the iPad nor any part, its top is flush with the shell and it fills the slit above the iPad, it goes in and
// comes out straight down/up with only its two hooks riding over the dish walls, the hooks sit in their notches at rest with
// the arms bent no more than PETG or PLA takes, and with the screw lock the insert hole and its boss are there.
//   node checks/slot-cap.mjs
import Module from "manifold-3d";
import * as g from "../app/geom.js";
const E = g.makeEngine(await Module()), M = E.Manifold;
let bad = 0;
const cases = [
  ["A16 landscape, snap", { cap: { slot: "snap" } }],
  ["A16 landscape, screw lock", { cap: { slot: "lock" } }],
  ["A16 portrait + dock, lock", { orientation: "portrait", camSide: "right", dock: { on: true }, cap: { slot: "lock" } }],
  ["mini portrait, snap", { preset: "ipad-mini", orientation: "portrait", camSide: "right", cap: { slot: "snap" } }],
  ["Pro 13 landscape, lock", { preset: "ipad-pro-13", cap: { slot: "lock" } }],
  ["iPad 9th gen, snap", { preset: "ipad-9", cap: { slot: "snap" } }],
  ["A16 portrait, wall, lock", { orientation: "portrait", camSide: "left", mount: { type: "wall" }, cap: { slot: "lock" } }],
  ["A16 landscape, LED off, snap", { led: { on: false }, cap: { slot: "snap" } }],
];
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] || {}, v) : v; return a; };
const bb = (m) => { const b = m.boundingBox(); return `x${b.min[0].toFixed(1)}..${b.max[0].toFixed(1)} y${b.min[1].toFixed(1)}..${b.max[1].toFixed(1)} z${b.min[2].toFixed(1)}..${b.max[2].toFixed(1)}`; };
for (const [name, o] of cases) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = "direct";
  const { preset, ...rest } = o; merge(c, rest);
  if (preset) { const { label, ...t } = g.TABLETS[preset]; Object.assign(c.tablet, t, { preset }); }
  const d = g.derive(c), tb = c.tablet, L = g.slotCapLayout(c, d), issues = g.validate(c).filter((i) => i.level === "error"), fails = [];
  const items = g.assembly(c).items, capIt = items.find((i) => i.part === "slotCap");
  if (!capIt) { console.log("FAIL", name, "no top cap in the assembly"); bad++; continue; }
  const cap = g.place(E.raw("slotCap", c), capIt);
  const others = items.filter((i) => ["frame", "ring1", "wallCase", "dockClip", "diffuser"].includes(i.part)).map((i) => ({ n: i.part, m: g.place(E.raw(i.part, c), i) }));
  const shell = M.union(others.filter((p) => p.n !== "dockClip" && p.n !== "diffuser").map((p) => p.m));
  // one body, flush top
  const n = cap.decompose().length; if (n !== 1) fails.push(`${n} bodies`);
  const cb = cap.boundingBox(); if (Math.abs(cb.max[1] - d.Sy) > 0.05) fails.push(`top at ${cb.max[1].toFixed(2)}, shell top ${d.Sy}`);
  // clear of the iPad (same model as checks/direct.mjs: rounded prism, bump 6 mm in from its corner, 1.2 mm proud)
  const cx = d.ipadOff[0], cy = d.ipadOff[1] - d.chanClr, iw = d.iw, ih = d.ih, z0 = d.tabletZ;
  const prism = (za, h) => M.hull([-1, 1].flatMap((sx) => [-1, 1].map((sy) => M.cylinder(h, tb.r, tb.r, 64).translate([cx + sx * (iw / 2 - tb.r), cy + sy * (ih / 2 - tb.r), za]))));
  const K = Math.min(14, tb.bump || 0), [rx, ry] = d.rearCorner;
  const ipad = prism(z0, tb.t).add(M.cube([K, K, 1.2], true).translate([cx + rx * (iw / 2 - 6 - K / 2), cy + ry * (ih / 2 - 6 - K / 2), z0 + tb.t + 0.6]));
  const vi = cap.intersect(ipad).volume(); if (vi > 0.05) fails.push(`hits the iPad ${vi.toFixed(2)} mm3 @ ${bb(cap.intersect(ipad))}`);
  const gapTop = L.yb - (cy + ih / 2); if (gapTop < 0.05 || gapTop > 0.6) fails.push(`gap over the iPad ${gapTop.toFixed(2)} mm`);
  for (const p of others) { const x = cap.intersect(p.m), v = x.volume(); if (v > 0.05) fails.push(`hits ${p.n} ${v.toFixed(2)} mm3 @ ${bb(x)}`); }
  // fills the slit: solid just under the top all along it, and just over the iPad away from the button groove
  const probe = (x, y, z) => cap.intersect(M.cube([0.6, 0.6, 0.6], true).translate([x, y, z])).volume() > 0.2;
  const zMid = (d.lip + d.chZ1) / 2, xs = [-0.45, -0.25, 0, 0.25, 0.45].map((f) => cx + f * d.pw);
  { const miss = xs.flatMap((x) => [[x, (() => { const ax = Math.abs(x) - (d.Sx - d.R); return ax > 0 ? d.Sy - d.R + Math.sqrt(d.R ** 2 - ax ** 2) : d.Sy; })() - 1.5, zMid], [x, L.yb + 0.5, d.lip + 0.65]]).filter((p) => !probe(...p)); if (miss.length) fails.push("slit not filled at " + miss.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")); }
  if (!probe(0, d.Sy - 1, (L.zBack + L.zEnd) / 2)) fails.push("finger dish not filled");
  // straight in and out: lifted 1..30 mm, only the hooks may ride on the dish walls
  let worst = 0;
  for (let up = 1; up <= 30; up += 1) {
    const x = cap.translate([0, up, 0]).intersect(shell);
    if (x.volume() < 0.05) continue;
    for (const piece of x.decompose()) { const b = piece.boundingBox(), ax = Math.min(Math.abs(b.min[0]), Math.abs(b.max[0]));
      if (piece.volume() > 0.05 && ax < 30 - 0.5) { fails.push(`blocked ${up} mm up @ ${bb(piece)}`); up = 99; break; }
      worst = Math.max(worst, Math.max(Math.abs(b.min[0]), Math.abs(b.max[0])) - 30); }
  }
  // the arms: hooks reach ~0.5 mm past the dish wall; strain of a cantilever bent that far: 1.5 t δ / L²
  const delta = 0.75 - 0.25, strain = 1.5 * 1.6 * delta / L.arm ** 2;
  if (strain > 0.025) fails.push(`arm strain ${(strain * 100).toFixed(1)}% (arm ${L.arm.toFixed(1)} mm)`);
  if (c.cap.slot === "lock") {
    const host = others.find((p) => p.n === "ring1" || p.n === "wallCase").m, I = g.insertSpec(c);
    const solidAt = (x, y, z) => host.intersect(M.cube([0.6, 0.6, 0.6], true).translate([x, y, z])).volume() > 0.2;
    const yi = L.yFloor - I.depth / 2;
    if (solidAt(0, yi, L.zs) || !solidAt(I.hole / 2 + 1.2, yi, L.zs) || !solidAt(-(I.hole / 2 + 1.2), yi, L.zs)) fails.push("insert hole / boss missing");
    if (probe(0, d.Sy - 1, L.zs) || probe(0, L.yFloor + 2, L.zs)) fails.push("screw hole missing in the cap");
  }
  if (issues.length) fails.push(issues.map((i) => i.msg).join(" | "));
  if (fails.length) bad++;
  console.log(fails.length ? "FAIL" : "ok  ", name.padEnd(30), `arm ${L.arm.toFixed(1)} mm, strain ${(strain * 100).toFixed(1)}%, hook ride ${worst.toFixed(2)} mm`, fails.join("; "));
  E.flush();
}
process.exit(bad ? 1 : 0);
