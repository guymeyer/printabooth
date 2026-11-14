import Module from 'manifold-3d';
const g = await import(process.env.GEOM || '../app/geom.js');
const wasm = await Module(); const E = g.makeEngine(wasm); const { CrossSection } = E;
const BED = { 'Core One': [250, 220, 270], XL: [360, 360, 360] };
const cfgName = process.argv[2] || 'hugL';
const c = structuredClone(g.DEFAULTS);
const presets = {
  uniFront: () => { c.fitMode = 'universal'; },
  hugL: () => { c.fitMode = 'hug'; },
  hugP0: () => { c.fitMode = 'hug'; c.orientation = 'portrait'; c.shell.nExt = 0; },
  uni: () => { c.fitMode = 'universal'; },
  mini: () => { c.fitMode = 'hug'; c.tablet = { ...c.tablet, ...g.TABLETS['ipad-mini'], preset: 'ipad-mini' }; },
  pro: () => { c.fitMode = 'hug'; c.tablet = { ...c.tablet, ...g.TABLETS['ipad-pro-11'], preset: 'ipad-pro-11' }; },
  ledoff: () => { c.fitMode = 'hug'; c.led.on = false; },
};
presets[cfgName]();
const only = process.argv[3] ? process.argv[3].split(',') : null;
const parts = [...new Set([...g.assembly(c).items.map(i => i.part), 'ferrule'])].filter(p => !only || only.includes(p));
const W = [0.9, 1.2];   // thinnest printable wall ~2 lines at 0.45; flag <1.2 as weak, <0.9 as unprintable
function opening(cs, w) { const a = cs.offset(-w / 2, 'Round', 2, 24); const b = a.offset(w / 2, 'Round', 2, 24); a.delete(); return b; }
function thinScan(m, axis, step) {
  // axis: 'z' slice horizontal (wall thickness in plane), 'x'/'y' slices vertical (skin thickness incl. floors)
  let mm = m;
  if (axis === 'x') mm = m.rotate([0, -90, 0]); if (axis === 'y') mm = m.rotate([90, 0, 0]);
  const bb = mm.boundingBox(); const out = [];
  for (let z = bb.min[2] + 0.31; z < bb.max[2] - 0.2; z += step) {
    const cs = mm.slice(z), A = cs.area(); if (A < 0.01) { cs.delete(); continue; }
    for (const w of W) {
      const op = opening(cs, w), lost = cs.subtract(op);
      const comps = lost.decompose(); 
      for (const cp of comps) { const a = cp.area(); if (a > (w === 0.9 ? 1.0 : 3.0)) { const b = cp.bounds(); out.push({ w, axis, z: +z.toFixed(1), a: +a.toFixed(1), b: [b.min.map(v=>+v.toFixed(0)), b.max.map(v=>+v.toFixed(0))] }); } cp.delete(); }
      op.delete(); lost.delete();
    }
    cs.delete();
  }
  return out;
}
function overhangs(m) {
  const mesh = m.getMesh(), P = mesh.vertProperties, N = mesh.numProp, tri = mesh.triVerts, groups = {};
  let total = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const v = [0, 1, 2].map(k => [P[tri[t + k] * N], P[tri[t + k] * N + 1], P[tri[t + k] * N + 2]]);
    const u = [0, 1, 2].map(j => v[1][j] - v[0][j]), w = [0, 1, 2].map(j => v[2][j] - v[0][j]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], L = Math.hypot(...n); if (!L) continue;
    const nz = n[2] / L, zmin = Math.min(v[0][2], v[1][2], v[2][2]);
    if (nz < -0.72 && zmin > 0.3) {   // steeper than ~44deg from vertical, not on the bed
      const area = L / 2; total += area;
      const key = `${nz < -0.98 ? 'flat' : 'slope'}@${zmin.toFixed(0)}`;
      const gr = groups[key] ||= { area: 0, lo: [1e9, 1e9], hi: [-1e9, -1e9] }; gr.area += area;
      for (const p of v) { gr.lo[0] = Math.min(gr.lo[0], p[0]); gr.lo[1] = Math.min(gr.lo[1], p[1]); gr.hi[0] = Math.max(gr.hi[0], p[0]); gr.hi[1] = Math.max(gr.hi[1], p[1]); }
    }
  }
  return { total, top: Object.entries(groups).sort((a, b) => b[1].area - a[1].area).slice(0, 12).map(([k, gr]) => `${k} ${gr.area.toFixed(0)}mm2 x[${gr.lo[0].toFixed(0)},${gr.hi[0].toFixed(0)}] y[${gr.lo[1].toFixed(0)},${gr.hi[1].toFixed(0)}]`) };
}
console.log('CONFIG', cfgName, JSON.stringify(g.validate(c).map(i => i.msg)));
for (const p of parts) {
  const t0 = Date.now();
  const m = E.printed(p, c), bb = m.boundingBox(), size = [0, 1, 2].map(i => +(bb.max[i] - bb.min[i]).toFixed(1));
  const pr = (g.PART_INFO[p] || {}).printer || '?', bed = BED[pr];
  const fits = bed && ((size[0] <= bed[0] && size[1] <= bed[1]) || (size[1] <= bed[0] && size[0] <= bed[1])) && size[2] <= bed[2];
  const first = m.slice(0.1).area(), vol = m.volume();
  console.log(`\n== ${p} [${pr}] size ${size.join('x')} ${fits ? 'fits' : '!! DOES NOT FIT'} vol ${(vol / 1000).toFixed(0)}cm3 first-layer ${first.toFixed(0)}mm2 genus ${m.genus()}`);
  const oh = overhangs(m); console.log(` overhang >45deg: ${oh.total.toFixed(0)} mm2`); for (const s of oh.top) console.log('   ', s);
  const step = Math.max(0.6, size[2] / 160);
  const thin = [...thinScan(m, 'z', step), ...thinScan(m, 'x', 3), ...thinScan(m, 'y', 3)];
  const agg = {};
  for (const t of thin) { const k = `${t.axis} w<${t.w}`; (agg[k] ||= []).push(t); }
  for (const [k, list] of Object.entries(agg)) {
    list.sort((a, b) => b.a - a.a);
    console.log(`  thin ${k}: ${list.length} hits; worst:`, list.slice(0, 4).map(t => `@${t.z} ${t.a}mm2 ${JSON.stringify(t.b)}`).join(' | '));
  }
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  E.flush();
}
