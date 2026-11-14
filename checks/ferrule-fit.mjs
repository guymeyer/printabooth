import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module()); const { Manifold } = E;
for (const [dw, sp] of [[38.1,18],[25.4,12],[44.45,25]]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode='hug'; c.legs.dowel=dw; c.legs.splay=sp;
  const d = g.derive(c), hub = E.raw('hub', c).translate([0,0,d.fd]);
  const legs = g.legGeometry(c, E.sockets(c));
  let vol = 0, gaps = [];
  for (const lg of legs) {
    const v = lg.v, ry = Math.atan2(v[0], v[2]) * 180 / Math.PI, rx = Math.asin(-v[1]) * 180 / Math.PI;
    const f = E.raw('ferrule', c).rotate([rx,0,0]).rotate([0,ry,0]).translate(lg.ferruleAt);
    vol += hub.intersect(f).volume(); gaps.push(hub.minGap(f, 3).toFixed(2));
  }
  console.log(dw, sp, 'ferrule∩hub', vol.toFixed(2), 'gaps', gaps.join(','));
  E.flush();
}
