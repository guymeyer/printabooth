// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module());
for (const [dw, sp] of [[25.4,12],[25.4,18],[31.75,18],[38.1,12],[38.1,18],[38.1,25],[44.45,18],[44.45,25]]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode='hug'; c.legs.dowel=dw; c.legs.splay=sp;
  const { drum, socks, holes } = E.puckDebug(c);
  const big = E.Manifold.cube([1000,1000,1000], true).translate([0, drum.boundingBox().min[1]+500+0, 0]);
  const outside = E.Manifold.cube([1000,1000,1000], true).subtract(drum);
  const r = [];
  for (let i = 0; i < 3; i++) for (let j = i+1; j < 3; j++) r.push(socks[i].minGap(socks[j], 10));
  const sockSock = Math.min(...r);
  // wall to outside: trim the socket envelopes to inside the drum height (they run out the bottom on purpose)
  const bb = drum.boundingBox();
  const inDrum = (m) => m.intersect(E.Manifold.cube([1000, bb.max[1]-bb.min[1]-0.01, 1000], true).translate([0,(bb.max[1]+bb.min[1])/2,0]));
  const sockOut = Math.min(...socks.map(s => {
    // gap from each socket to the drum's side wall and top (ignore the open bottom face)
    const Hh = bb.max[1]-bb.min[1]-1; const side = E.Manifold.cylinder(Hh, 300, 300, 64).rotate([-90,0,0]).translate([0, bb.min[1]+1, (bb.min[2]+bb.max[2])/2]).subtract(E.Manifold.cylinder(Hh+2, (bb.max[0]-bb.min[0])/2, (bb.max[0]-bb.min[0])/2, 128).rotate([-90,0,0]).translate([0, bb.min[1], (bb.min[2]+bb.max[2])/2]));
    const topSlab = E.Manifold.cube([1000, 50, 1000], true).translate([0, bb.max[1]+25, 0]);
    return Math.min(s.minGap(side, 20), s.minGap(topSlab, 20));
  }));
  const holeGap = Math.min(...holes.flatMap(h => socks.map(s => s.minGap(h, 20))));
  console.log(`dowel ${dw} splay ${sp}: drum ${2*g.derive(c).puck.R}x${g.derive(c).puck.H}  socket-socket ${sockSock.toFixed(2)}  socket-skin ${sockOut.toFixed(2)}  socket-hole ${holeGap.toFixed(2)}`);
  E.flush();
}
