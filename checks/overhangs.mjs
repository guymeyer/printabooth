import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module());
const which = process.argv[2] || 'hug', part = process.argv[3] || 'frame', useOld = process.argv[4] === 'old';
const G = g;
const E2 = useOld ? G.makeEngine(await Module()) : E;
const c = structuredClone(G.DEFAULTS); c.fitMode = which; if (process.env.W) c.led.w = +process.env.W;
const r = E2.exportSTL(part, c), dv = new DataView(r.buf), n = dv.getUint32(80, true);
const groups = {};
for (let i = 0; i < n; i++) {
  const o = 84 + i * 50, nz = dv.getFloat32(o + 8, true);
  const P = [0,1,2].map(k=>[0,1,2].map(j=>dv.getFloat32(o+12+k*12+j*4,true)));
  const zmin = Math.min(...P.map(p=>p[2])); if (!(nz < -0.71 && zmin > 0.3)) continue;
  const key = zmin.toFixed(1);
  const u=[0,1,2].map(j=>P[1][j]-P[0][j]), w=[0,1,2].map(j=>P[2][j]-P[0][j]);
  const area = Math.hypot(u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0])/2;
  const gr = groups[key] ||= { area: 0, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  gr.area += area; for (const p of P) { gr.x0 = Math.min(gr.x0, p[0]); gr.x1 = Math.max(gr.x1, p[0]); gr.y0 = Math.min(gr.y0, p[1]); gr.y1 = Math.max(gr.y1, p[1]); }
}
for (const [z, gr] of Object.entries(groups).sort((a,b)=>b[1].area-a[1].area).slice(0,8)) console.log('z', z, 'area', gr.area.toFixed(0), 'x', gr.x0.toFixed(0), gr.x1.toFixed(0), 'y', gr.y0.toFixed(0), gr.y1.toFixed(0));
