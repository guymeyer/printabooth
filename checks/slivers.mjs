import Module from 'manifold-3d';
import * as g from '../app/geom.js';
const E = g.makeEngine(await Module());
for (const mode of ['hug','universal']) for (const ori of ['landscape','portrait']) {
  const c = structuredClone(g.DEFAULTS); c.fitMode=mode; c.orientation=ori;
  const parts=[...new Set(g.assembly(c).items.map(i=>i.part))].filter(p=>p!=='back');
  const rep=[];
  for (const p of parts) { const m=E.raw(p,c); const comps=m.decompose(); const v=comps.map(x=>x.volume()).sort((a,b)=>a-b); rep.push(`${p}:${comps.length}${comps.length>1?' smallest '+v[0].toFixed(3):''}`); E.flush(); }
  console.log(mode, ori, rep.join('  '));
}
