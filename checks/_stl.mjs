import Module from "manifold-3d"; import * as g from "../app/geom.js"; import fs from "fs";
const E = g.makeEngine(await Module());
const [,, part, fit = "universal", orient = "landscape", out] = process.argv;
const c = structuredClone(g.DEFAULTS); c.fitMode = fit; c.orientation = orient; if (orient === "portrait") { c.camSide = "right"; }
const m = E.printed(part, c), mesh = m.getMesh(), P = mesh.vertProperties, n = mesh.numProp, T = mesh.triVerts;
const buf = Buffer.alloc(84 + 50 * (T.length / 3)); buf.writeUInt32LE(T.length / 3, 80);
for (let t = 0, o = 84; t < T.length; t += 3, o += 50) for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) buf.writeFloatLE(P[T[t + k] * n + a], o + 12 + k * 12 + a * 4);
fs.writeFileSync(out, buf); console.log(out, T.length / 3, "tris");
