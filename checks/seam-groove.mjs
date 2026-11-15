// Checks that the frame and rings carry the seam V-groove on the edge that prints at the back of the bed.   node checks/seam-groove.mjs
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module()); const { CrossSection } = E;
for (const [ori] of [['landscape'], ['portrait']]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode = 'hug'; c.orientation = ori;
  const d = g.derive(c);
  for (const p of ['frame', 'ring1', 'ringExt']) {
    const m = E.printed(p, c), bb = m.boundingBox(), z = (bb.min[2] + bb.max[2]) / 2;
    const cs = m.slice(z), yMax = bb.max[1];
    // probe the rear edge: is there a notch 0.4 deep at the expected x (mirrored by the 180-degree turn)?
    const probe = (x) => cs.intersect(CrossSection.square([0.1, 2]).translate([x - 0.05, yMax - 2])).area();
    const xg = -d.seamX;
    const ok = probe(xg) < 0.17 && probe(xg + 3) > 0.199; if (!ok) process.exitCode = 1;
    console.log(ok ? 'ok ' : 'BAD', ori, p, 'seamX', d.seamX, 'rear-edge fill at groove', probe(xg).toFixed(3), 'beside', probe(xg + 3).toFixed(3), '(full = 0.200)');
    E.flush();
  }
}
