// Picture instructions, IKEA style: one drawing per step, a part number or a count, almost no words.
// Everything is drawn here as plain SVG line art so it travels inside the zip as one self-contained HTML file.

const K = "#111", G = "#e9e9e6", G2 = "#cfcfca", A = "#d98516";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------- drawing kit (viewBox 0 0 300 220)
const P = (d, fill = "#fff", w = 2.2) => `<path d="${d}" fill="${fill}" stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const L = (x1, y1, x2, y2, w = 2.2, dash = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${K}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const C = (x, y, r, fill = "#fff", w = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${K}" stroke-width="${w}"/>`;
const T = (x, y, s, size = 15, anchor = "middle", weight = 700) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="Helvetica, Arial, sans-serif" fill="${K}">${esc(s)}</text>`;
const rrPath = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
// oblique box with rounded front face: depth goes up-right
function slab(x, y, w, h, d, r = 10, fill = "#fff", hole = null) {
  const dx = d * 0.55, dy = -d * 0.4;
  let s = P(rrPath(x + dx, y + dy, w, h, r), G);
  s += L(x + w - r * 0.3, y + r * 0.3, x + w - r * 0.3 + dx, y + r * 0.3 + dy) + L(x + r * 0.3, y + r * 0.3, x + r * 0.3 + dx, y + r * 0.3 + dy) + L(x + w - r * 0.3, y + h - r * 0.3, x + w - r * 0.3 + dx, y + h - r * 0.3 + dy);
  s += P(rrPath(x, y, w, h, r), fill);
  if (hole) s += P(rrPath(x + hole, y + hole, w - 2 * hole, h - 2 * hole, Math.max(2, r - hole / 2)), "#fff");
  return s;
}
const arrow = (x1, y1, x2, y2, bend = 0) => {
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const a = Math.atan2(y2 - my, x2 - mx), h = 9;
  return `<path d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>` +
    P(`M${x2} ${y2}L${x2 - h * Math.cos(a - 0.45)} ${y2 - h * Math.sin(a - 0.45)}L${x2 - h * Math.cos(a + 0.45)} ${y2 - h * Math.sin(a + 0.45)}z`, K, 1.5);
};
const count = (x, y, n) => C(x, y, 17, "#fff", 2) + T(x, y + 6, `${n}×`, 15);
const tag = (x, y, s) => { const w = s.length * 8 + 16; return P(rrPath(x - w / 2, y - 13, w, 26, 13), "#fff", 2) + T(x, y + 5, s, 13); };
const check = (x, y) => C(x, y, 15, "#fff", 2.4) + P(`M${x - 7} ${y}l5 5l9 -10`, "none", 3);
const cross = (x, y) => C(x, y, 15, "#fff", 2.4) + L(x - 6, y - 6, x + 6, y + 6, 3) + L(x + 6, y - 6, x - 6, y + 6, 3);
// the booth buddy: round head, simple body. mood: "happy" | "think" | "oops" | "wow"
function buddy(x, y, s = 1, mood = "happy", arm = "down") {
  const k = (v) => v * s;
  let o = `<g transform="translate(${x} ${y})">`;
  o += P(`M${k(-16)} ${k(70)}C${k(-18)} ${k(36)} ${k(-14)} ${k(20)} 0 ${k(20)}C${k(14)} ${k(20)} ${k(18)} ${k(36)} ${k(16)} ${k(70)}z`, "#fff");
  o += L(k(-7), k(70), k(-9), k(98)) + L(k(7), k(70), k(9), k(98));
  if (arm === "up") o += L(k(-14), k(30), k(-30), k(6)) + L(k(14), k(30), k(30), k(6));
  else if (arm === "point") o += L(k(-14), k(32), k(-26), k(56)) + L(k(14), k(30), k(40), k(22));
  else o += L(k(-14), k(32), k(-26), k(58)) + L(k(14), k(32), k(26), k(58));
  o += C(0, 0, k(17));
  o += C(k(-6), k(-3), 1.8, K, 0) + C(k(6), k(-3), 1.8, K, 0);
  if (mood === "happy" || mood === "wow") o += P(`M${k(-7)} ${k(5)}Q0 ${k(12)} ${k(7)} ${k(5)}`, "none", 2);
  if (mood === "wow") o += P(`M${k(22)} ${k(-26)}l4 -10M${k(30)} ${k(-20)}l9 -6M${k(14)} ${k(-30)}l-1 -10`, "none", 2);
  if (mood === "think") o += L(k(-5), k(7), k(5), k(6), 2) + P(rrPath(k(18), k(-50), 30, 30, 15), "#fff", 2) + T(k(18) + 15, k(-50) + 22, "?", 20);
  if (mood === "oops") o += C(0, k(7), 3, "none", 2) + T(k(26), k(-22), "!", 22);
  return o + "</g>";
}
// tools
const glue = (x, y) => P(`M${x} ${y}h16v34h-16z`, "#fff") + P(`M${x + 3} ${y}l5 -14l5 14z`, "#fff") + L(x + 8, y - 14, x + 8, y - 20, 2) + C(x + 8, y - 24, 2.5, K, 0);
const iron = (x, y) => P(`M${x} ${y}h40l14 6l-14 6h-40z`, "#fff") + L(x + 54, y + 6, x + 66, y + 6, 2.4) + L(x, y + 6, x - 18, y + 6, 4);
const driver = (x, y, a = 0) => `<g transform="rotate(${a} ${x} ${y})">` + P(`M${x - 8} ${y - 30}h16v26h-16z`, "#fff") + L(x, y - 4, x, y + 26, 3.5) + "</g>";
const clamp = (x, y) => P(`M${x} ${y}h34v8h-26v30h26v8h-34z`, "#fff") + L(x + 34, y + 8, x + 34, y + 20, 3) + L(x + 34, y + 30, x + 34, y + 38, 3);
const screw = (x, y, l = 22) => P(`M${x - 6} ${y}h12v5h-12z`, "#fff") + L(x, y + 5, x, y + 5 + l, 3.2) + [...Array(Math.floor(l / 4))].map((_, i) => L(x - 3, y + 8 + i * 4, x + 3, y + 10 + i * 4, 1.4)).join("");
const insert = (x, y) => P(`M${x - 5} ${y}h10v12h-10z`, G2, 2) + L(x - 5, y + 4, x + 5, y + 4, 1.2) + L(x - 5, y + 8, x + 5, y + 8, 1.2);
const clock = (x, y, label) => C(x, y, 15) + L(x, y, x, y - 9, 2.4) + L(x, y, x + 7, y + 3, 2.4) + T(x, y + 32, label, 12);
const ipad = (x, y, w, h) => P(rrPath(x, y, w, h, 10), "#fff") + P(rrPath(x + 8, y + 8, w - 16, h - 16, 4), "#cfd8de", 1.4) + C(x + w / 2, y + 4.5, 1.6, K, 0);

const panel = (n, body, note = "") => `<figure class="st"><div class="n">${n}</div><svg viewBox="0 0 300 220" role="img" aria-label="Step ${n}${note ? ": " + esc(note) : ""}">${body}</svg>${note ? `<figcaption>${esc(note)}</figcaption>` : ""}</figure>`;

// ---------------------------------------------------------------- the booklet
// info: { mount, dock, led, glue, nExt, parts: [[label, qty, printer]], legCut, poleCut, base, plug, screws, nozzle, material, code, title }
export function howtoBody(info) {
  const out = [], step = (body, note) => out.push(panel(out.length + 1, body, note));
  const wall = info.mount === "wall", post = info.mount === "post";

  // --- print
  const printPage = [];
  const thumbs = info.parts.slice(0, 12).map(([label, qty, pr], i) => {
    const x = 18 + (i % 4) * 70, y = 34 + Math.floor(i / 4) * 58;
    return P(rrPath(x, y, 56, 40, 7), pr === "XL" ? G : "#fff", 1.8) + T(x + 28, y + 25, qty > 1 ? `${qty}×` : `${i + 1}`, 13) + T(x + 28, y + 54, label.length > 13 ? label.slice(0, 12) + "…" : label, 9, "middle", 500);
  }).join("");
  printPage.push(panel("A", T(150, 22, `${info.nozzle} mm · ${info.material}`, 14) + thumbs, "Grey: XL. White: Core One."));
  printPage.push(panel("B", slab(40, 70, 70, 70, 14, 8, "#fff", 24) + arrow(150, 105, 118, 105) + screw(180, 70, 30) + (info.backHoles ? check(250, 60) : "") + T(220, 180, "test", 14) + buddy(250, 110, 0.75, "think"), info.backHoles ? "Print the coupon first. Screw fits? Then print the back." : "Print one corner joint first."));
  printPage.push(panel("C", P("M40 150h220v14h-220z", G) + slab(70, 70, 70, 70, 30, 10, "#fff", 10) + arrow(105, 40, 105, 66) + tag(205, 60, "face down") + buddy(232, 100, 0.7, "happy"), "Smooth sheet. No supports."));

  // --- build
  const n = (wall ? 0 : 4) + (info.dock ? 2 : 0);
  if (n) step(slab(60, 120, 140, 44, 20, 18) + insert(100, 102) + insert(160, 102) + insert(130, 96) + iron(46, 84) + count(250, 50, n) + tag(245, 190, "M3") + buddy(262, 96, 0.5, "happy"),
    [wall ? "" : post ? "Post cap: 4 inserts." : "Hub: 4 inserts.", info.dock ? "Slot floor: 2 short ones for the dock clip." : ""].filter(Boolean).join(" "));
  if (info.dock) step(slab(70, 110, 50, 60, 10, 4, "#fff", 10) + P("M83 40h24v40h-24z", "#fff") + P("M89 20h12v20h-12z", G2) + arrow(140, 50, 112, 70, 0.2) + P("M150 150c20 -8 40 8 60 0", "none", 6) + L(95, 170, 95, 200, 5) + P("M84 176h22v6h-22z", K, 1) + tag(205, 105, "zip tie") + buddy(250, 90, 0.7, "happy"), `${info.plug} into the clip. Zip tie under it.`);
  step(slab(30, 70, 100, 90, 22, 18, "#fff", 14) + slab(150, 66, 100, 90, 22, 18, "#fff", 14) + arrow(132, 112, 150, 112) + glue(135, 160) + clamp(250, 150), wall ? "Glue frame to wall case." : "Glue frame to ring 1.");
  if (info.led) step(slab(50, 60, 170, 120, 8, 22, "#fff", 18) + `<path d="M62 120V160a12 12 0 0 0 12 12h122a12 12 0 0 0 12 -12V120" fill="none" stroke="${A}" stroke-width="6" stroke-linecap="round"/>` + count(250, 50, 2) + arrow(260, 110, 222, 140, 0.2) + T(150, 205, "diffuser: press in", 12, "middle", 500), info.ledLeds ? `Two strips of ${info.ledLeds} LEDs from the bottom, up each side${info.ledEdge ? ", on edge" : ""}.` : "Two strips from the bottom, up each side.");
  if (info.dock) step(slab(60, 60, 170, 120, 8, 22, "#fff", 18) + P("M134 150h22v24h-22z", "#fff") + screw(122, 110, 18) + screw(168, 110, 18) + arrow(122, 80, 122, 104) + arrow(168, 80, 168, 104) + count(250, 50, 2) + tag(245, 200, "M3 × 8"), "Clip into the slot floor. Reach in from the top.");

  if (!wall && info.nExt > 0) step(slab(20, 70, 80, 80, 26, 16, "#fff", 12) + slab(115, 66, 80, 80, 26, 16, "#fff", 12) + slab(205, 62, 70, 80, 10, 14) + arrow(103, 108, 115, 108) + arrow(197, 104, 205, 104) + count(150, 30, info.nExt) + glue(140, 170) + clock(250, 180, "30 min"), "Rings, then the back. One joint at a time.");
  else step(slab(60, 70, 100, 90, 26, 18, "#fff", 14) + slab(190, 62, 80, 90, 10, 16) + arrow(170, 108, 190, 108) + glue(140, 172) + clock(250, 186, "30 min"), wall ? "Glue on the wall plate." : "Glue on the back.");
  if (wall) {
    step(`<rect x="20" y="20" width="200" height="180" fill="${G}" stroke="${K}" stroke-width="2"/>` + C(80, 80, 6) + C(160, 80, 6) + L(80, 80, 160, 80, 2, "6 5") + T(120, 70, `${info.keySpan} mm`, 13) + P("M60 120h120v8h-120z", "#fff") + C(120, 124, 2, K, 0) + driver(250, 120, 20) + buddy(262, 30, 0.55, "think"), `Level. Two screws, heads ${3} mm off the wall. Top of slots ${info.keyHeight}.`);
    step(`<rect x="20" y="20" width="160" height="180" fill="${G}" stroke="${K}" stroke-width="2"/>` + slab(50, 56, 110, 90, 14, 16, "#fff", 14) + arrow(105, 30, 105, 54) + arrow(200, 70, 200, 110) + T(200, 130, "down", 13) + buddy(245, 96, 0.8, "happy", "up"), "Hang it: in, then down.");
  } else if (post) {
    step(`<rect x="20" y="150" width="200" height="${info.layers > 1 ? 26 : 14}" fill="${G}" stroke="${K}" stroke-width="2"/>` + P("M95 136h50v14h-50z", "#fff") + P("M108 100h24v36h-24z", "#fff") + screw(78, 96, 22) + screw(162, 96, 22) + count(255, 60, 4) + tag(245, 200, info.base), "Flange on the base, centred. 4 wood screws.");
    step(P("M110 20h20v150h-20z", G) + P("M92 170h56v14h-56z", "#fff") + P("M100 10h40v14h-40z", "#fff") + arrow(170, 60, 136, 60) + T(200, 50, info.poleCut, 14) + driver(190, 160, -60) + buddy(250, 96, 0.7, "point", "point"), `Cut the pole to ${info.poleCut}. Thumb screw at each end.`);
    step(slab(70, 30, 140, 100, 30, 18) + P("M150 130h40v10h-40z", "#fff") + P("M160 140h20v70h-20z", G) + screw(118, 150, 18) + screw(222, 150, 18) + count(40, 170, 4) + tag(260, 200, "M3"), "Head onto the post cap.");
  } else {
    step(P("M60 40h30v150h-30z", G) + P("M56 170h38v26h-38z", "#fff") + arrow(130, 120, 96, 170) + glue(150, 140) + T(75, 30, info.legCut, 13) + count(250, 60, 3) + P("M210 120l26 -10", "none", 3) + T(240, 150, "pin", 13), `Cut 3 dowels ${info.legCut}. Glue + pin the ferrules.`);
    step(P(rrPath(80, 60, 140, 40, 14), G) + P("M100 100l-30 90M150 100v95M200 100l30 90", "none", 8) + arrow(40, 150, 60, 120, -0.4) + arrow(260, 150, 240, 120, 0.4) + count(150, 30, 3) + buddy(262, 40, 0.5, "happy"), "Screw the legs into the drum.");
    step(slab(70, 30, 140, 100, 30, 18) + P(rrPath(110, 136, 80, 22, 10), G) + screw(118, 150, 18) + screw(222, 150, 18) + count(40, 170, 4) + tag(260, 200, "M3"), "Head onto the drum. 4 screws from inside.");
  }
  step(slab(40, 50, 120, 150, 10, 14, "#fff", 10) + P("M58 66h84v8h-84z", A, 1.6) + ipad(186, 50, 96, 140) + arrow(180, 120, 150, 120) + T(100, 40, `felt ${info.liner} mm`, 12, "middle", 500), info.dock ? "Felt on the lip. iPad face-down in the tray." : "Felt on the lip. iPad in, plug in.");
  step(slab(60, 80, 140, 120, 22, 18, "#fff", 18) + ipad(98, 20, 64, 70) + arrow(130, 6, 130, 26) + (info.dock ? T(230, 150, "click", 18) : "") + buddy(250, 50, 0.7, "wow", "up"), info.dock ? "Slide it in. It plugs itself in." : "Slide it down until flush.");
  step(slab(70, 70, 120, 110, 22, 18, "#fff", 18) + ipad(92, 30, 76, 50) + arrow(130, 60, 130, 14) + check(205, 60) + cross(262, 30) + P("M230 120c10 -30 30 -30 40 0", "none", 3) + buddy(250, 130, 0.6, "oops"), "Lift by the scoop. Not by the screen.");
  step(slab(40, 30, 120, 150, 22, 18, "#fff", 16) + `<path d="M56 120v40a10 10 0 0 0 10 10h68a10 10 0 0 0 10 -10v-40" fill="none" stroke="${A}" stroke-width="5"/>` + buddy(230, 70, 1, "wow", "up") + P("M190 40l8 -8M200 52l12 -2M186 28l2 -12", "none", 2.4), "Smile.");
  return `<section class="pg"><h2>Print</h2><div class="grid">${printPage.join("")}</div></section><section class="pg"><h2>Build</h2><div class="grid">${out.join("")}</div></section>` +
    `<p class="code">Booth code: <code>${esc(info.code)}</code><br>Paste it into the configurator (Export, Restore a booth) to get this booth back.</p>`;
}

export const HOWTO_CSS = `.howto-doc{font-family:Helvetica,Arial,sans-serif;color:#111;background:#fff;padding:20px 24px 28px}
.howto-doc h1{font-size:26px;margin:0 0 4px;letter-spacing:-0.01em}.howto-doc .hsub{margin:0 0 18px;color:#555;font-size:13px}
.howto-doc h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;margin:20px 0 10px;border-bottom:2px solid #111;padding-bottom:4px}
.howto-doc .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.howto-doc .st{margin:0;border:2px solid #111;border-radius:10px;padding:8px 10px 10px;position:relative;break-inside:avoid;background:#fff}
.howto-doc .st svg{width:100%;height:auto;display:block}.howto-doc .n{position:absolute;top:6px;left:10px;font-size:28px;font-weight:800}
.howto-doc figcaption{font-size:13px;line-height:1.35;margin-top:4px;min-height:2.7em}
.howto-doc .code{margin-top:18px;font-size:12px;color:#444}.howto-doc code{word-break:break-all;font-size:11px}
@media print{.howto-doc .grid{grid-template-columns:repeat(3,1fr)}}`;

export function howtoPage(info) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booth instructions</title><style>body{margin:0;background:#fff}${HOWTO_CSS}</style></head><body><div class="howto-doc"><h1>${esc(info.title)}</h1><p class="hsub">${esc(info.subtitle)}</p>${howtoBody(info)}</div></body></html>`;
}
