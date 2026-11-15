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

// three-quarter view: depth runs up and to the right, the same in every frame
const OX = 0.55, OY = -0.4;
const off = (z) => [z * OX, z * OY];
// a block with a rounded front face; depth d. o.dash draws it as a previous/future position
function block(x, y, w, h, d, r, o = {}) {
  const [dx, dy] = off(d), k = r * 0.29, s = { dash: o.dash, fill: o.dash ? "none" : W };
  return P(rr(x + dx, y + dy, w, h, r), s) +
    L(x + k, y + k, x + k + dx, y + k + dy, { dash: o.dash }) + L(x + w - k, y + k, x + w - k + dx, y + k + dy, { dash: o.dash }) +
    L(x + w - k, y + h - k, x + w - k + dx, y + h - k + dy, { dash: o.dash }) + P(rr(x, y, w, h, r), s);
}
// an upright cylinder seen from the same angle (top ellipse at y, height h)
function cyl(cx, y, rx, h, o = {}) {
  const ry = rx * 0.38, s = { dash: o.dash, fill: o.dash ? "none" : W };
  return P(`M${cx - rx} ${y}v${h}a${rx} ${ry} 0 0 0 ${2 * rx} 0v-${h}`, s) + E(cx, y, rx, ry, s);
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
// booth head: front at (x, y); layers listed front to back: { d, gap, dash, kind: "frame"|"ring"|"plate" }
function head(x, y, sz, layers, o = {}) {
  const { w, h } = sz, R = 16;
  let z = 0, out = [];
  layers.forEach((l) => { z += l.gap || 0; out.push({ ...l, z }); z += l.d; });
  let s = "";
  for (const l of out.slice().reverse()) {
    const [dx, dy] = off(l.z), X = x + dx, Y = y + dy;
    s += block(X, Y, w, h, l.d, R, { dash: l.dash });
    if (l.kind === "frame") {
      if (o.slot !== false) { const [a, b] = off(2), [c, d2] = off(7); s += P(`M${X + 15 + a} ${Y + b}L${X + w - 15 + a} ${Y + b}L${X + w - 15 + c} ${Y + d2}L${X + 15 + c} ${Y + d2}z`, { w: 1.8, dash: l.dash }); }
      s += P(rr(X + 13, Y + 13, w - 26, h - 30, 6), { dash: l.dash, fill: l.dash ? "none" : W });
      if (o.screen) s += P(rr(X + 17, Y + 17, w - 34, h - 38, 3), { w: 1.6 }) + C(X + w / 2, Y + 15, 1.4, { fill: K, w: 0 });
      if (o.led) s += `<path d="${ledU(X, Y, w, h)}" fill="none" stroke="${ACC}" stroke-width="4" stroke-linecap="round"/>`;
    }
  }
  return s;
}
const ledU = (X, Y, w, h, inset = 6.5, top = 0.32) => `M${X + inset} ${Y + h * top}V${Y + h - inset - 9}a9 9 0 0 0 9 9H${X + w - inset - 9}a9 9 0 0 0 9 -9V${Y + h * top}`;
const headSize = (info) => (info.orient === "portrait" ? { w: 92, h: 126 } : { w: 136, h: 98 });
// standard stacks
const frameL = (o = {}) => ({ d: 8, kind: "frame", ...o });
const ring1L = (o = {}) => ({ d: 30, kind: "ring", ...o });
const ringL = (o = {}) => ({ d: 18, kind: "ring", ...o });
const backL = (o = {}) => ({ d: 4, kind: "plate", ...o });
// cassette with the iPad in it, front at (x, y)
const cassette = (x, y, w, h, o = {}) => block(x, y, w, h, 5, 10, o) + (o.dash ? "" : P(rr(x + 6, y + 8, w - 12, h - 16, 4), { w: 1.6 }));
const tablet = (x, y, w, h, o = {}) => P(rr(x, y, w, h, 7), o) + P(rr(x + 5, y + 5, w - 10, h - 10, 3), { w: 1.4, dash: o.dash, fill: "none" });
// hub drum, tripod legs, post, base board
const drum = (cx, y, rx = 34, hh = 22) => cyl(cx, y, rx, hh);
const leg = (x1, y1, x2, y2) => L(x1, y1, x2, y2, { w: 11 + 2 * SW }) + L(x1, y1, x2, y2, { w: 11, stroke: W });
const board = (x, y, w, t, d) => block(x, y, w, t, d, 2);
const pole = (cx, y0, y1, r = 6) => P(`M${cx - r} ${y0}V${y1}M${cx + r} ${y0}V${y1}`, { fill: "none" });

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
const zip = (x, y) => P(rr(x - 4, y - 4, 8, 8, 1.5)) + P(`M${x + 4} ${y}h22`, { fill: "none", w: 3 });
const felt = (x, y, l = 60) => P(rr(x, y - 3, l, 6, 1.5)) + L(x + 4, y, x + l - 4, y, { w: 1, dash: "2 3" });
const clockT = (x, y) => C(x, y, 14) + L(x, y, x, y - 9, { w: 2.2 }) + L(x, y, x + 7, y + 3, { w: 2.2 }) + T(x, y + 32, "30′", { size: 13 });
const printer = (x, y) => P(rr(x, y, 96, 84, 6)) + L(x + 10, y + 16, x + 86, y + 16) + P(rr(x + 40, y + 16, 16, 14, 3)) + P(`M${x + 46} ${y + 30}l2 6l2 -6z`, { fill: K, w: 1 }) + L(x + 12, y + 66, x + 84, y + 66, { w: 3 });

// ---------------------------------------------------------------- frames
const frame = (label, body, alt) => `<figure class="st"${label ? "" : ' data-n=""'}>${label ? `<div class="n">${label}</div>` : ""}<svg viewBox="0 0 320 240" role="img" aria-label="${esc(alt)}"><title>${esc(alt)}</title>${body}</svg></figure>`;

export function howtoBody(info) {
  clipN = 0;
  const sz = headSize(info), HX = 60, HY = 86, wall = info.mount === "wall", post = info.mount === "post", tri = !wall && !post;
  const HW = sz.w, HH = sz.h, cx = HX + HW / 2;
  const shell = [frameL(), ring1L(), ...Array(info.nExt).fill(0).map(() => ringL()), backL()];
  const wallShell = [frameL(), { d: 16, kind: "ring" }, backL()];
  const full = wall ? wallShell : shell;

  // ---- before you start
  const start = [];
  const hw = info.hardware || [];
  start.push(frame("", hw.slice(0, 8).map((it, i) => {
    const x = 44 + (i % 4) * 77, y = 70 + Math.floor(i / 4) * 100;
    const icon = { insert: insert(x, y), screw: screw(x, y - 12, 22), dowel: dowel(x - 26, y, 52), pole: P(`M${x - 28} ${y}h56`, { fill: "none", w: 12 + 2 * SW }) + P(`M${x - 28} ${y}h56`, { fill: "none", w: 12, stroke: W }),
      strip: strip(x - 28, y, 56), usb: usbBox(x - 10, y), charger: charger(x, y), zip: zip(x - 10, y), felt: felt(x - 28, y, 56), plywood: board(x - 30, y + 2, 44, 7, 22), anchor: screw(x, y - 12, 18) }[it.icon] || "";
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
  if (info.backHoles) pr.push(frame("B", P(rr(70, 120, 70, 70, 8)) + C(105, 155, 14) + C(105, 155, 9, { dash: "2 2", w: 1.4 }) + screw(105, 46, 52) + turn(105, 70, 22) + check(186, 150) + pip(262, 214, { pose: "point", face: -1 }),
    "Print the thread test coupon first and try a screw in it"));
  pr.push(frame(info.backHoles ? "C" : "B", P("M24 182h168v12h-168z") + block(60, 104, 92, 70, 26, 14) + arrow(106, 50, 106, 96) + check(214, 120) +
    G(block(0, 0, 40, 30, 10, 6) + L(-6, 44, 56, 44, { w: 2 }), "translate(232 150)") + G(cross(0, 0), "translate(296 170)") , "Print each part flat on its face, no supports"));

  // ---- build
  const b = [];
  const step = (body, alt) => b.push(frame(String(b.length + 1), body, alt));
  const nIns = (wall ? 0 : 4);
  if (nIns) step((post ? cyl(130, 108, 56, 30) + [[-26, -6], [26, -6], [-26, 8], [26, 8]].map(([dx, dy]) => C(130 + dx, 108 + dy, 3.5)).join("")
      : drum(130, 108, 56, 30) + [[-26, -6], [26, -6], [-26, 8], [26, 8]].map(([dx, dy]) => C(130 + dx, 108 + dy, 3.5)).join("")) +
    insert(104, 74) + iron(102, 54, -60) + arrow(104, 84, 104, 98) + count(46, 52, 4) +
    magnify(156, 102, 250, 70, 40, P("M-40 4h80v40h-80z") + P("M-6 4v20h12v-20", { fill: "none" }) + insert(0, 9) + check(22, -14, 0.8)), `${post ? "Post cap" : "Base"}: press 4 inserts in with the soldering iron, flush`);
  if (info.dock) step(head(HX, HY, sz, [frameL()], { slot: true }) + magnify(cx, HY + HH - 8, 248, 70, 44,
      P("M-44 10h88v40h-88z") + insert(-18, 16) + insert(18, 16) + iron(-10, -14, -60)) + count(220, 140, 2),
    "Slot floor: 2 short inserts for the dock clip");
  // glue the frame on
  step((
    head(HX + 20, HY - 14, sz, [frameL({ dash: true }), { ...full[1] }]) + G(head(0, 0, sz, [frameL()], { slot: false }), `translate(${HX - 34} ${HY + 26})`) +
    arrow(HX - 20, HY + 16, HX + 8, HY - 4) + glue(284, 166) + drop(268, 132) + drop(258, 146)), wall ? "Glue the frame onto the wall case" : "Glue the frame onto ring 1");
  if (info.led) {
    const right = info.ledFeed === "right";
    const sx = right ? HX + HW - 6.5 : HX + 6.5, ex = right ? HX + 6.5 : HX + HW - 6.5, yt = HY + HH * 0.32;
    step(head(HX, HY, sz, [frameL(), full[1]]) + `<path d="${ledU(HX, HY, HW, HH)}" fill="none" stroke="${K}" stroke-width="2" stroke-dasharray="3 3"/>` +
      `<path d="${ledU(HX, HY, HW, HH)}" fill="none" stroke="${ACC}" stroke-width="4" stroke-linecap="round"/>` +
      plug(sx + (right ? 16 : -16), yt - 26, right ? 30 : -30) + arrow(sx + (right ? 22 : -22), yt - 4, sx + (right ? 4 : -4), yt + 6, right ? 0.3 : -0.3) +
      arrow(sx, yt + 14, sx, yt + 44) + scissors(ex, yt - 8) + (info.ledLeds ? tag(250, 32, `${info.ledLeds} LEDs · ${info.ledMM} mm`) : "") +
      pip(282, 228, { pose: "point", face: -1, s: 0.86 }), `One LED strip: start at the top ${info.ledFeed} with its plug into the box, lay it down, across and up, cut at the other top`);
    step(head(HX, HY, sz, [frameL(), full[1]], { led: true }) + G(`<path d="${ledU(0, 0, HW, HH)}" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/><path d="${ledU(0, 0, HW, HH)}" fill="none" stroke="${W}" stroke-width="3" stroke-linecap="round"/>`, `translate(${HX - 26} ${HY + 20})`) +
      arrow(HX - 10, HY + HH * 0.6, HX + 4, HY + HH * 0.56) + arrow(cx - 26, HY + HH + 18, cx - 14, HY + HH + 6) + check(282, 70), "Press in the diffuser");
  }
  if (info.dock) step(head(HX, HY, sz, [frameL(), full[1]]) + magnify(cx, HY + HH - 8, 246, 82, 50,
      P("M-50 18h100v40h-100z") + P("M-12 -30h24v48h-24z") + P(rr(-6, -46, 12, 16, 2), { w: 1.6 }) + L(0, 18, 0, 40) + zip(-4, 26) +
      screw(-26, -6, 20) + screw(26, -6, 20) + arrow(-26, -40, -26, -16) + arrow(26, -40, 26, -16)) + count(196, 150, 2) + tag(246, 160, "M3 × 8"),
    "Dock: plug in the clip, zip tie under it, 2 screws into the slot floor");
  // rings and back
  const gapArrows = (x0, y0, zs) => zs.map((z) => { const [a, b2] = off(z); return arrow(x0 + HW + a + 10, y0 + 30 + b2 - 6, x0 + HW + a + 2, y0 + 30 + b2); }).join("");
  if (!wall && info.nExt > 0) step(head(HX - 24, HY + 14, sz, [frameL(), ring1L(), ...Array(info.nExt).fill(0).map(() => ringL({ gap: 14 })), backL({ gap: 14 })]) +
    gapArrows(HX - 24, HY + 14, [38 + 14, 38 + 14 + 18 + 14].slice(0, info.nExt + 1)) + glue(292, 196) + drop(278, 162) + count(282, 52, info.nExt) + clockT(282, 96), "Glue each ring, then the back, one joint at a time");
  else step(head(HX - 16, HY + 10, sz, [frameL(), full[1], backL({ gap: 18 })]) + gapArrows(HX - 16, HY + 10, [8 + full[1].d + 18]) + glue(292, 196) + drop(278, 162) + clockT(282, 96),
    wall ? "Glue on the wall plate" : "Glue on the back");

  // ---- mount
  const SH = 0.52;   // small head for mount frames
  const smallHead = (x, y, o = {}) => G(head(0, 0, sz, full.map((l) => ({ ...l, d: l.d * 0.6 })), o), `translate(${x} ${y}) scale(${SH})`);
  if (wall) {
    step(`<rect x="48" y="26" width="252" height="174" fill="${W}" stroke="${K}" stroke-width="1.6"/>` + level(90, 90, 140) + L(110, 110, 210, 110, { dash: true, w: 1.8 }) +
      C(110, 110, 4) + C(210, 110, 4) + dim(110, 132, 210, 132, `${info.keySpan} mm`) + drill(270, 112) +
      magnify(210, 110, 250, 176, 24, L(-10, -24, -10, 24, { w: 3 }) + P("M-10 -2h14v4h-14z", { fill: K, w: 1 }) + P(rr(4, -7, 5, 14, 2)) + T(14, 20, "3", { size: 11 })),
      `Two screws, level, ${info.keySpan} mm apart, heads 3 mm proud; slot tops ${info.keyHeight}`);
    step(`<rect x="48" y="26" width="252" height="174" fill="${W}" stroke="${K}" stroke-width="1.6"/>` + smallHead(110, 50, { dash: true }) + smallHead(110, 76) + arrow(96, 44, 96, 84) +
      pip(262, 200, { pose: "up", mood: "o" }) + rays(262, 80), "Hang it: onto the screws, then slide down");
  } else if (post) {
    step(board(40, 168, 190, 14, 110) + cyl(160, 148, 26, 16) + [-1, 1].map((sgn) => screw(160 + sgn * 34, 118, 22)).join("") + count(60, 60, 4) + driver(250, 96, 20) +
      (info.hollow ? magnify(150, 178, 262, 196, 30, C(0, 0, 9, { dash: true }) + L(-20, 12, 20, 12, { w: 1.6 })) : "") + tag(130, 222, info.base), "Base: centre the flange, 4 wood screws");
    step(board(40, 188, 190, 10, 110) + cyl(160, 172, 26, 14) + `<rect x="${152}" y="40" width="16" height="132" fill="${W}" stroke="${K}" stroke-width="${SW}"/>` + cyl(160, 34, 30, 12) +
      dim(206, 44, 206, 170, info.poleCut) + turn(160, 168, 34) + pip(64, 212, { pose: "hold", s: 0.86 }), `Cut the pole to ${info.poleCut}; thumb screws at both ends`);
    step(smallHead(96, 20) + cyl(160, 128, 30, 14) + `<rect x="152" y="142" width="16" height="80" fill="${W}" stroke="${K}" stroke-width="${SW}"/>` + arrow(160, 116, 160, 128) +
      screw(130, 92, 16) + screw(190, 92, 16) + count(56, 150, 4) + driver(250, 70, 30), "Screw the head onto the post cap");
  } else {
    step(dowel(40, 120, 180) + P(rr(220, 110, 32, 20, 4)) + arrow(270, 120, 256, 120) + glue(286, 190) + dim(40, 150, 220, 150, info.legCut) + count(60, 70, 3) + saw(130, 70),
      `Cut 3 dowels to ${info.legCut}; glue and pin the ferrules`);
    step(drum(160, 70, 52, 26) + leg(130, 100, 92, 214) + leg(190, 100, 228, 214) + leg(160, 102, 160, 226) + turn(110, 150, 18) + turn(210, 150, 18, -1) + count(276, 60, 3),
      "Screw the 3 legs into the base");
    step(smallHead(96, 20) + drum(160, 132, 46, 22) + arrow(160, 120, 160, 132) + screw(130, 92, 16) + screw(190, 92, 16) + count(56, 150, 4) + driver(250, 70, 30),
      "Screw the base onto the head from inside");
  }
  // felt on the lip, iPad in the tray, slide in, lift out
  step(head(HX, HY, sz, full) + magnify(HX + 13, HY + 40, 258, 74, 44, P("M-46 -46h28v92h-28z") + P(rr(-18, -32, 8, 64, 2)) + P(rr(4, -32, 8, 64, 2), { dash: true, fill: "none" }) + arrow(2, 0, -8, 0)) +
    tag(258, 140, `felt ${info.liner} mm`), "Felt strip on the back of the lip, all round the window");
  step(cassette(HX + 6, HY + 22, HW - 20, HH - 10) + tablet(HX + 16, HY - 70, HW - 40, HH - 28, { dash: true }) + arrow(HX + HW / 2 - 4, HY - 2, HX + HW / 2 - 4, HY + 22) +
    (info.dock ? check(272, 70) : plug(HX + HW - 4, HY + HH + 30, 0) + arrow(HX + HW - 4, HY + HH + 20, HX + HW - 4, HY + HH + 6)) + pip(278, 226, { pose: "point", face: -1, s: 0.8 }),
    info.dock ? "iPad face down into the tray" : "iPad face down into the tray, then plug in");
  step(head(HX, HY, sz, full) + cassette(HX + 14, HY - 96, HW - 28, HH - 6, { dash: true }) + arrow(cx, HY - 50, cx, HY - 4) +
    (info.dock ? magnify(cx, HY + HH - 10, 258, 176, 34, P("M-34 -2h68v12h-68z") + P(rr(-5, -26, 10, 22, 2), { w: 1.6 }) + arrow(0, -40, 0, -26) + check(20, -16, 0.8)) : "") +
    (info.dock ? "" : pip(282, 226, { pose: "push", face: -1, s: 0.8 })), info.dock ? "Slide it down; it plugs itself in" : "Slide it down until flush");
  const mitt = (x, y) => C(x, y, 7);
  step(G(head(0, 0, sz, full, { screen: true }) + mitt(sz.w / 2, -2) + arrow(sz.w / 2, -14, sz.w / 2, -48), `translate(26 116) scale(0.55)`) + check(110, 70) +
    G(head(0, 0, sz, full, { screen: true }) + mitt(sz.w / 2, sz.h / 2) + arrow(sz.w / 2, sz.h / 2 - 12, sz.w / 2, -48), `translate(176 116) scale(0.55)`) + cross(270, 70),
    "Lift it out by the finger scoop, never by the screen");
  step(head(HX - 20, HY, sz, full, { screen: true, led: info.led }) + pip(262, 222, { pose: "up", mood: "o" }) + rays(262, 98) + G(rays(0, 0, 1.3), `translate(${cx - 20} ${HY - 18})`),
    "Done. Smile.");

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
