// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const w = await Module(); w.setup(); const { CrossSection } = w;
const rr = (W,H,r) => CrossSection.square([W-2*r,H-2*r],true).offset(r,'Round',2,128);
for (const [mode, ori, tab] of [['hug','landscape','ipad-a16'],['hug','portrait','ipad-a16'],['hug','landscape','ipad-mini'],['hug','landscape','ipad-pro-11'],['universal','landscape','ipad-a16']]) {
  const c = structuredClone(g.DEFAULTS); c.fitMode=mode; c.orientation=ori; c.tablet={...c.tablet,...g.TABLETS[tab],preset:tab};
  const d = g.derive(c);
  const ox = d.Sx - c.led.skin - 1.0, oy = d.Sy - c.led.skin - 1.0; // groove incl. seat step? inner edge matters
  const ix = d.Sx - c.led.skin - c.led.w, iy = d.Sy - c.led.skin - c.led.w, ri = d.led.ro - c.led.w;
  const inner = rr(2*ix, 2*iy, ri), slot = rr(d.chW, d.chH, d.rSlot);
  // min wall: largest t such that slot offset by t still inside inner
  let lo = 0, hi = 10; for (let k=0;k<30;k++){ const t=(lo+hi)/2; const o=slot.offset(t,'Round',2,128); const out=o.subtract(inner).area(); if(out>1e-3) hi=t; else lo=t; }
  // outer skin
  const outer = rr(d.Sw, d.Sh, d.R), og = rr(2*(d.Sx-c.led.skin+1.0), 2*(d.Sy-c.led.skin+1.0), Math.max(2,d.R-c.led.skin+1.0));
  let lo2=0, hi2=10; for (let k=0;k<30;k++){ const t=(lo2+hi2)/2; const o=og.offset(t,'Round',2,128); const out=o.subtract(outer).area(); if(out>1e-3) hi2=t; else lo2=t; }
  console.log(mode, ori, tab, 'R', d.R, 'rSlot', d.rSlot.toFixed(1), 'groove->slot wall', lo.toFixed(2), 'outer skin at seat', lo2.toFixed(2), 'lip', d.lip, 'glass', d.tabletZ);
}
{
const c = structuredClone(g.DEFAULTS); c.fitMode='hug'; const d=g.derive(c);
const ix = d.Sx - c.led.skin - c.led.w, iy = d.Sy - c.led.skin - c.led.w, ri = d.led.ro - c.led.w;
const ox=d.Sx-c.led.skin, oy=d.Sy-c.led.skin, ro=d.led.ro;
const groove = rr(2*ox,2*oy,ro).subtract(rr(2*ix,2*iy,ri)); const slot = rr(d.chW,d.chH,d.rSlot);
const x = groove.intersect(slot); console.log('groove∩slot area', x.area().toFixed(2), JSON.stringify(x.bounds()));
}
