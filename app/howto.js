// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Picture instructions in the visual language of docs/instructions-style.md: black line art on white, one stroke weight,
// one action per frame, a small shared symbol set, and an original character ("Pip": round head with a sprout, capsule
// body, mitten hands) who demonstrates each step. Amber is the only accent and is never needed to read a frame.
// Everything is plain SVG so the booklet travels inside the zip as one self-contained HTML file.

const K = "#111", W = "#fff", ACC = "#e39a2b", SW = 2.4, DASH = "5 4";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n1 = (v) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------- primitives (viewBox 0 0 320 240)
const st = (o) => `stroke="${o.stroke || K}" stroke-width="${o.w || SW}" stroke-linejoin="round" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${o.dash === true ? DASH : o.dash}"` : ""}`;
const P = (d, o = {}) => `<path d="${d}" fill="${o.fill || W}" ${st(o)}/>`;
const L = (x1, y1, x2, y2, o = {}) => `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" ${st(o)}/>`;
const C = (x, y, r, o = {}) => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${o.fill || W}" ${o.w === 0 ? "" : st(o)}/>`;
const E = (x, y, rx, ry, o = {}) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${o.fill || W}" ${st(o)}/>`;
const T = (x, y, s, o = {}) => `<text x="${n1(x)}" y="${n1(y)}" font-size="${o.size || 15}" font-weight="${o.weight || 700}" text-anchor="${o.anchor || "middle"}" font-family="Helvetica, Arial, sans-serif" fill="${K}">${esc(s)}</text>`;
const rr = (x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); return `M${n1(x + r)} ${n1(y)}h${n1(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${n1(h - 2 * r)}a${r} ${r} 0 0 1 -${r} ${r}h-${n1(w - 2 * r)}a${r} ${r} 0 0 1 -${r} -${r}v-${n1(h - 2 * r)}a${r} ${r} 0 0 1 ${r} -${r}z`; };
const G = (s, tf) => `<g transform="${tf}">${s}</g>`;

// Isometric, after the isometric-design reference: a parallel projection with the axes 120 degrees apart, the same in every
// frame; text stays flat to the page. 3D here: x right, y down, z into the page (depth). The view is from above, right and in
// front, so the front, top and right faces show. (Its hard drop shadows and colour palette are left out: the style guide wins.)
const CX = Math.sqrt(3) / 2, SX = 0.5;
const iso = (o, x, y, z) => [o[0] + CX * (x + z), o[1] + SX * (x - z) + y];
// keep one stroke weight through skews and scales
const nss = (s) => s.replace(/<(path|line|circle|ellipse|polyline) (?!vector-effect)/g, '<$1 vector-effect="non-scaling-stroke" ');
// flat 2D artwork laid onto a plane of the model
const onFront = (o, z, s) => { const [e, f] = iso(o, 0, 0, z); return `<g transform="matrix(${n1(CX * 1000) / 1000} ${SX} 0 1 ${n1(e)} ${n1(f)})">${nss(s)}</g>`; };          // 2D (x, y)
const onTop = (o, y, s) => { const [e, f] = iso(o, 0, y, 0); return `<g transform="matrix(${n1(CX * 1000) / 1000} ${SX} ${n1(CX * 1000) / 1000} ${-SX} ${n1(e)} ${n1(f)})">${nss(s)}</g>`; };   // 2D (x, z)
// a box w x h, d deep, rounded front corners r, front top-left corner at screen point o. dash: previous or future position
function box(o, w, h, d, r, opt = {}) {
  const dash = opt.dash, fill = dash ? "none" : W, k = Math.min(r, w / 2, h / 2) * (1 - Math.SQRT1_2);
  const a = iso(o, k, k, 0), b = iso(o, k, k, d), c = iso(o, w - k, h - k, d), e = iso(o, w - k, h - k, 0);
  return nss(onFront(o, d, P(rr(0, 0, w, h, r), { dash, fill })) +
    (dash ? "" : `<path d="M${a.map(n1).join(" ")}L${b.map(n1).join(" ")}L${c.map(n1).join(" ")}L${e.map(n1).join(" ")}z" fill="${W}"/>`) +
    L(a[0], a[1], b[0], b[1], { dash }) + L(e[0], e[1], c[0], c[1], { dash }) + onFront(o, 0, P(rr(0, 0, w, h, r), { dash, fill }) + (opt.face || "")));
}
// upright cylinder: p = screen centre of its top, radius r, height h; top = 2D art on the top face (coords about the centre)
function cyl(p, r, h, opt = {}) {
  const rx = r * 1.2247, ry = r * 0.7071, s = { dash: opt.dash, fill: opt.dash ? "none" : W };
  return nss(P(`M${n1(p[0] - rx)} ${n1(p[1])}v${h}a${n1(rx)} ${n1(ry)} 0 0 0 ${n1(2 * rx)} 0v-${h}`, s) + E(p[0], p[1], rx, ry, s) + (opt.top ? onTop(p, 0, opt.top) : ""));
}

// ---------------------------------------------------------------- symbols (one weight, one family)
const arrow = (x1, y1, x2, y2, bend = 0, o = {}) => {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend, a = Math.atan2(y2 - my, x2 - mx), h = 9;
  const bx = x2 - (h - 2) * Math.cos(a), by = y2 - (h - 2) * Math.sin(a);
  return `<path d="M${n1(x1)} ${n1(y1)}Q${n1(mx)} ${n1(my)} ${n1(bx)} ${n1(by)}" fill="none" ${st({ w: 2.6, dash: o.dash })}/>` +
    P(`M${n1(x2)} ${n1(y2)}L${n1(x2 - h * Math.cos(a - 0.42))} ${n1(y2 - h * Math.sin(a - 0.42))}L${n1(x2 - h * Math.cos(a + 0.42))} ${n1(y2 - h * Math.sin(a + 0.42))}z`, { fill: K, w: 1.4 });
};
// curved arrow: turning (screw in, tighten); dir 1 = clockwise as seen
const turn = (cx, cy, r, dir = 1) => {
  const a0 = dir > 0 ? -2.4 : -0.7, a1 = dir > 0 ? -0.7 : -2.4, pt = (a) => [cx + r * Math.cos(a), cy + r * 0.45 * Math.sin(a)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1), [x2, y2] = pt(a1 + dir * 0.35);
  return `<path d="M${n1(x0)} ${n1(y0)}A${r} ${n1(r * 0.45)} 0 0 ${dir > 0 ? 1 : 0} ${n1(x1)} ${n1(y1)}" fill="none" ${st({ w: 2.6 })}/>` + arrow(x1, y1, x2, y2);
};
const check = (x, y, s = 1) => P(`M${x - 9 * s} ${y}l${6 * s} ${7 * s}l${13 * s} -${15 * s}`, { fill: "none", w: 3.2 });
const cross = (x, y, s = 1) => L(x - 8 * s, y - 8 * s, x + 8 * s, y + 8 * s, { w: 3.2 }) + L(x + 8 * s, y - 8 * s, x - 8 * s, y + 8 * s, { w: 3.2 });
const bigCross = (x0, y0, x1, y1) => L(x0, y0, x1, y1, { w: 4 }) + L(x1, y0, x0, y1, { w: 4 });
const excl = (x, y) => L(x, y - 16, x, y - 4, { w: 3.2 }) + C(x, y + 2, 1.9, { fill: K, w: 0 });
const quest = (x, y) => P(`M${x - 6} ${y - 11}a6 6 0 1 1 7 6c-1 0.4 -1 1.4 -1 3`, { fill: "none", w: 3 }) + C(x, y + 4, 1.8, { fill: K, w: 0 });
const rays = (x, y, s = 1) => L(x - 10 * s, y - 6 * s, x - 15 * s, y - 13 * s) + L(x, y - 9 * s, x, y - 17 * s) + L(x + 10 * s, y - 6 * s, x + 15 * s, y - 13 * s);
const count = (x, y, n) => T(x, y, `${n}×`, { size: 17 });
const tag = (x, y, s) => { const w = String(s).length * 7.6 + 14; return P(rr(x - w / 2, y - 12, w, 22, 11), { w: 1.8 }) + T(x, y + 4.5, s, { size: 12.5 }); };
// a dimension: |<-- label -->|
const dim = (x1, y1, x2, y2, label) => {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * 5, ny = Math.cos(a) * 5;
  return L(x1 - nx, y1 - ny, x1 + nx, y1 + ny, { w: 1.6 }) + L(x2 - nx, y2 - ny, x2 + nx, y2 + ny, { w: 1.6 }) + arrow((x1 + x2) / 2, (y1 + y2) / 2, x1, y1) + arrow((x1 + x2) / 2, (y1 + y2) / 2, x2, y2) +
    tag((x1 + x2) / 2 - ny * 3, (y1 + y2) / 2 + nx * 3, label);
};
// magnified circle: a small ring on the object, a line to a big circle holding the detail (drawn centred on 0,0)
let clipN = 0;
const magnify = (sx, sy, cx, cy, r, detail) => {
  const id = `mg${++clipN}`, a = Math.atan2(cy - sy, cx - sx);
  return C(sx, sy, 8, { fill: "none", w: 1.8 }) + L(sx + 8 * Math.cos(a), sy + 8 * Math.sin(a), cx - r * Math.cos(a), cy - r * Math.sin(a), { w: 1.8 }) +
    `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r - 1}"/></clipPath>` + C(cx, cy, r) + `<g clip-path="url(#${id})">${G(detail, `translate(${cx} ${cy})`)}</g>` + C(cx, cy, r, { fill: "none" });
};

// ---------------------------------------------------------------- Pip, the booth buddy (original character)
// feet at (x, y), about 104 tall at s = 1. face 1 looks right, -1 looks left.
// pose: rest | point | up | chin | hold | reach | stop | push (hands in local coords, face right)
const POSES = {
  rest: { b: [[-18, -60], [-24, -44], [-22, -30]], f: [[18, -60], [24, -44], [22, -30]] },
  point: { b: [[-18, -60], [-24, -44], [-22, -30]], f: [[18, -60], [36, -62], [52, -66]] },
  up: { b: [[-18, -62], [-28, -80], [-32, -98]], f: [[18, -62], [28, -80], [32, -98]] },
  chin: { b: [[-18, -60], [-24, -44], [-22, -30]], f: [[16, -58], [20, -70], [8, -76]], front: true },
  hold: { b: [[-18, -60], [-4, -46], [22, -48]], f: [[18, -60], [32, -52], [40, -50]], front: true },
  reach: { b: [[-18, -60], [-24, -44], [-22, -30]], f: [[18, -62], [34, -76], [44, -90]] },
  stop: { b: [[-18, -60], [-24, -44], [-22, -30]], f: [[18, -62], [32, -74], [34, -92]] },
  push: { b: [[-18, -60], [-24, -44], [-22, -30]], f: [[18, -60], [34, -58], [48, -56]] },
};
function pip(x, y, o = {}) {
  const s = o.s || 1, face = o.face || 1, pose = POSES[o.pose || "rest"], mood = o.mood || "smile";
  const torso = rr(-17, -72, 34, 46, 14), legL = rr(-14, -34, 11, 34, 5), legR = rr(3, -34, 11, 34, 5);
  const footL = rr(-17 + (face > 0 ? 2 : 0), -6, 15, 7, 3.5), footR = rr(2 + (face > 0 ? 2 : 0), -6, 15, 7, 3.5);
  const arm = (pts) => pts.map((p) => p.join(" ")).join(" ");
  const silhouette = (pts, hand) => [`<polyline points="${arm(pts)}" fill="none" stroke="${K}" stroke-width="${10 + 2 * SW}" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<polyline points="${arm(pts)}" fill="none" stroke="${W}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>`, hand];
  const handAt = (p, layer) => `<circle cx="${p[0]}" cy="${p[1]}" r="${layer ? 6 : 6 + SW}" fill="${layer ? W : K}"/>`;
  const body = [torso, legL, legR, footL, footR];
  const back = pose.b, fr = pose.f;
  // one silhouette: everything outlined black first, then filled white, so only the outer outline shows
  let g = body.map((d) => `<path d="${d}" fill="${K}" stroke="${K}" stroke-width="${2 * SW}"/>`).join("") + `<circle cx="0" cy="-88" r="${16 + SW}" fill="${K}"/>`;
  g += silhouette(back)[0] + handAt(back[2], 0);
  if (!pose.front) g += silhouette(fr)[0] + handAt(fr[2], 0);
  g += body.map((d) => `<path d="${d}" fill="${W}"/>`).join("") + `<circle cx="0" cy="-88" r="16" fill="${W}"/>`;
  g += silhouette(back)[1] + handAt(back[2], 1);
  if (!pose.front) g += silhouette(fr)[1] + handAt(fr[2], 1);
  if (o.holding) g += o.holding;
  if (pose.front) g += silhouette(fr)[0] + handAt(fr[2], 0) + silhouette(fr)[1] + handAt(fr[2], 1);
  // face: two dots looking the way it faces, a sprout on top
  g += C(1, -91, 1.9, { fill: K, w: 0 }) + C(9, -91, 1.9, { fill: K, w: 0 }) + P("M-1 -104q1 -9 9 -10", { fill: "none", w: 2.2 }) + P("M8 -114q-4 6 -2 9", { fill: "none", w: 2.2 });
  if (mood === "smile") g += P("M0 -82q5 5 10 0", { fill: "none", w: 2 });
  if (mood === "flat") g += L(1, -81, 9, -81, { w: 2 });
  if (mood === "o") g += C(5, -81, 2.6, { w: 1.8 });
  return G(G(g, `scale(${face * s} ${s})`), `translate(${n1(x)} ${n1(y)})`);
}

// ---------------------------------------------------------------- objects (same proportions in every frame)
// booth head: front top-left corner at screen point o; layers front to back { d, gap, dash, kind: frame|ring|plate }
const HR = 14;
const ledU = (w, h, inset = 6, top = 0.3) => `M${inset} ${n1(h * top)}V${n1(h - inset - 8)}a8 8 0 0 0 8 8H${n1(w - inset - 8)}a8 8 0 0 0 8 -8V${n1(h * top)}`;
function head(o, sz, layers, opt = {}) {
  const { w, h } = sz; let z = 0; const out = [];
  layers.forEach((l) => { z += l.gap || 0; out.push({ ...l, z }); z += l.d; });
  let s = "";
  for (const l of out.slice().reverse()) {
    const oz = iso(o, 0, 0, l.z);
    let face = "";
    if (l.kind === "frame") {
      face += P(rr(12, 12, w - 24, h - 27, 5), { dash: l.dash, fill: l.dash ? "none" : W });
      if (opt.screen) face += P(rr(16, 16, w - 32, h - 35, 3), { w: 1.6 });
      if (opt.led) face += `<path d="${ledU(w, h)}" fill="none" stroke="${ACC}" stroke-width="4" stroke-linecap="round"/>`;
      if (opt.ledPath) face += opt.ledPath;
    }
    s += box(oz, w, h, l.d, HR, { dash: l.dash, face });
    if (l.kind === "frame" && opt.slot !== false) s += onTop(oz, 0, P(rr(14, 1.5, w - 28, 4, 2), { w: 1.8, dash: l.dash }));
  }
  return s;
}
const headSize = (info) => (info.orient === "portrait" ? { w: 80, h: 112 } : { w: 120, h: 86 });
const frameL = (o = {}) => ({ d: 6, kind: "frame", ...o });
const ring1L = (o = {}) => ({ d: 22, kind: "ring", ...o });
const ringL = (o = {}) => ({ d: 13, kind: "ring", ...o });
const backL = (o = {}) => ({ d: 3, kind: "plate", ...o });
const depthOf = (layers) => layers.reduce((a, l) => a + (l.gap || 0) + l.d, 0);
// the origin that centres a box (w, h, depth D) on screen point (cx, cy)
const centred = (w, h, D, cx, cy) => [cx - CX * (w + D) / 2, cy - (h + SX * w - SX * D) / 2];
// cassette with the iPad (front plane), its front top-left corner at o
const cassette = (o, w, h, opt = {}) => box(o, w, h, 4, 9, { dash: opt.dash, face: opt.dash ? "" : P(rr(6, 7, w - 12, h - 14, 4), { w: 1.6 }) });
const tablet = (o, w, h, opt = {}) => onFront(o, 0, P(rr(0, 0, w, h, 7), { dash: opt.dash, fill: opt.dash ? "none" : W }) + P(rr(5, 5, w - 10, h - 10, 3), { w: 1.4, dash: opt.dash, fill: "none" }));
const leg = (x1, y1, x2, y2) => L(x1, y1, x2, y2, { w: 11 + 2 * SW }) + L(x1, y1, x2, y2, { w: 11, stroke: W });
const board = (o, w, t, d) => box(o, w, t, d, 2);
const poleV = (cx, y0, y1, r = 7) => `<rect x="${n1(cx - r)}" y="${n1(y0)}" width="${2 * r}" height="${n1(y1 - y0)}" fill="${W}" ${st({})}/>`;
// along the depth axis (screen direction of +z), for arrows that push parts together
const dz = (p, z) => [p[0] + CX * z, p[1] - SX * z];

// tools and hardware: plain silhouettes in the same line
const glue = (x, y) => P(rr(x - 8, y - 18, 16, 30, 4)) + P(`M${x - 5} ${y - 18}l5 -12l5 12z`) + P(`M${x} ${y - 30}v-6`, { fill: "none" });
const drop = (x, y) => P(`M${x} ${y - 6}q5 6 0 9q-5 -3 0 -9z`, { fill: K, w: 1 });
const iron = (x, y, a = -30) => G(P(rr(-34, -5, 30, 10, 5)) + P("M-4 -3h16l10 3l-10 3h-16z") + L(-34, 0, -48, 4, { w: 3 }), `translate(${x} ${y}) rotate(${a})`);
const driver = (x, y, a = 0) => G(P(rr(-6, -34, 12, 22, 5)) + L(0, -12, 0, 12, { w: 3.4 }) + L(-2.5, 12, 2.5, 12, { w: 2 }), `translate(${x} ${y}) rotate(${a})`);
const scissors = (x, y, a = 0) => G(C(-6, 8, 5) + C(6, 8, 5) + L(-3, 4, 6, -14) + L(3, 4, -6, -14), `translate(${x} ${y}) rotate(${a})`);
const clamp = (x, y) => P(`M${x} ${y}h30v7h-23v24h23v7h-30z`) + L(x + 30, y + 7, x + 30, y + 15, { w: 3 }) + L(x + 30, y + 23, x + 30, y + 31, { w: 3 });
const tape = (x, y) => C(x, y, 13) + C(x, y, 6);
const drill = (x, y) => P(`M${x - 22} ${y - 10}h26l6 4v8l-6 4h-26z`) + P(rr(x - 16, y + 4, 12, 22, 3)) + L(x + 10, y - 2, x + 22, y - 2, { w: 2.4 });
const saw = (x, y) => P(`M${x - 26} ${y - 4}h40l8 10h-48z`) + P(rr(x - 34, y - 8, 12, 18, 4));
const level = (x, y, w = 110) => P(rr(x, y - 5, w, 10, 3)) + P(rr(x + w / 2 - 9, y - 3, 18, 6, 3), { w: 1.4 }) + C(x + w / 2, y, 1.6, { fill: K, w: 0 });
const insert = (x, y) => P(rr(x - 5, y - 6, 10, 12, 1.5)) + L(x - 5, y - 2, x + 5, y - 2, { w: 1.2 }) + L(x - 5, y + 2, x + 5, y + 2, { w: 1.2 });
const screw = (x, y, l = 20) => P(rr(x - 6, y - 5, 12, 5, 2)) + L(x, y, x, y + l, { w: 3.4 }) + [...Array(Math.max(1, Math.floor(l / 4)))].map((_, i) => L(x - 3, y + 3 + i * 4, x + 3, y + 5 + i * 4, { w: 1.2 })).join("");
const dowel = (x, y, l) => P(`M${x} ${y}h${l}`, { fill: "none", w: 12 + 2 * SW }) + P(`M${x} ${y}h${l}`, { fill: "none", w: 12, stroke: W });
const strip = (x, y, l) => P(rr(x, y - 4, l, 8, 2)) + [...Array(Math.floor(l / 12))].map((_, i) => P(rr(x + 4 + i * 12, y - 2, 5, 4, 1), { w: 1, fill: ACC })).join("");
const plug = (x, y, a = 0) => G(P(rr(-6, -9, 12, 14, 2.5)) + P(rr(-4, -15, 8, 6, 1.2), { w: 1.6 }) + L(0, 5, 0, 16), `translate(${x} ${y}) rotate(${a})`);
const usbBox = (x, y) => P(rr(x - 14, y - 9, 28, 18, 4)) + L(x + 14, y, x + 30, y) + plug(x + 36, y, 90);
const charger = (x, y) => P(rr(x - 16, y - 20, 32, 40, 6)) + P(rr(x - 8, y - 12, 7, 4, 1), { w: 1.4 }) + P(rr(x + 1, y - 12, 7, 4, 1), { w: 1.4 });
// lever wire connector (two levers up)
const lever = (x, y) => P(rr(x - 10, y - 6, 20, 12, 2.5)) + L(x - 4, y - 6, x - 7, y - 15, { w: 3 }) + L(x + 4, y - 6, x + 1, y - 15, { w: 3 }) + L(x - 18, y - 2, x - 10, y - 2, { w: 1.6 }) + L(x - 18, y + 2, x - 10, y + 2, { w: 1.6 });
const zip = (x, y) => P(rr(x - 4, y - 4, 8, 8, 1.5)) + P(`M${x + 4} ${y}h22`, { fill: "none", w: 3 });
const felt = (x, y, l = 60) => P(rr(x, y - 3, l, 6, 1.5)) + L(x + 4, y, x + l - 4, y, { w: 1, dash: "2 3" });
const clockT = (x, y) => C(x, y, 14) + L(x, y, x, y - 9, { w: 2.2 }) + L(x, y, x + 7, y + 3, { w: 2.2 }) + T(x, y + 32, "30′", { size: 13 });
const printer = (x, y) => P(rr(x, y, 96, 84, 6)) + L(x + 10, y + 16, x + 86, y + 16) + P(rr(x + 40, y + 16, 16, 14, 3)) + P(`M${x + 46} ${y + 30}l2 6l2 -6z`, { fill: K, w: 1 }) + L(x + 12, y + 66, x + 84, y + 66, { w: 3 });

// ---------------------------------------------------------------- frames
const frame = (label, body, alt) => `<figure class="st"${label ? "" : ' data-n=""'}>${label ? `<div class="n">${label}</div>` : ""}<svg viewBox="0 0 320 240" role="img" aria-label="${esc(alt)}"><title>${esc(alt)}</title>${body}</svg></figure>`;

export function howtoBody(info) {
  clipN = 0;
  const sz = headSize(info), wall = info.mount === "wall", post = info.mount === "post", tri = !wall && !post;
  const HW = sz.w, HH = sz.h;
  const shell = [frameL(), ring1L(), ...Array(info.nExt).fill(0).map(() => ringL()), backL()];
  const full = wall ? [frameL(), { d: 14, kind: "ring" }, backL()] : shell;
  const pair = [frameL(), full[1]];
  // the head's place in most frames: centred left of the middle, room for Pip on the right
  const at = (layers, cx = 132, cy = 124) => centred(HW, HH, depthOf(layers), cx, cy);
  const O = at(full), O2 = at(pair);
  const pt = (o, x, y, z = 0) => iso(o, x, y, z);

  // ---- before you start
  const start = [];
  const hw = info.hardware || [];
  start.push(frame("", hw.slice(0, 8).map((it, i) => {
    const x = 44 + (i % 4) * 77, y = 70 + Math.floor(i / 4) * 100;
    const icon = { insert: insert(x, y), screw: screw(x, y - 12, 22), dowel: dowel(x - 26, y, 52), pole: P(`M${x - 28} ${y}h56`, { fill: "none", w: 12 + 2 * SW }) + P(`M${x - 28} ${y}h56`, { fill: "none", w: 12, stroke: W }),
      strip: strip(x - 28, y, 56), usb: usbBox(x - 10, y), lever: lever(x, y), charger: charger(x, y), zip: zip(x - 10, y), felt: felt(x - 28, y, 56), plywood: board([x - 30, y - 4], 44, 6, 26), anchor: screw(x, y - 12, 18) }[it.icon] || "";
    const k = ["dowel", "pole", "strip", "felt", "plywood", "usb"].includes(it.icon) ? 0.95 : it.icon === "charger" ? 0.9 : 1.45;
    return G(icon, `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`) + count(x, y + 42, it.n) + (it.tag ? T(x, y + 58, it.tag, { size: 11, weight: 500 }) : "");
  }).join(""), "Hardware you need"));
  const tools = [glue(52, 96), iron(140, 84, 0), driver(214, 104), scissors(276, 86), tape(58, 178), clamp(112, 158)];
  if (tri || post) tools.push(saw(214, 178));
  if (wall || post) tools.push(drill(286, 178));
  start.push(frame("", G(tools.join(""), "translate(160 130) scale(1.15) translate(-160 -130)"), "Tools: glue, soldering iron, screwdriver, scissors, tape, clamp" + (tri || post ? ", saw" : "") + (wall || post ? ", drill" : "")));

  // ---- print
  const pr = [];
  const xl = info.parts.filter((p) => p[2] === "XL"), co = info.parts.filter((p) => p[2] !== "XL");
  const thumbs = (list, x0) => list.slice(0, 6).map(([lab, q], i) => P(rr(x0 + (i % 3) * 30, 158 + Math.floor(i / 3) * 30, 24, 22, 4), { w: 1.8 }) + (q > 1 ? T(x0 + 12 + (i % 3) * 30, 173 + Math.floor(i / 3) * 30, `${q}×`, { size: 10 }) : "")).join("");
  pr.push(frame("A", printer(40, 38) + tag(88, 140, "XL") + thumbs(xl, 44) + printer(186, 38) + tag(234, 140, "Core One") + thumbs(co, 190) + T(160, 230, `${info.nozzle} mm · ${info.material}`, { size: 12, weight: 500 }), "Which parts go on which printer"));
  if (info.backHoles) { const c0 = centred(60, 8, 60, 112, 160);
    pr.push(frame("B", box(c0, 60, 8, 60, 3) + onTop(c0, 0, C(30, 30, 9) + C(30, 30, 5.5, { dash: "2 2", w: 1.4 })) + screw(pt(c0, 30, 0, 30)[0], 44, 54) + turn(pt(c0, 30, 0, 30)[0], 66, 22) +
      check(196, 140) + pip(268, 214, { pose: "point", face: -1 }), "Print the thread test coupon first and try a screw in it")); }
  { const bo = centred(150, 8, 100, 118, 168), po = pt(bo, 40, -34, 30);
    pr.push(frame(info.backHoles ? "C" : "B", board(bo, 150, 8, 100) + box(po, 64, 34, 44, 8) + arrow(pt(po, 32, 0, 22)[0], 34, pt(po, 32, 0, 22)[0], pt(po, 32, 0, 22)[1] - 18) + check(226, 70) +
      G(box([0, 0], 22, 36, 12, 4) + L(-4, 44, 40, 44, { w: 2 }) + L(4, 44, 4, 38, { dash: "2 3", w: 1.4 }) + L(14, 44, 14, 40, { dash: "2 3", w: 1.4 }), "translate(250 120)") + cross(298, 120), "Print each part flat on its face, no supports")); }

  // ---- build
  const b = [];
  const step = (body, alt) => b.push(frame(String(b.length + 1), body, alt));
  const holes4 = [[-26, -12], [26, -12], [-26, 12], [26, 12]];
  if (!wall) { const p = [118, 104];
    step(cyl(p, 44, 30, { top: holes4.map(([x, z]) => C(x, z, 3.5)).join("") }) + insert(p[0] - 30, 62) + iron(p[0] - 32, 42, -60) + arrow(p[0] - 30, 74, p[0] - 30, 92) + count(46, 52, 4) +
      magnify(...iso(p, 26, 0, 12), 252, 70, 40, P("M-40 4h80v40h-80z") + P("M-6 4v20h12v-20", { fill: "none" }) + insert(0, 9) + check(22, -14, 0.8)),
      `${post ? "Post cap" : "Base"}: press 4 inserts in with the soldering iron, flush`); }
  if (info.dock) step(head(O2, sz, [frameL()]) + magnify(...pt(O2, HW / 2, HH - 8), 252, 64, 42, P("M-44 10h88v40h-88z") + insert(-18, 16) + insert(18, 16) + iron(-10, -14, -60)) + count(230, 132, 2),
    "Slot floor: 2 short inserts for the dock clip");
  // frame onto ring 1 (or the wall case): frame slides along the depth axis into place
  { const oF = iso(O2, 0, 0, -44);
    step(head(O2, sz, [frameL({ dash: true }), full[1]]) + head(oF, sz, [frameL()], { slot: false }) + arrow(...dz(pt(oF, HW, 20, 6), 2), ...dz(pt(oF, HW, 20, 6), 30)) +
      glue(288, 176) + drop(272, 142) + drop(262, 156), wall ? "Glue the frame onto the wall case" : "Glue the frame onto ring 1"); }
  if (info.led) {
    const right = info.ledFeed === "right", xs = right ? HW - 6 : 6, xe = right ? 6 : HW - 6, yt = HH * 0.3;
    const s0 = pt(O2, xs, yt), e0 = pt(O2, xe, yt);
    // the top of each side is under the face: the strip's lit part starts lower; the hidden ends are dashed
    const lit = `<path d="${ledU(HW, HH, 6, 0.42)}" fill="none" stroke="${ACC}" stroke-width="4" stroke-linecap="round"/>`;
    const hid = [xs, xe].map((x) => L(x, HH * 0.3, x, HH * 0.42, { dash: "2 3", w: 1.6 })).join("");
    const tS = pt(O2, xs, HH * 0.36);
    // 1: cut the plug off, thread the wires up under the cover and back into the box, rejoin them there
    step(head(O2, sz, pair, { ledPath: hid }) + (info.ledPlug ? plug(tS[0] - 44, tS[1] + 74, 0) + L(tS[0] - 44, tS[1] + 58, tS[0] - 44, tS[1] + 20, { w: 1.6 }) + scissors(tS[0] - 62, tS[1] + 34) : "") +
      magnify(...tS, 254, 176, 46, P("M-46 -40h10v80h-10z", { fill: K, w: 1 }) + P("M-36 -26h30v52h-30z", { fill: "none", dash: "3 3", w: 1.6 }) +
        `<path d="M-30 34V-18q0 -8 8 -8h40" fill="none" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/>` + arrow(10, -26, 36, -26)) +
      (info.ledPlug ? lever(274, 60) + count(274, 92, 3) : ""),
      info.ledPlug ? `Cut the plug off the strip's lead. Push the wires up under the top ${info.ledFeed} and back into the box; rejoin them there with 3 lever connectors`
        : `Push the strip's lead up under the top ${info.ledFeed} and back into the box`);
    // 2: lay the strip
    step(head(O2, sz, pair, { ledPath: lit + hid }) + arrow(...pt(O2, xs, HH * 0.6), ...pt(O2, xs, HH * 0.46)) + arrow(...pt(O2, xe, HH * 0.6), ...pt(O2, xe, HH * 0.46)) +
      scissors(e0[0] + 30, e0[1] + 10) + (info.ledLeds ? tag(246, 30, `${info.ledLeds} LEDs · ${info.ledMM} mm`) : "") + pip(284, 228, { pose: "point", face: -1, s: 0.82 }),
      `Slide the strip's start up under the top ${info.ledFeed}, lay it down, across and up; cut it and slide the end under the other top`);
    const oD = iso(O2, 0, 0, -36);
    step(head(O2, sz, pair, { ledPath: lit + hid }) + onFront(oD, 0, `<path d="${ledU(HW, HH, 6, 0.42)}" fill="none" stroke="${K}" stroke-width="8" stroke-linecap="round"/><path d="${ledU(HW, HH, 6, 0.42)}" fill="none" stroke="${W}" stroke-width="3.6" stroke-linecap="round"/>`) +
      arrow(...dz(pt(oD, 6, HH * 0.62), 4), ...dz(pt(oD, 6, HH * 0.62), 28)) + arrow(...dz(pt(oD, HW - 6, HH * 0.62), 4), ...dz(pt(oD, HW - 6, HH * 0.62), 28)) + check(286, 64), "Press in the diffuser");
  }
  if (info.dock) step(head(O2, sz, pair) + magnify(...pt(O2, HW / 2, HH - 8), 250, 78, 50,
      P("M-50 18h100v40h-100z") + P("M-12 -30h24v48h-24z") + P(rr(-6, -46, 12, 16, 2), { w: 1.6 }) + L(0, 18, 0, 40) + zip(-4, 26) +
      screw(-26, -6, 20) + screw(26, -6, 20) + arrow(-26, -40, -26, -16) + arrow(26, -40, 26, -16)) + count(56, 56, 2) + tag(250, 160, "M3 × 8"),
    "Dock: plug in the clip, zip tie under it, 2 screws into the slot floor");
  // rings and back, one joint at a time: parts move forward along the depth axis
  { const ex = wall ? [frameL(), full[1], backL({ gap: 18 })] : [frameL(), ring1L(), ...Array(info.nExt).fill(0).map(() => ringL({ gap: 16 })), backL({ gap: 16 })];
    const oE = at(ex, 128, 126);
    let z = 0; const arrows = [];
    ex.forEach((l) => { if (l.gap) arrows.push(arrow(...dz(pt(oE, HW / 2, -8), z + l.gap - 2), ...dz(pt(oE, HW / 2, -8), z + 2))); z += (l.gap || 0) + l.d; });
    step(head(oE, sz, ex) + arrows.join("") + glue(292, 196) + drop(278, 162) + (wall || !info.nExt ? "" : count(282, 40, info.nExt)) + clockT(282, 92),
      wall ? "Glue on the wall plate" : info.nExt ? "Glue each ring, then the back, one joint at a time" : "Glue on the back"); }

  // ---- mount
  const small = (cx, cy, opt = {}) => { const k = 0.5, o = centred(HW, HH, depthOf(full), 0, 0); return G(head(o, sz, opt.dash ? full.map((l) => ({ ...l, dash: true })) : full, opt), `translate(${cx} ${cy}) scale(${k})`); };
  if (wall) {
    const wo = [34, 16], wallPlane = onFront(wo, 0, P("M0 0h210v112h-210z", { w: 1.6 }));
    const s1 = pt(wo, 50, 46), s2 = pt(wo, 150, 46);
    step(wallPlane + onFront(wo, 0, P(rr(45, 24, 110, 10, 3)) + P(rr(91, 26, 18, 6, 3), { w: 1.4 }) + L(50, 46, 150, 46, { dash: true, w: 1.8 })) + C(...s1, 4) + C(...s2, 4) +
      dim(s1[0] - 14, s1[1] + 22, s2[0] - 14, s2[1] + 22, `${info.keySpan} mm`) + drill(60, 196) +
      magnify(...s2, 270, 196, 26, L(-10, -26, -10, 26, { w: 3 }) + P("M-10 -2h14v4h-14z", { fill: K, w: 1 }) + P(rr(4, -7, 5, 14, 2)) + T(15, 20, "3", { size: 11 })),
      `Two screws, level, ${info.keySpan} mm apart, heads 3 mm proud; slot tops ${info.keyHeight}`);
    step(wallPlane + small(150, 70, { dash: true }) + small(150, 104) + arrow(86, 62, 86, 100) + pip(276, 214, { pose: "up", mood: "o", s: 0.9 }) + rays(276, 100), "Hang it: onto the screws, then slide down");
  } else if (post) {
    const bo = centred(130, 10, 96, 132, 170), fc = pt(bo, 65, 0, 48);
    step(board(bo, 130, 10, 96) + cyl([fc[0], fc[1] - 12], 22, 12, { top: [[-30, 0], [30, 0], [0, -30], [0, 30]].map(([x, z]) => C(x, z, 3)).join("") }) +
      screw(fc[0] - 46, fc[1] - 64, 22) + screw(fc[0] + 46, fc[1] - 64, 22) + count(56, 56, 4) + driver(272, 92, 20) +
      (info.hollow ? magnify(fc[0], fc[1], 266, 196, 28, E(0, 0, 11, 6, { dash: true }) + L(-22, 10, 22, 10, { w: 1.6 })) : "") + tag(240, 34, info.base), "Base: centre the flange, 4 wood screws");
    const bo2 = centred(130, 10, 96, 140, 196), fc2 = pt(bo2, 65, 0, 48);
    step(board(bo2, 130, 10, 96) + cyl([fc2[0], fc2[1] - 12], 22, 12) + poleV(fc2[0], 44, fc2[1] - 12) + cyl([fc2[0], 34], 26, 12) +
      dim(fc2[0] + 52, 44, fc2[0] + 52, fc2[1] - 14, info.poleCut) + turn(fc2[0], fc2[1] - 2, 30) + pip(276, 222, { pose: "point", face: -1, s: 0.8 }), `Cut the pole to ${info.poleCut}; thumb screws at both ends`);
    step(small(150, 64) + cyl([150, 146], 26, 12) + poleV(150, 158, 236) + arrow(150, 112, 150, 140) + screw(116, 104, 16) + screw(184, 104, 16) + count(56, 150, 4) + driver(262, 80, 30), "Screw the head onto the post cap");
  } else {
    step(dowel(40, 120, 180) + P(rr(220, 110, 32, 20, 4)) + arrow(270, 120, 256, 120) + glue(286, 190) + dim(40, 150, 220, 150, info.legCut) + count(60, 70, 3) + saw(130, 70),
      `Cut 3 dowels to ${info.legCut}; glue and pin the ferrules`);
    const p = [160, 70];
    step(cyl(p, 40, 24) + leg(128, 104, 88, 216) + leg(192, 104, 232, 216) + leg(160, 108, 160, 228) + turn(110, 156, 18) + turn(210, 156, 18, -1) + count(276, 52, 3), "Screw the 3 legs into the base");
    step(small(150, 64) + cyl([150, 144], 36, 22) + arrow(150, 110, 150, 138) + screw(116, 102, 16) + screw(184, 102, 16) + count(56, 150, 4) + driver(262, 80, 30), "Screw the base onto the head from inside");
  }
  // felt, iPad, slide in, lift out, done
  step(head(O, sz, full) + magnify(...pt(O, 12, 40), 256, 72, 44, P("M-46 -46h28v92h-28z") + P(rr(-18, -32, 8, 64, 2)) + P(rr(4, -32, 8, 64, 2), { dash: true, fill: "none" }) + arrow(2, 0, -8, 0)) +
    tag(256, 140, `felt ${info.liner} mm`), "Felt strip on the back of the lip, all round the window");
  if (info.direct) {
    // no cassette: the iPad goes straight in through the slit in the top
    const tb = iso(O, 6, -44, 2);
    step(tablet(tb, HW - 12, HH - 14, { dash: true }) + head(O, sz, full) + arrow(...dz(pt(O, HW / 2, -40), 4), ...dz(pt(O, HW / 2, -8), 4)) +
      (info.dock ? magnify(...pt(O, HW / 2, HH - 10), 260, 182, 34, P("M-34 -2h68v12h-68z") + P(rr(-5, -26, 10, 22, 2), { w: 1.6 }) + arrow(0, -40, 0, -26) + check(20, -16, 0.8))
        : plug(232, 190, 0) + pip(284, 228, { pose: "point", face: -1, s: 0.8 })),
      info.dock ? "Slide the iPad down through the slit, screen forward; it plugs itself in" : "Plug in, then slide the iPad down through the slit, screen forward");
    if (info.slotCap) {
      // the top cap: pressed down into the slit and the finger dish until both clips click; the lock adds one screw
      const t0 = pt(O, HW / 2 - 70, -30), t1 = pt(O, HW / 2 + 70, -30), lift = 34;
      const bar = (dy, dash) => P(`M${t0[0]} ${t0[1] - dy}L${t1[0]} ${t1[1] - dy}l0 -9L${t0[0]} ${t0[1] - dy - 9}z`, dash ? { dash: true, fill: "none" } : {});
      const mid = [(t0[0] + t1[0]) / 2, (t0[1] + t1[1]) / 2];
      step(G(head(O, sz, full) + bar(lift, true) + arrow(mid[0], mid[1] - lift - 14, mid[0], mid[1] - 14) + tag(mid[0] + 78, mid[1] - lift + 4, "click") +
        (info.slotCap === "lock" ? screw(mid[0], mid[1] - lift - 52, 22) + driver(mid[0], mid[1] - lift - 64) : ""), "translate(48 78) scale(0.7)") +
        (info.slotCap === "lock" ? "" : pip(284, 228, { pose: "push", face: -1, s: 0.8 })),
        info.slotCap === "lock" ? "Press the top cap in until it clicks, then screw it down" : "Press the top cap in until it clicks");
    }

  } else {
  { const co = centred(HW - 16, HH - 6, 4, 128, 150), tb = iso(co, 12, -64, 0);
    step(cassette(co, HW - 16, HH - 6) + tablet(tb, HW - 40, HH - 30, { dash: true }) + arrow(...pt(tb, (HW - 40) / 2, HH - 24), ...pt(co, (HW - 16) / 2 - 8, 12)) +
      (info.dock ? check(270, 64) : plug(222, 196, 0)) + pip(284, 228, { pose: "point", face: -1, s: 0.8 }),
      info.dock ? "iPad face down into the tray" : "iPad face down into the tray, then plug in"); }
  { const cs = iso(O, 10, -38, 2);
    step(cassette(cs, HW - 20, HH - 6) + head(O, sz, full) + arrow(...dz(pt(O, HW / 2, -64), 4), ...dz(pt(O, HW / 2, -44), 4)) +
      (info.dock ? magnify(...pt(O, HW / 2, HH - 10), 260, 182, 34, P("M-34 -2h68v12h-68z") + P(rr(-5, -26, 10, 22, 2), { w: 1.6 }) + arrow(0, -40, 0, -26) + check(20, -16, 0.8)) : pip(284, 228, { pose: "push", face: -1, s: 0.8 })),
      info.dock ? "Slide it down; it plugs itself in" : "Slide it down until flush"); }
  }
  { const mitt = (p) => C(p[0], p[1], 7);
    const o0 = centred(HW, HH, depthOf(full), 0, 0), top = iso(o0, HW / 2, -4, 4), mid = iso(o0, HW / 2, HH / 2, 0);
    step(G(head(o0, sz, full, { screen: true }) + mitt(top) + arrow(top[0], top[1] - 10, top[0], top[1] - 46), "translate(86 140) scale(0.55)") + check(140, 54) +
      G(head(o0, sz, full, { screen: true }) + mitt(mid) + arrow(mid[0], mid[1] - 10, mid[0], top[1] - 46), "translate(232 140) scale(0.55)") + cross(290, 54),
      info.slotCap ? `${info.slotCap === "lock" ? "Unscrew and lift" : "Lift"} the top cap by its back edge, then lift the iPad by its back edge, never by the screen` : info.direct ? "Lift it out by its back edge from the finger scoop, never by the screen" : "Lift it out by the finger scoop, never by the screen"); }
  step(head(at(full, 118, 124), sz, full, { screen: true, led: info.led }) + pip(270, 222, { pose: "up", mood: "o" }) + rays(270, 98) + rays(118, 40, 1.2), "Done. Smile.");

  return `<section class="pg"><h2>Before you start</h2><div class="grid">${start.join("")}</div></section>` +
    `<section class="pg"><h2>Print</h2><div class="grid">${pr.join("")}</div></section>` +
    `<section class="pg"><h2>Build</h2><div class="grid">${b.join("")}</div></section>` +
    `<p class="code">Booth code <code>${esc(info.code)}</code></p>`;
}

export const HOWTO_CSS = `.howto-doc{font-family:Helvetica,Arial,sans-serif;color:#111;background:#fff;padding:20px 24px 28px}
.howto-doc h1{font-size:26px;margin:0 0 4px;letter-spacing:-0.01em}.howto-doc .hsub{margin:0 0 14px;color:#555;font-size:13px}
.howto-doc h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;margin:22px 0 10px;padding-bottom:5px;border-bottom:2px solid #111}
.howto-doc .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.howto-doc .st{margin:0;border:1.5px solid #111;border-radius:8px;padding:6px;position:relative;break-inside:avoid;background:#fff}
.howto-doc .st svg{width:100%;height:auto;display:block}.howto-doc .n{position:absolute;top:6px;left:12px;font-size:30px;font-weight:800;line-height:1}
.howto-doc .code{margin-top:18px;font-size:11px;color:#444}.howto-doc code{word-break:break-all}
@media print{.howto-doc .grid{grid-template-columns:repeat(3,1fr)}}`;

export function howtoPage(info) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booth instructions</title><style>body{margin:0;background:#fff}${HOWTO_CSS}</style></head><body><div class="howto-doc"><h1>${esc(info.title)}</h1><p class="hsub">${esc(info.subtitle)}</p>${howtoBody(info)}</div></body></html>`;
}
