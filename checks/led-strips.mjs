// Every LED strip preset: the channel it sizes validates clean, the frame/diffuser/ring 1 build as single bodies (the
// diffuser too: one unbroken U) with no overlaps, the strip's sideways bend at the corners stays within what it allows, and
// the feed slot at the top of the feed side runs clear from the channel into the box. Landscape and portrait, hugged.
import Module from "manifold-3d";
import * as g from "../app/geom.js";
const E = g.makeEngine(await Module());
let bad = 0;
for (const key of Object.keys(g.LED_STRIPS).filter((k) => k !== "custom"))
  for (const orient of ["landscape", "portrait"]) {
    const c = structuredClone(g.DEFAULTS); c.fitMode = "hug"; c.orientation = orient; c.led.strip = key;
    Object.assign(c.led, g.ledFit(c, key));
    const d = g.derive(c), S = g.LED_STRIPS[key], issues = g.validate(c).filter((i) => i.level !== "info");
    const parts = g.assembly(c).items.filter((i) => ["frame", "diffuser", "ring1", "cassette"].includes(i.part)).map((i) => ({ n: i.part, m: E.raw(i.part, c).translate(i.pos) }));
    const bodies = parts.map((p) => { const dec = p.m.decompose(), n = dec.length; dec.forEach((x) => x.delete()); return `${p.n}:${n}`; });
    const ov = [];
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const v = parts[i].m.intersect(parts[j].m).volume(); if (v > 1) ov.push(`${parts[i].n}x${parts[j].n}`); }
    // feed slot: a 2 mm probe from the channel floor back past the frame into the box must hit no material
    const r = g.feedRoom(d), x = Math.sign(d.led.feedX) * (r.lo + r.hi) / 2, y = d.led.yEnd - 7;
    const solid = parts.filter((p) => p.n !== "cassette" && p.n !== "diffuser").map((p) => p.m);
    const bx = E.Manifold.cube([1, 2, d.fd + 4 - d.ledDepth], false).translate([x - 0.5, y - 1, d.ledDepth + 0.2]);
    const blocked = solid.reduce((v, m) => v + m.intersect(bx).volume(), 0);
    const ok = !issues.length && !ov.length && bodies.every((b) => /:1$/.test(b)) && d.led.lc >= S.minR && d.ledW >= S.w + 0.4 && blocked < 0.01;
    if (!ok) bad++;
    console.log(ok ? "ok  " : "FAIL", key.padEnd(9), orient.padEnd(9), `channel ${d.ledW.toFixed(2)} x ${d.ledDepth.toFixed(1)}`, `fd ${d.fd.toFixed(1)}`, `corner ${d.led.lc.toFixed(1)}`, `1 x ${d.led.leds} LEDs (${d.led.cutLen.toFixed(0)} mm, ${d.led.reel} m reel)`, `feed ${blocked < 0.01 ? "clear" : "BLOCKED " + blocked.toFixed(2)}`, bodies.join(" "), issues.map((i) => i.msg.slice(0, 50)), ov);
    E.flush();
  }
process.exit(bad ? 1 : 0);
