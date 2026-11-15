// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// The no-cassette fit (fitMode "direct"): the iPad sits in the slot itself. For a spread of booths, with the parts placed as
// assembled: the iPad (with its rear camera bump) touches no part and no parts overlap, it slides out of the top without hitting anything but the
// top key, the top key fills the slot above it, every part is one body, and there are no setting errors.
//   node checks/direct.mjs
import Module from "manifold-3d";
import * as g from "../app/geom.js";
const E = g.makeEngine(await Module()), M = E.Manifold;
let bad = 0;
const cases = [
  ["A16 landscape", {}],
  ["A16 portrait + dock", { orientation: "portrait", camSide: "right", dock: { on: true } }],
  ["A16 portrait, Anker dock", { orientation: "portrait", camSide: "right", dock: { on: true, brand: "anker" } }],
  ["A16 landscape, LED off", { led: { on: false } }],
  ["A16 portrait, wall", { orientation: "portrait", camSide: "left", mount: { type: "wall" } }],
  ["iPad mini portrait + dock", { preset: "ipad-mini", orientation: "portrait", camSide: "right", dock: { on: true } }],
  ["iPad Pro 11 landscape, post", { preset: "ipad-pro-11", mount: { type: "post" } }],
];
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] || {}, v) : v; return a; };
for (const [name, o] of cases) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = "direct";
  const { preset, ...rest } = o; merge(c, rest);
  if (preset) { if (!g.TABLETS[preset]) { console.log("skip", name, "(no preset", preset + ")"); continue; } const { label, ...t } = g.TABLETS[preset]; Object.assign(c.tablet, t, { preset }); }
  const d = g.derive(c), tb = c.tablet, issues = g.validate(c).filter((i) => i.level === "error");
  const items = g.assembly(c).items.filter((i) => ["frame", "ring1", "wallCase", "topKey", "dockClip"].includes(i.part));
  const parts = items.map((i) => ({ n: i.part, m: g.place(E.raw(i.part, c), i) }));
  // the iPad as mounted, with the rear camera bump(s) the booth allows for (1.2 mm proud)
  const cx = d.ipadOff[0], cy = d.ipadOff[1] - d.chanClr, iw = d.iw, ih = d.ih, z0 = d.tabletZ;
  // the iPad's rounded outline as a prism, its body, and a rear camera bump 6 mm in from its corner, 1.2 mm proud
  const prism = (za, h) => M.hull([-1, 1].flatMap((sx) => [-1, 1].map((sy) => M.cylinder(h, tb.r, tb.r, 64).translate([cx + sx * (iw / 2 - tb.r), cy + sy * (ih / 2 - tb.r), za]))));
  const trimmed = prism(z0, tb.t);
  const K = Math.min(14, tb.bump || 0), [rx, ry] = d.rearCorner;
  const bump = M.cube([K, K, 1.2], true).translate([cx + rx * (iw / 2 - 6 - K / 2), cy + ry * (ih / 2 - 6 - K / 2), z0 + tb.t + 0.6]).intersect(prism(z0 - 5, tb.t + 10));
  const ipad = trimmed.add(bump);
  // swept up out of the top: the body and the bump each sweep on their own (a hull of both would smear the bump across the back)
  const up = (m) => M.hull([m, m.translate([0, 2 * d.Sh, 0])]);
  const sweep = up(trimmed).add(up(bump));
  const hits = [], path = [];
  for (const p of parts) {
    const v = p.m.intersect(ipad).volume(); if (v > 0.5) hits.push(`${p.n} ${v.toFixed(1)}`);
    if (p.n !== "topKey") { const x = p.m.intersect(sweep), w = x.volume(); if (w > 0.5) { const b = x.boundingBox(); path.push(`${p.n} ${w.toFixed(1)} @ x${b.min[0].toFixed(0)}..${b.max[0].toFixed(0)} y${b.min[1].toFixed(0)}..${b.max[1].toFixed(0)} z${b.min[2].toFixed(1)}..${b.max[2].toFixed(1)}`); } }
  }
  // parts don't run into each other (the top key and the dock clip against the frame and ring 1)
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const v = parts[i].m.intersect(parts[j].m).volume(); if (v > 0.5) hits.push(`${parts[i].n}/${parts[j].n} ${v.toFixed(1)}`);
  }
  const key = parts.find((p) => p.n === "topKey");
  const keyFills = key && key.m.volume() > 0 && key.m.boundingBox().max[1] >= d.Sy - 0.5;
  const bodies = parts.map((p) => { const dec = p.m.decompose(), n = p.m.volume() > 1 ? dec.length : 0;
    const small = dec.length > 1 ? " [" + dec.map((x) => { const b = x.boundingBox(); return `${x.volume().toFixed(0)}mm3 x${b.min[0].toFixed(0)}..${b.max[0].toFixed(0)} y${b.min[1].toFixed(0)}..${b.max[1].toFixed(0)} z${b.min[2].toFixed(1)}..${b.max[2].toFixed(1)}`; }).sort().slice(0, 1).join() + "]" : "";
    dec.forEach((x) => x.delete()); return `${p.n}:${n}${small}`; });
  const ok = !issues.length && !hits.length && !path.length && keyFills && bodies.every((b) => /:1$/.test(b));
  if (!ok) bad++;
  console.log(ok ? "ok  " : "FAIL", name.padEnd(28), `face ${d.Sw.toFixed(0)}x${d.Sh.toFixed(0)} depth-to-stop ${d.chZ1.toFixed(1)}`, hits.length ? "HITS " + hits.join(", ") : "iPad and parts clear",
    path.length ? "PATH BLOCKED " + path.join(", ") : "slides out", keyFills ? "key fills the top" : "KEY MISSING", bodies.join(" "), issues.map((i) => i.msg).join(" | "));
  E.flush();
}
process.exit(bad ? 1 : 0);
