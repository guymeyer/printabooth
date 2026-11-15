// Booth geometry engine (manifold-3d). Assembly frame: X width, Y up, Z depth (front face z=0).
// All dimensions in millimetres.

export const DEFAULTS = {
  tablet: { preset: "ipad-a16", w: 248.6, h: 179.5, t: 7.0, r: 18, sw: 227.0, sh: 157.8, camEdge: "long", camOff: 5.4, bump: 26 },
  orientation: "landscape",
  camSide: "left",
  fit: 0.8,
  fitMode: "universal",            // "universal" = one square cassette size fits most; "hug" = shell sized to this tablet
  cass: { size: 270, t: 12, mask: 2, back: 2.4, overlap: 5, liner: 0.5, portGap: 9, portSide: "auto", bumpCorner: "pair" },
  shell: { cornerR: 33, frameD: 20, lip: 2, wall: 4, ringD: 50, ring1D: 85, nExt: 1, join: "glue" },   // join: "glue" | "screws"
  led: { on: true, strip: "demas", w: 7, depth: 8, skin: 3.5, diffT: 1.8, inlet: 36 },   // strip: LED_STRIPS key (w and depth follow it)
  cap: { lock: "none" },          // "none" = slide-in, no cap; legacy: "screws" | "magnets" | "camlock"
  inserts: { type: "m3", screw: 3, hole: 4.2, len: 5.7 },
  back: { t: 8, mode: "threaded", d: 12, pitch: 1.75, clr: 0.4, grid: 25, cells: null },   // Thread Boards estimate: print the test coupon first
  legs: { splay: 18, dowel: 38.1, camHeight: 1524, threadClr: 0.8, blend: false, circle: 26, style: "puck" },   // style: "puck" (current) | "bent" | "cluster" (older)
  print: { nozzle: 0.8, material: "PETG", ironing: false },   // nozzle drives the shell's wall/skin snapping; material only the slicer settings
  // tripod: drum base + 3 dowel legs; post: one pole into a post cap, wood floor base with a printed flange; wall: shallow case + wall plate
  mount: { type: "tripod", wallD: 40, pole: "emt125", od: 38.4, hollow: true, base: 600, layers: 2 },
  // USB-C dock (hugged tray, port on the bottom edge): a fixed plug in a printed clip, so the iPad plugs in as the cassette drops in
  dock: { on: false, brand: "apple", w: 10.6, t: 5.4, len: 15, cable: 3.8 },
};

// ---------------------------------------------------------------- mounts
export const MOUNTS = ["tripod", "post", "wall"];
export const mountOf = (c) => (MOUNTS.includes(c.mount && c.mount.type) ? c.mount.type : "tripod");
// poles for the post mount (outside diameters; EMT is US electrical conduit, hollow so the cable runs inside)
export const POLES = {
  emt1: { label: "1\u2033 EMT conduit (29.5 mm OD)", od: 29.5, hollow: true },
  emt125: { label: "1\u00bc\u2033 EMT conduit (38.4 mm OD)", od: 38.4, hollow: true },
  dowel125: { label: "1\u00bc\u2033 hardwood dowel (31.8 mm)", od: 31.75, hollow: false },
  closet: { label: "1\u215c\u2033 closet rod (34.9 mm)", od: 34.9, hollow: false },
  dowel15: { label: "1\u00bd\u2033 hardwood dowel (38.1 mm)", od: 38.1, hollow: false },
  custom: { label: "Custom" },
};
export function poleOf(c) {
  const m = c.mount || {}, p = POLES[m.pole];
  return p && m.pole !== "custom" ? { od: p.od, hollow: p.hollow, label: p.label } : { od: +m.od || 38, hollow: !!m.hollow, label: `${(+m.od || 38).toFixed(1)} mm pole` };
}
// post cap under ring 1: a disc on the four base screws, a sleeve with a blind bore for the pole, an M5 set screw at the back
export const POST = { clr: 0.6, wall: 6, disc: 8, ch: 1.5, fillet: 6, minDepth: 60, rib: 7 };
export function postSpec(c) {
  const p = poleOf(c), rB = p.od / 2 + POST.clr / 2, rS = rB + POST.wall;
  const depth = Math.max(POST.minDepth, Math.ceil(p.od * 1.6));
  return { ...p, rB, rS, depth, R: Math.max(rS + 14, 56), H: POST.disc + depth };
}
export const cableX = (c) => (mountOf(c) === "post" && !postSpec(c).hollow ? Math.ceil(postSpec(c).rS + 9) : 0);
// floor flange that screws to the wood base: disc with four countersunk wood screws and a collar for the pole's foot
export const FLANGE = { disc: 6, collar: 40, wall: 5, floor: 3, reach: 22 };
export function flangeSpec(c) {
  const S = postSpec(c), rC = S.rB + FLANGE.wall;
  return { rB: S.rB, rC, R: rC + FLANGE.reach, H: FLANGE.disc + FLANGE.collar, screwR: rC + 11, hollow: S.hollow };
}
// wood base guide: plywood square, 18 mm (3/4") sheets, ~600 kg/m3
export const PLY = { t: 18, density: 600 };
// wall plate keyholes: head enters the round hole, the case drops so the screw rides to the top of the slot
export const KEY = { head: 10, slot: 4.6, len: 11, lip: 3 };

// ---------------------------------------------------------------- LED strips
// The halo is a U that turns two corners in the plane of the face, so the strip has to bend sideways while its LEDs face
// forward. Zig-zag ("S-shape") strips do that lying flat; a side-light strip does it standing on its edge. Ordinary flat
// or COB strips don't bend sideways and would need a cut and a jumper at each corner.
// w: across the channel, h: into the channel (depth), cut: cut-mark spacing, W/m at full white, minR: tightest sideways bend
export const LED_STRIPS = {
  demas: { label: "DEMASLED Zig-Zag, 12 V white (UL listed)", kind: "White", volts: 12, w: 6, h: 2, cut: 50, perM: 60, wPerM: 6.2, minR: 12,
    url: "https://www.amazon.com/dp/B06XWGTG53", url2: ["Warm white", "https://www.amazon.com/dp/B01N28PHC8"] },
  btf: { label: "BTF-LIGHTING S-shape, 12 V addressable RGB", kind: "Addressable RGB", volts: 12, w: 6, h: 2, cut: 1000 / 60, perM: 60, wPerM: 14, minR: 12,
    url: "https://btf-lighting.com/products/12v-ws2812b-s-shape-foldable-led-strip-light-for-diy-1m-60leds-6mm-pcb-individually-addressable-dream-color-5050-rgb-pixels-tap" },
  topxcdz: { label: "TOPXCDZ 5 mm S-shape WS2812B, 5 V addressable RGB", kind: "Addressable RGB", volts: 5, w: 5, h: 2, cut: 1000 / 60, perM: 60, wPerM: 18, minR: 12,
    url: "https://www.amazon.com/dp/B09WQW1CPR" },
  adafruit: { label: "Adafruit NeoPixel Side Light, 60 LED (on edge), 5 V", kind: "Addressable RGB", volts: 5, edge: true, w: 3, h: 8, cut: 1000 / 60, perM: 60, wPerM: 18, minR: 10,
    url: "https://www.adafruit.com/product/3636" },
  custom: { label: "Custom: size the channel yourself" },
};
export const stripOf = (c) => { const s = LED_STRIPS[c.led && c.led.strip]; return s && c.led.strip !== "custom" ? s : null; };
// channel for a strip: 0.5 mm each side; depth = diffuser + strip + an air gap that blends the LEDs (about a quarter of their spacing)
export function ledFit(c, key) {
  const s = LED_STRIPS[key]; if (!s || key === "custom") return null;
  const air = s.edge ? 2.5 : Math.max(3, Math.min(5, 1000 / s.perM / 4));
  let depth = Math.ceil((c.led.diffT + s.h + air) * 2) / 2;
  // keep the channel floor clear of the frame's split at the back of the slot (no paper-thin step in ring 1): stop short of
  // it if the strip still fits, otherwise go a clear 1.5 mm past it
  const split = derive({ ...c, led: { ...c.led, on: false } }).chZ1, min = c.led.diffT + s.h + 1;
  if (depth > split - 0.8 && depth < split + 1.5) depth = Math.floor((split - 0.8) * 2) / 2 >= min ? Math.floor((split - 0.8) * 2) / 2 : Math.ceil((split + 1.5) * 2) / 2;
  return { w: Math.ceil((s.w + 1) * 2) / 2, depth };
}

// ---------------------------------------------------------------- USB-C dock
// head sizes are typical caliper measurements, not published specs: measure yours and use Custom if it differs
export const DOCK_PLUGS = {
  apple: { label: "Apple 60W USB-C Charge Cable (1 m)", w: 10.6, t: 5.4, len: 15, cable: 3.8, url: "https://www.apple.com/shop/product/MW493AM/A/60w-usb-c-charge-cable-1-m" },
  anker: { label: "Anker USB-C to USB-C Cable (240W, braided)", w: 12.4, t: 6.6, len: 20, cable: 4.0, url: "https://www.anker.com/products/a82e2-240w-usb-c-to-usb-c-cable" },
  amazon: { label: "Amazon Basics USB-C to USB-C 2.0 Cable", w: 12.0, t: 6.4, len: 19, cable: 3.6, url: "https://www.amazon.com/dp/B01GGKZ1VA" },
  custom: { label: "Custom (measure your plug)" },
};
export function plugOf(c) {
  const k = c.dock || {}, p = DOCK_PLUGS[k.brand];
  return p && k.brand !== "custom" ? { w: p.w, t: p.t, len: p.len, cable: p.cable } : { w: +k.w || 12, t: +k.t || 6.5, len: +k.len || 18, cable: +k.cable || 4 };
}
// clip: U around the plug head (open at the front, the frame lip closes it), a floor the head sits on with a slot for the
// cable, and two ears screwed down onto the slot floor (M3 x 8 into M3 x 4 heat-set inserts); a zip tie under the floor stops
// the plug pulling up when the cassette lifts out
export const DOCK = { gap: 0.5, floor: 2, wall: 1.6, clr: 0.15, earW: 7, earH: 3, insHole: 4.0, insD: 5.0, head: 2.2 };

// ---------------------------------------------------------------- print plan (nozzle-driven)
// Walls, ribs and lips of the shell parts (frame, rings, back panel) snap to whole extrusion widths (at least 2) so they print as
// full perimeters with no gap fill; horizontal skins snap to whole layers (at least 1.2 mm). Outer dimensions and every fit
// clearance stay fixed: the change goes to the inside or a non-mating face.
export const NOZZLES = [0.4, 0.6, 0.8];
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
export function printPlan(c) {
  const p = c.print || {};
  const nozzle = NOZZLES.includes(+p.nozzle) ? +p.nozzle : 0.8;
  const ew = r2(nozzle * 1.125), lh = r2(nozzle * 0.5);
  const n = (t, how = "round") => Math.max(2, Math[how](t / ew + (how === "floor" ? 1e-6 : 0)));
  const W = (t, how) => r3(n(t, how) * ew);
  const minLayers = Math.ceil(1.2 / lh - 1e-9);
  const L = (t) => r3(Math.max(minLayers, Math.round(t / lh)) * lh);
  const wall = W(c.shell.wall);                       // ring wall: outer face fixed, inner face moves
  const lapT = W(LAP.t);                              // glue tongue (socket width follows; the clearance stays LAP.clr)
  const sock = W(wall - lapT - LAP.clr);              // ring skin outside the socket
  const lapA = r3(wall - sock - LAP.clr - lapT);      // tongue position from the inner wall, so that skin is whole lines
  return {
    nozzle, ew, lh, minLayers, n, W, L, wall, lapT, sock, lapA,
    lip: L(c.shell.lip), backT: L(c.back.t), ledDepth: L(c.led.depth), cradle: W(2.5),
    ledSkin: W(c.led.skin), sideNoLed: W(4),
    topBottom: Math.max(4, Math.ceil(1.2 / lh - 1e-9)),
  };
}
// shallow V-groove (0.4 deep, 90 degrees) down the underside of each tall shell part: a hidden, aligned place for the seam
export const SEAM_V = 0.4;
export const SEAM_REAR = new Set(["frame", "ring1", "ringExt", "ringExt2", "ringExtLast", "wallCase"]);

export const TABLETS = {
  "ipad-a16": { label: "iPad (A16) / 10th gen", w: 248.6, h: 179.5, t: 7.0, r: 18, sw: 227.0, sh: 157.8, camEdge: "long", camOff: 5.4, bump: 26 },
  "ipad-air-11": { label: "iPad Air 11\" (M2–M4)", w: 247.6, h: 178.5, t: 6.1, r: 18, sw: 227.0, sh: 157.8, camEdge: "long", camOff: 5.2, bump: 26 },
  "ipad-pro-11": { label: "iPad Pro 11\" (M4+)", w: 249.7, h: 177.5, t: 5.3, r: 16, sw: 232.8, sh: 160.5, camEdge: "long", camOff: 4.3, bump: 38 },
  "ipad-mini": { label: "iPad mini (A17 Pro)", w: 195.4, h: 134.8, t: 6.3, r: 16, sw: 176.5, sh: 115.9, camEdge: "short", camOff: 4.7, bump: 24 },
  custom: { label: "Custom size" },
};

// heat-set insert presets: hole = printed hole diameter, len = insert length, screw = thread size
export const INSERTS = {
  "m3-short": { label: "M3 short (4 mm)", screw: 3, hole: 4.0, len: 4.0 },
  m3: { label: "M3 standard (5.7 mm)", screw: 3, hole: 4.2, len: 5.7 },
  m4: { label: "M4 (8.1 mm)", screw: 4, hole: 5.6, len: 8.1 },
  m5: { label: "M5 (9.5 mm)", screw: 5, hole: 6.4, len: 9.5 },
  custom: { label: "Custom" },
};
export function insertSpec(c) {
  const i = c.inserts || { type: "m3" };
  const p = INSERTS[i.type] && i.type !== "custom" ? INSERTS[i.type] : { screw: i.screw || 3, hole: i.hole, len: i.len };
  const screw = p.screw, hole = i.type === "custom" ? i.hole : p.hole, len = i.type === "custom" ? i.len : p.len;
  return {
    screw, hole, len,
    depth: len + 1.2,                               // blind hole leaves room for displaced plastic
    clr: screw + 0.4,                               // screw clearance
    head: Math.round((screw * 1.85 + 0.8) * 10) / 10, head_h: screw + 0.3,
    lug: Math.max(6, Math.ceil(len + 2.5)),          // insert lug thickness
  };
}
const STD_LEN = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40];
export const screwLen = (grip, ins) => { const want = grip + ins.len - 0.5; return STD_LEN.filter((l) => l <= want).pop() || STD_LEN[0]; };

export const PART_INFO = {
  cassette: { label: "Cassette", printer: "XL" },
  frame: { label: "Front frame", printer: "XL" },
  diffuser: { label: "LED diffuser", printer: "XL", note: "Translucent PETG" },
  cap: { label: "Top cap", printer: "XL" },
  cassKey: { label: "Cassette top key", printer: "Core One", note: "Drops in after the iPad" },
  ring1: { label: "Ring 1", printer: "XL", note: "Includes the cassette stop" },
  ringExt: { label: "Extension ring A", printer: "XL" },
  ringExt2: { label: "Extension ring B", printer: "XL" },
  ringExtLast: { label: "Last extension ring", printer: "XL", note: "Has the back-panel lugs" },
  back: { label: "Back panel", printer: "XL" },
  hub: { label: "Base hub", printer: "Core One" },
  ferrule: { label: "Leg ferrule", printer: "Core One", qty: 3 },
  wallCase: { label: "Wall case", printer: "XL", note: "Replaces the rings" },
  wallBack: { label: "Wall plate", printer: "XL", note: "Two keyholes" },
  postCap: { label: "Post cap", printer: "Core One", note: "M5 insert + thumb screw" },
  flange: { label: "Floor flange", printer: "Core One", note: "Screws to the wood base" },
  dockClip: { label: "Dock clip", printer: "Core One", note: "Holds the USB-C plug" },
  threadTest: { label: "Thread test coupon", printer: "Core One", note: "Print first" },
};

const SCOOP_W = 60, SCOOP_DEPTH = 14, CAM_LOCK_Z = 30;
// rounded-rectangle finger pocket in the top of ring 1, running back from the cassette slot between the two cap tabs
// glued lap joint: a tongue on the rear edge of the frame and each ring (inner half of the wall) nests into a socket
// in the front edge of the next ring, or into a groove in the back panel. Both print without supports face-down.
// camera notch shape: a rounded tab rising from the window edge, flaring into it with concave fillets
const CAM = { lensR: 3, clear: 1, glassMargin: 0.8, w: 18, flare: 3 };
const LAP = { len: 5, t: 1.85, clr: 0.2, depth: 5.3 };
// slide-in finger dish: one rounded-rectangle dish straddling the cassette/shell seam on the top surface
const DISH = { hw: 30, depth: 10, r: 8, len: 40 };
// grip lip on the cassette's back face: a rounded cove under a solid top lip, where the scoop meets the cassette
const GRIP = { hw: 26, lip: 3, r: 3.25 };
const POCKET = { hw: 30, len: 38, depth: 9, r: 8 };
const TAB = { x0: 31, x1: 57, fx: 44 };           // cap tabs span |x| 31..57; fasteners at |x| = 44

// which way the USB-C port faces, in model coordinates, from the front camera's position
function portDir(c) {
  const land = c.orientation === "landscape", long = c.tablet.camEdge === "long";
  const camH = land === long;                                   // camera on a horizontal (top) edge
  const dv = camH ? [0, 1] : [c.camSide === "left" ? -1 : 1, 0];  // front view: x to the viewer's right
  const p = long ? [dv[1], -dv[0]] : [-dv[0], -dv[1]];
  return [-p[0], p[1]];
}

// ---------------------------------------------------------------- derived dimensions
const LED_SKIN = 1.2;
// tray wall around the iPad (the button groove takes BTN.depth out of it, leaving 1.4 mm)
const TRAY_WALL = 2.4;
// pocket corners are deliberately tighter than any iPad's corner: the iPad's rounded corner then always clears the pocket's
// corner and the tablet seats flat against the straight walls, whatever its real corner radius (presets are estimates)
const POCKET_CORNER = 5;
const pocketR = (tb, f) => Math.min(tb.r + f, POCKET_CORNER);
// ferrule: threaded stud (tl long) on a 45-degree cone up to the dowel cup, so it prints stud-down with no overhang and seats
// on a matching conical seat in the base (self-centring)
export function ferSpec(c) {
  const rS = legThread(c) / 2, rC = (c.legs.dowel + 8.5) / 2;
  return { tl: 26, rS, rC, hc: Math.ceil((rC - rS) * 1.1 * 2) / 2, cup: 40 };
}
export function derive(c) {
  const land = c.orientation === "landscape", tb = c.tablet, f = c.fit, hug = c.fitMode === "hug";
  const pw = (land ? tb.w : tb.h) + 2 * f, ph = (land ? tb.h : tb.w) + 2 * f;
  const iw = land ? tb.w : tb.h, ih = land ? tb.h : tb.w;            // tablet outline as mounted
  // the LED channel is a U (sides and bottom) cut into the solid slot walls; it stops under the cassette's accent band instead
  // of crossing the open top of the slot, so the lip only has to hold the glass
  const P = printPlan(c);
  const chanClr = 0.5, lip = P.lip;
  const dockOn = !!(c.dock && c.dock.on) && hug && portDir(c)[1] < 0;
  let Cw, Ch, cassT, ipadOff = [0, 0], chZ1, cassZ, tabletZ, dockMB = 0;
  if (hug) {
    // bezel-lock tray: 2 mm walls, extra room on the USB-C edge(s) for a right-angle plug
    const g = c.cass.portGap;
    // "auto": the port is on the edge the front camera implies (iPads: port bottom when held portrait with the rear camera
    // top-left from the back). "both": plug room on both opposite edges. Model -x is the viewer's right.
    const ps = c.cass.portSide === "both" ? "both" : "auto", pd = portDir(c);
    let mL = TRAY_WALL, mR = TRAY_WALL, mT = TRAY_WALL, mB = TRAY_WALL;
    if (dockOn) mB = plugOf(c).len + DOCK.floor + DOCK.gap;       // the clip stands on the slot floor under the iPad's edge
    else if (ps === "both") { if (pd[0]) { mL += g; mR += g; } else { mT += g; mB += g; } }
    else if (pd[0] < 0) mL += g; else if (pd[0] > 0) mR += g; else if (pd[1] > 0) mT += g; else mB += g;
    // LED off: the frame's side wall is whole lines; the tray's outer edge (inside the slot) takes the difference
    if (!c.led.on) { const dx = 4 - P.sideNoLed; mL += dx; mR += dx; }
    Cw = pw + mL + mR; Ch = ph + mT + mB; dockMB = mB;
    ipadOff = [(mL - mR) / 2, (mB - mT) / 2];
    cassT = c.cass.back + tb.t - 0.3;                                 // tablet glass stands 0.3 mm proud of the tray rim
    tabletZ = lip + c.cass.liner;                                      // glass face sits against the lip (+ felt liner)
    cassZ = tabletZ + 0.3;
    chZ1 = cassZ + cassT + chanClr;
  } else {
    Cw = Ch = c.cass.size; cassT = c.cass.t;
    cassZ = lip + chanClr / 2; tabletZ = cassZ + c.cass.mask + 0.3;
    chZ1 = lip + cassT + chanClr;
  }
  const chW = Cw + 2 * chanClr, chH = Ch + 2 * chanClr;
  let Sx, Sy;
  if (hug) {
    const side = c.led.on ? 2.5 + c.led.w + c.led.skin : P.sideNoLed;
    // top/bottom must leave room for the finger scoop above the cassette when there's no cap
    let sideY = (c.cap.lock || "none") === "none" ? Math.max(side, DISH.depth + 2.5) : side;
    // dock: the clip's inserts need solid wall under the slot floor, above the LED wire pocket
    if (dockOn && c.led.on) { const sk = P.ledSkin, gn = side - c.led.w - sk, gp = gn / P.ew > 8 ? gn : r3(P.n(gn, "floor") * P.ew);
      sideY = Math.max(sideY, Math.ceil((side - gp) + DOCK.insD + 0.6)); }
    Sx = chW / 2 + side; Sy = chH / 2 + sideY;
  } else { Sx = (Cw + 36) / 2; Sy = (Ch + 36) / 2; }
  const Sw = 2 * Sx, Sh = 2 * Sy;
  // cassette corner radius, and the slot that follows it
  const rCass = hug ? Math.min(tb.r + f + 2, 20) : 10, rSlot = rCass + chanClr;
  // outer corner radius: the setting, reduced if needed so the shell wall around the slot's corners stays >= 3 mm
  const cornerWall = (R) => {
    const a = R - (Sx - chW / 2) - rSlot, b = R - (Sy - chH / 2) - rSlot;
    return a <= 0 && b <= 0 ? Math.min(Sx - chW / 2, Sy - chH / 2) : R - rSlot - Math.hypot(Math.max(a, 0), Math.max(b, 0));
  };
  let R = Math.max(4, Math.min(c.shell.cornerR, Math.min(Sx, Sy) - 20));
  // with the LED on, the bottom corners must also fit the channel (outer skin + channel + 2.5 mm to the slot)
  const needWall = c.led.on ? c.led.skin + c.led.w + 2.5 : 3;
  while (R > 4 && cornerWall(R) < needWall) R -= 0.5;
  const innerX = Sx - P.wall, innerY = Sy - P.wall;
  // LED channel walls: outer skin and the wall to the slot snap to whole lines; the channel itself takes the remainder
  // (never narrower than set unless the 2-line minimum forces it). Thick walls (universal fit) are infilled and left alone.
  const sideX = Sx - chW / 2, ledSkin = P.ledSkin, gapNom = sideX - c.led.w - ledSkin;
  const ledGap = gapNom / P.ew > 8 ? gapNom : r3(P.n(gapNom, "floor") * P.ew);
  const ledW = r3(sideX - ledSkin - ledGap);
  const offX = innerX - 6;
  const ya = Math.round(0.39 * Sy), yb = Math.round(0.65 * Sy);
  const A = [[-offX, ya], [-offX, -ya], [offX, yb], [offX, -yb]];
  const B = A.map(([x, y]) => [-x, y]);
  // camera relative to the tablet centre, then the cassette centre
  const camLongHorizontal = land === (tb.camEdge === "long");
  // "left"/"right" are as seen from in front of the booth, where the viewer's right is model -x
  const camT = camLongHorizontal ? [0, ih / 2 - tb.camOff] : [(c.camSide === "left" ? 1 : -1) * (iw / 2 - tb.camOff), 0];
  // rear camera corner: seen from the back with the port at the bottom, iPads put the rear camera top-left. From the front,
  // that corner sits beside the front camera's edge. Work it out in front-view coordinates (x to the viewer's right), then mirror.
  const fv = [-camT[0], camT[1]];
  const dv = Math.abs(fv[0]) > Math.abs(fv[1]) ? [Math.sign(fv[0]), 0] : [0, Math.sign(fv[1]) || 1];
  const turn = tb.camEdge === "long" ? [-dv[1], dv[0]] : [dv[1], -dv[0]];      // long edge: CCW, short edge: CW
  const rearCorner = [-(dv[0] + turn[0]), dv[1] + turn[1]];                    // model coordinates (sx, sy)
  const cam = [camT[0] + ipadOff[0], camT[1] + ipadOff[1]];
  // front window
  let winW, winH, winR, winC;
  if (hug) {
    winW = iw - 2 * c.cass.overlap; winH = ih - 2 * c.cass.overlap; winR = Math.max(2, tb.r - c.cass.overlap);
    winC = [ipadOff[0], ipadOff[1] - chanClr];
  } else {
    const scrW = (land ? tb.sw : tb.sh) + 4, scrH = (land ? tb.sh : tb.sw) + 4;
    winW = Math.min(Cw - 12, Math.max(Cw - 24, 2 * (Math.abs(cam[0]) + 5), scrW));
    winH = Math.min(Ch - 12, Math.max(Ch - 24, 2 * (Math.abs(cam[1]) + 5), scrH));
    winR = 14; winC = [0, 0];
  }
  const lx = Sx - ledSkin - ledW / 2, ly = Sy - ledSkin - ledW / 2;
  const lr = Math.max(0, R - ledSkin - ledW / 2);
  const ledPerim = 4 * (lx + ly) - 8 * lr + 2 * Math.PI * lr;
  // accent band: in the cassette's layer the cassette widens to the full shell outline above the "shoulder",
  // where the shell's corner arc turns vertical, so its exposed top wraps around both upper corners
  const capless = (c.cap.lock || "none") === "none";
  const yS = capless ? Sy - Math.max(R, 14) : Infinity;
  const tabLen = c.cap.lock === "camlock" ? 44 : 15;
  // camera notch: which window edge it rises from, how high it must go to clear the lens, and how high it may go
  // before it would show the iPad's metal edge (stays 0.8 mm inside the glass)
  const notchSpec = (camP, winCtr, winHalf, padCtr, padHalf) => {
    const ax = Math.abs(camP[0] - winCtr[0]) / winHalf[0] > Math.abs(camP[1] - winCtr[1]) / winHalf[1] ? 0 : 1;
    const sgn = Math.sign(camP[ax] - winCtr[ax]) || 1;
    const e = winCtr[ax] + sgn * winHalf[ax];
    const h = sgn * (camP[ax] - e) + CAM.lensR + CAM.clear;
    const maxH = sgn * (padCtr[ax] + sgn * padHalf[ax] - e) - CAM.glassMargin;
    return { ax, sgn, e, h: Math.min(h, maxH), want: h, maxH, along: camP[1 - ax] };
  };
  // frame depth: at least the setting, deep enough that the rear-face inserts clear the cassette slot and LED channel
  const I = insertSpec(c);
  const hx0 = offX - I.hole / 2, hx1 = offX + I.hole / 2;
  const hitsSlot = hx0 < chW / 2 + 0.8;
  const hitsLed = c.led.on && hx1 > Sx - ledSkin - ledW - 1.8 && hx0 < Sx - ledSkin + 1.8;
  const glue = c.shell.join !== "screws";
  const fd = glue ? Math.max(c.shell.frameD, (c.led.on ? P.ledDepth : 0) + LAP.depth + 1.2, chZ1 + 2)
    : Math.max(c.shell.frameD, hitsSlot ? chZ1 + I.depth + 0.8 : 0, hitsLed ? P.ledDepth + I.depth + 0.8 : 0);
  // visible border from the shell edge to the active screen, side and top
  const scrW = land ? tb.sw : tb.sh, scrH = land ? tb.sh : tb.sw;
  const bezel = { side: Sx - (ipadOff[0] + scrW / 2), top: Sy - (ipadOff[1] - chanClr + scrH / 2) };
  return {
    rearCorner, portDir: portDir(c),
    notch: hug
      ? notchSpec([cam[0], cam[1] - chanClr], winC, [winW / 2, winH / 2], [ipadOff[0], ipadOff[1] - chanClr], [iw / 2, ih / 2])
      : notchSpec(cam, [0, 0], [((land ? tb.sw : tb.sh) + 2) / 2, ((land ? tb.sh : tb.sw) + 2) / 2], [0, 0], [pw / 2 - f, ph / 2 - f]),
    fd, glue, lip, capless, yS, rCass, rSlot, land, hug, pw, ph, iw, ih, Cw, Ch, cassT, cassZ, tabletZ, ipadOff, Sw, Sh, Sx, Sy, R, innerX, innerY, offX, A, B,
    chanClr, chW, chH, chZ1, winW, winH, winR, winC, cam, camShell: [cam[0], cam[1] - chanClr], bezel,
    thrMajor: legThread(c), thrPitch: 4, seat: 30, tabLen, ...mainShell(c, fd, glue ? chZ1 - 0.05 - fd : 0),
    seamX: (() => { if (mountOf(c) === "wall") return 0; const flat = Sx - R, drum = baseR(c); return drum + 6 <= flat - 3 ? drum + 6 : 0; })(),
    mount: mountOf(c), post: postSpec(c), flange: flangeSpec(c),
    keyholes: (() => { const kx = Math.max(30, Math.floor(Math.min(80, Sx - P.wall - 25) / 5) * 5), yL = Math.round(Sy - P.wall - 22);
      return [[-kx, yL - KEY.len], [kx, yL - KEY.len]]; })(),
    keyLockY: Math.round(Sy - P.wall - 22), wallHoleY: -(Sy - P.wall - 30),
    ...(() => { const end = cassZ + cassT + 0.01 + DISH.len + P.cradle + 1;   // wall case: the finger dish and its cradle fit inside
      const min = Math.max(30, Math.ceil((end - fd + 2) / 5) * 5); return { wallDmin: min, wallD: Math.max(min, +(c.mount && c.mount.wallD) || 40) }; })(),
    dock: dockOn ? (() => {
      const p = plugOf(c), yS = -chH / 2, yFace = yS + dockMB - DOCK.gap, yFloor = yFace - p.len, yBot = yFloor - DOCK.floor;
      const zP = tabletZ + tb.t / 2, zBootF = zP - p.t / 2, zF = Math.max(lip + 0.25, zBootF - DOCK.clr);
      const zB = zP + p.t / 2 + DOCK.clr + DOCK.wall, halfW = p.w / 2 + DOCK.clr + DOCK.wall;
      return { ...p, x: ipadOff[0], yS, yFace, yFloor, yBot, zP, zBootF, zF, zB, halfW, earX: halfW + DOCK.earW / 2, earZ: (zF + zB) / 2 };
    })() : null,
    plan: P, wall: P.wall, lapT: P.lapT, lapA: P.lapA, backT: P.backT, cradle: P.cradle, ledDepth: P.ledDepth, ledSkin, ledW, ledGap,
    led: (() => {
      // U from shoulder to shoulder; two strips start under the bottom inlet cover and run up each side
      const yEnd = (capless ? yS : Sy - R) - 1.5;
      // corner radius of the channel: as round as the shell's, but tightened where needed so the wall between the channel
      // and the cassette slot's (tighter) corner stays as thick as along the straight sides
      const gx = Sx - ledSkin - ledW, gy = Sy - ledSkin - ledW, gMin = Math.min(gx - chW / 2, gy - chH / 2);
      const wallAt = (ri) => { const a = (chW / 2 - rSlot) - (gx - ri), b = (chH / 2 - rSlot) - (gy - ri);
        return a <= 0 && b <= 0 ? gMin : ri - rSlot - Math.hypot(Math.max(a, 0), Math.max(b, 0)); };
      let ri = Math.max(1, R - ledSkin - ledW);
      while (ri > 1 && wallAt(ri) < Math.min(gMin, 2.5) - 0.01) ri -= 0.25;
      const ro = ri + ledW, lc = ro - ledW / 2;                            // centreline corner radius
      const loop = 4 * (lx + ly) - 8 * lc + 2 * Math.PI * lc;
      const U = loop - (2 * (lx - lc) + Math.PI * lc + 2 * Math.max(0, (ly - lc) - yEnd));
      const strip = (U - c.led.inlet) / 2 - 3, S = stripOf(c);
      const cutLen = S ? Math.floor(strip / S.cut + 1e-6) * S.cut : strip;
      return { perimeter: U, strip, cutLen, segs: S ? Math.round(cutLen / S.cut) : 0, leds: S ? Math.round((cutLen / 1000) * S.perM) : 0,
        strips: 2, lit: U - c.led.inlet, straightBottom: 2 * (lx - lc), yEnd, ro, lc };
    })(),
  };
}

// main shell (ring 1) depth: the setting, raised if needed so the base's legs gather fully under the head.
// The base's top spans from the booth's front face to the back of ring 1.
// smooth base: a rounded plate under the main shell, blended into three tubes that leave one neck and bend out to the legs
export const BASE = { H: 26, rc: 8, drop: 50, hh: 1.0, bendK: 0.5, tS: 10, kTubes: 12, kPlate: 18, bulge: 5, inset: 1.5 };
// leg thread: a stud on top of the ferrule, smaller than the dowel so the three sockets pack into a compact hub
const legThread = (c) => Math.round(Math.max(22, Math.min(32, c.legs.dowel * 0.8)) * 2) / 2;
// Braun-style base: one plain drum (cylinder, small chamfers) centred under the head. The three leg sockets are bored into
// its flat underside at the splay angle, each with a counterbore square to the leg so the ferrule's shoulder seats flat.
export const PUCK = { wall: 3.5, top: 5, ch: 1.5, cable: 12, relief: 6 };
function puckSpec(c) {
  const th = (c.legs.splay * Math.PI) / 180, s = Math.sin(th), co = Math.cos(th);
  const tr = legThread(c) / 2 + c.legs.threadClr / 2;                 // threaded bore radius
  const rcb = (c.legs.dowel + 8.5) / 2 + 0.5;                          // counterbore for the ferrule's cup (0.5 mm clearance)
  const cb = rcb * Math.tan(th) + 2;                                    // seat sits fully inside the drum
  const L = cb + ferSpec(c).hc + 26 + PUCK.relief;                      // bottom face to the top of the bore, along the leg
  const rt = Math.max((2 * tr + 3) / Math.sqrt(3), tr + PUCK.cable / 2 + 2);   // bore tops: clear of each other and the cable hole
  const rb = rt + L * s;                                                // bore centres on the underside
  const R = Math.ceil(rb + rcb / co + PUCK.wall);
  const H = Math.ceil(L * co + tr * s + PUCK.top);
  return { R, H, rb, cb, rcb, tr };
}
const baseR = (c) => (mountOf(c) === "post" ? postSpec(c).R : puckSpec(c).R);
function mainShell(c, fd, ring1Front) {
  const P = { ...puckSpec(c), R: baseR(c) }, edge = 8;
  const tail = (c.shell.nExt || 0) * c.shell.ringD + printPlan(c).backT;
  const D1min = Math.max(40, Math.ceil(Math.max(P.R + edge + 12 - fd, 2 * (P.R + edge) - fd - tail) / 5) * 5);
  const D1 = Math.max(c.shell.ring1D || c.shell.ringD, D1min);
  const headDepth = fd + D1 + tail;
  // centred under the whole head, but never so far back that the cable hole leaves ring 1
  const zw = Math.min(Math.max(headDepth / 2, P.R + edge), fd + D1 - 12);
  const zc = zw - fd;                                                   // ring-1 local
  const screws = [[-40, zc - 28], [40, zc - 28], [-40, Math.min(zc + 28, D1 - 14)], [40, Math.min(zc + 28, D1 - 14)]];
  return { D1, D1min, hubZc: zc, puck: P, baseScrews: screws, plateZ: [ring1Front + 1.5, D1 - 1.5], baseBossR: (c.legs.dowel + 6 + 2 * c.legs.threadClr + 14) / 2 };
}

// ---------------------------------------------------------------- validation
// Every issue carries a fix where one exists: { label, set: [[path, value], ...] } applied to the settings as-is.
const fx = (label, ...set) => ({ label, set });
const half = (v) => Math.round(v * 2) / 2;
export function validate(c) {
  const d = derive(c), issues = [];
  const add = (level, msg, fix) => issues.push(fix ? { level, msg, fix } : { level, msg });
  const sw = (d.land ? c.tablet.sw : c.tablet.sh) + 2, sh = (d.land ? c.tablet.sh : c.tablet.sw) + 2;
  if (d.hug) {
    const border = Math.min(d.iw - (d.land ? c.tablet.sw : c.tablet.sh), d.ih - (d.land ? c.tablet.sh : c.tablet.sw)) / 2;
    const maxOv = Math.floor((border - 1) * 2) / 2;
    if (c.cass.overlap > border - 1) add("error", `The lip overlap would cover the screen. This tablet's black border is about ${border.toFixed(1)} mm; keep the overlap under ${(border - 1).toFixed(1)} mm.`, fx(`Set overlap to ${maxOv} mm`, ["cass.overlap", maxOv]));
    if (c.cass.overlap < 2) add("warn", "Less than 2 mm of lip on the glass won't hold the tablet securely.", fx("Set overlap to 2 mm", ["cass.overlap", Math.min(2, maxOv)]));
    if (c.cass.portGap < 7) add("warn", "Under 7 mm beside the USB-C port is tight for most right-angle plugs. Measure yours.", fx("Set plug room to 7 mm", ["cass.portGap", 7]));
  } else {
    // smallest cassette that clears every universal-fit check
    const okAt = (size) => { const c2 = { ...c, cass: { ...c.cass, size } }, d2 = derive(c2);
      return !(d2.pw > d2.Cw - 16 || d2.ph > d2.Ch - 10 || sw > d2.winW || sh > d2.winH || Math.abs(d2.cam[0]) + 4 > d2.winW / 2 || Math.abs(d2.cam[1]) + 4 > d2.winH / 2); };
    let need = null; for (let s = Math.ceil(c.cass.size); s <= c.cass.size + 200; s++) if (okAt(s)) { need = s; break; }
    const grow = need ? fx(`Set cassette to ${need} mm`, ["cass.size", need]) : fx("Hug this tablet instead", ["fitMode", "hug"]);
    if (d.pw > d.Cw - 16 || d.ph > d.Ch - 10)
      add("error", `This tablet needs a cassette of at least ${Math.ceil(Math.max(d.pw + 16, d.ph + 10))} mm. Increase the cassette size or switch to Hug this tablet.`, grow);
    if (sw > d.winW || sh > d.winH) add("error", "The screen is larger than the front window. Increase the cassette size.", grow);
    if (Math.abs(d.cam[0]) + 4 > d.winW / 2 || Math.abs(d.cam[1]) + 4 > d.winH / 2)
      add("error", "The camera would sit behind the frame lip. Increase the cassette size.", grow);
    if (c.tablet.t + 0.6 > c.cass.t - c.cass.mask - c.cass.back) {
      const t = Math.ceil((c.tablet.t + 0.6 + c.cass.mask + c.cass.back) * 2) / 2;
      add("error", "The tablet is thicker than the cassette pocket.", fx(`Set cassette thickness to ${t} mm`, ["cass.t", t]));
    }
  }
  if (d.fd > c.shell.frameD + 1) add("warn", `The front frame grows to ${d.fd.toFixed(1)} mm deep to fit the cassette slot, LED channel and glue joint.`, fx(`Set frame depth to ${Math.ceil(d.fd)} mm`, ["shell.frameD", Math.ceil(d.fd)]));
  if (c.led.on) {
    const gx = d.Sx - c.led.skin - c.led.w - d.chW / 2, gy = d.Sy - c.led.skin - c.led.w - d.chH / 2;
    const g = Math.min(gx, gy);
    const narrow = half(Math.max(3, c.led.w - (2.5 - g)));
    const fixG = narrow < c.led.w ? fx(`Narrow the channel to ${narrow} mm`, ["led.w", narrow]) : fx("Turn the LED off", ["led.on", false]);
    if (g < 1.6) add("error", "The LED channel cuts into the cassette slot. Make it narrower or reduce the outer wall.", fixG);
    else if (g < 2.5) add("warn", "Less than 2.5 mm of wall between the LED channel and the cassette slot.", fixG);
    if (c.led.skin < 3) add("warn", "The outer wall beside the LED channel is under 3 mm.", fx("Set outer wall to 3 mm", ["led.skin", 3]));
    if (d.ledW < c.led.w - 0.05) add("warn", `With a ${d.plan.nozzle} mm nozzle the channel narrows to ${d.ledW.toFixed(2)} mm so the wall beside the slot stays 2 lines thick.`, fx("Narrow the outer wall to 3 mm", ["led.skin", 3]));
    const S = stripOf(c), fit = S && ledFit(c, c.led.strip);
    if (S) {
      const fixFit = fx(`Size the channel for this strip (${fit.w} × ${fit.depth} mm)`, ["led.w", fit.w], ["led.depth", fit.depth]);
      if (d.ledW < S.w + 0.4) add("error", `The channel is narrower than the ${S.w} mm strip.`, fixFit);
      if (d.ledDepth < c.led.diffT + S.h + 1) add("error", "The channel is too shallow for the strip and the diffuser.", fixFit);
      else if (d.ledDepth < fit.depth - 0.6) add("warn", "Little air between the strip and the diffuser, so the LEDs may show as dots.", fixFit);
      if (d.led.lc < S.minR) add("warn", `The channel's corners bend the strip tighter (${d.led.lc.toFixed(0)} mm) than it likes (${S.minR} mm).`,
        fx(`Round the corners to ${Math.ceil(c.shell.cornerR + S.minR - d.led.lc)} mm`, ["shell.cornerR", Math.ceil(c.shell.cornerR + S.minR - d.led.lc)]));
    }
    if (c.led.inlet > d.led.straightBottom - 10) {
      const L = Math.max(10, Math.floor(d.led.straightBottom - 10));
      add("error", "The wire inlet cover is longer than the straight bottom run of the channel.", fx(`Shorten the cover to ${L} mm`, ["led.inlet", L]));
    }
  }
  const I = insertSpec(c);
  if (!(I.hole > 1 && I.len > 1)) add("error", "Enter the insert's hole diameter and length.", fx("Use M3 standard inserts", ["inserts", { ...DEFAULTS.inserts }]));
  else if (I.hole > 7) add("error", "Inserts over 7 mm wide don't fit the 16 mm lugs.", fx("Use M3 standard inserts", ["inserts", { ...DEFAULTS.inserts }]));
  if (c.shell.join !== "screws" && d.backT < LAP.depth + 2.5) {
    const t = Math.ceil(LAP.depth + 2.5);
    add("error", `The back panel must be at least ${LAP.depth + 2.5} mm thick to take the glued ring's tongue in its groove.`, fx(`Set back panel to ${t} mm`, ["back.t", t]));
  }
  if (d.R < Math.min(c.shell.cornerR, Math.min(d.Sx, d.Sy) - 20) - 0.01)
    add("warn", c.led.on ? `Corner radius reduced to ${d.R} mm so the LED channel fits around the cassette's bottom corners. Turn the LED off or narrow the channel to get a rounder corner.` : `Corner radius reduced to ${d.R} mm so the shell wall around the cassette's corners stays at least 3 mm thick.`,
      fx(`Set corner radius to ${d.R} mm`, ["shell.cornerR", d.R]));
  if ((c.shell.ring1D || 0) < d.D1min) add("warn", `The main shell is ${d.D1} mm deep (its minimum) so the ${2 * d.puck.R} mm base sits fully under the head.`, fx(`Set main shell to ${d.D1min} mm`, ["shell.ring1D", d.D1min]));
  if ((c.cap.lock || "none") === "none" && d.Sy - d.chH / 2 < DISH.depth + 1.5) add("error", "Not enough shell above the cassette for the finger scoop.", d.hug ? null : fx("Hug this tablet instead", ["fitMode", "hug"]));
  if (d.notch.want > d.notch.maxH + 0.5)
    add("warn", `The camera sits close to the glass edge; its notch is limited to ${d.notch.maxH.toFixed(1)} mm so the iPad's metal edge stays hidden. Check the lens isn't clipped.`);
  if (c.cap.lock === "camlock" && d.D1 < 50) add("error", "The key lock needs ring 1 to be at least 50 mm deep.", fx("Set main shell to 50 mm", ["shell.ring1D", Math.max(50, d.D1min)]));
  // mounts
  const mt = mountOf(c);
  if (mt === "wall") {
    if (c.shell.join === "screws") add("error", "The wall case glues to the front frame. Switch the shell joints to glued.", fx("Use glued joints", ["shell.join", "glue"]));
    if ((+c.mount.wallD || 0) < d.wallDmin) add("warn", `The wall case is ${d.wallD} mm deep (its minimum) so the finger scoop fits inside.`, fx(`Set case depth to ${d.wallDmin} mm`, ["mount.wallD", d.wallDmin]));
    if (d.backT < KEY.lip + 4) add("error", `The wall plate must be at least ${KEY.lip + 4} mm thick for the keyhole pockets.`, fx(`Set the plate to 8 mm`, ["back.t", 8]));
  }
  if (mt === "post") {
    const p = poleOf(c);
    if (!(p.od >= 19 && p.od <= 51)) add("error", "Pole diameter must be between 19 and 51 mm.", fx("Use 1\u00bc\u2033 EMT conduit", ["mount.pole", "emt125"]));
  }
  // dock: the plug points up, so the port must be on the tray's bottom edge
  if (c.dock && c.dock.on) {
    if (!d.hug) add("error", "The USB-C dock needs the hugged tray.", fx("Hug this tablet", ["fitMode", "hug"]));
    else if (portDir(c)[1] >= 0) {
      const fix = ["left", "right"].map((s) => ({ ...c, orientation: "portrait", camSide: s })).find((c2) => portDir(c2)[1] < 0);
      add("error", d.land ? "Docking needs the USB-C port on the bottom edge, which on this iPad means portrait. In landscape, plug the cable in before you slide the cassette down, or switch to portrait."
        : "With the camera on this side the USB-C port is at the top. Put the camera on the other side so the port faces down onto the plug.",
        fix ? fx(d.land ? "Switch to portrait" : `Camera on the ${fix.camSide}`, ["orientation", "portrait"], ["camSide", fix.camSide]) : fx("Turn the dock off", ["dock.on", false]));
    } else if (d.dock) {
      const k = d.dock, chZ1 = d.chZ1;
      if (k.zB > chZ1 - 0.25) add("error", `A ${k.t} mm thick plug head is too thick for this iPad's slot. Use a slimmer cable or check the size.`, fx("Use the Apple cable", ["dock.brand", "apple"]));
      if (k.zBootF - 0.25 < 1.2 + 0.01) add("error", "The plug head is too thick to clear the front lip.", fx("Use the Apple cable", ["dock.brand", "apple"]));
      if ((c.dock.brand || "") === "custom" && !(k.w > 5 && k.t > 2 && k.len > 6 && k.cable > 2)) add("error", "Enter your plug head's width, thickness and length, and the cable diameter.", fx("Use the Apple cable", ["dock.brand", "apple"]));
    }
  }
  if (c.cap.lock === "camlock" && c.shell.nExt === 0) add("warn", "With no extension rings the cam lock body sits close to the back panel. Check clearance for your lock.", fx("Add an extension ring", ["shell.nExt", 1]));
  return issues;
}

// ---------------------------------------------------------------- engine
export function makeEngine(wasm) {
  wasm.setup();
  const { Manifold, CrossSection } = wasm;
  let bin = [];
  const T = (x) => { bin.push(x); return x; };
  const flush = () => { for (const o of bin) { try { o.delete(); } catch (e) {} } bin = []; };
  const segs = (d) => Math.max(24, Math.min(128, Math.round(d * 1.2)));

  const rrCS = (w, h, r) => {
    r = Math.max(0.5, Math.min(r, w / 2 - 0.05, h / 2 - 0.05));
    return T(T(CrossSection.square([w - 2 * r, h - 2 * r], true)).offset(r, "Round", 2, segs(r * 4)));
  };
  const rr = (w, h, r, z0, z1) => T(T(rrCS(w, h, r).extrude(z1 - z0)).translate([0, 0, z0]));
  const box = (x0, x1, y0, y1, z0, z1) => T(T(Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
  const cylZ = (x, y, z0, z1, d) => T(T(Manifold.cylinder(z1 - z0, d / 2, d / 2, segs(d))).translate([x, y, z0]));
  const cylY = (x, z, y0, y1, d) => T(T(T(Manifold.cylinder(y1 - y0, d / 2, d / 2, segs(d))).rotate([-90, 0, 0])).translate([x, y0, z]));
  const cylX = (y, z, x0, x1, d) => T(T(T(Manifold.cylinder(x1 - x0, d / 2, d / 2, segs(d))).rotate([0, 90, 0])).translate([x0, y, z]));
  const U = (list) => (list.length ? T(Manifold.union(list)) : T(Manifold.cube([0.001, 0.001, 0.001]).translate([0, 0, -9999])));
  const sub = (a, ...b) => { let r = a; for (const x of b) r = T(r.subtract(x)); return r; };
  const add = (a, ...b) => { let r = a; for (const x of b) r = T(r.add(x)); return r; };
  const inter = (a, b) => T(a.intersect(b));

  function thread(major, pitch, length, clr = 0) {
    const depth = 0.6 * pitch, n = Math.max(32, Math.min(160, Math.round(major * 4)));
    const rMaj = major / 2 + clr, rMin = rMaj - depth;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const u = i / n, phi = 2 * Math.PI * u;
      const g = Math.min(1, Math.max(0, (Math.abs(2 * u - 1) - 0.2) / 0.6));
      const r = rMin + depth * g;
      pts.push([r * Math.cos(phi), r * Math.sin(phi)]);
    }
    const cs = T(CrossSection.ofPolygons([pts]));
    return T(cs.extrude(length, Math.ceil((length / pitch) * 16), (360 * length) / pitch));
  }
  function along(m, v, o) {
    const rx = (Math.asin(Math.max(-1, Math.min(1, -v[1]))) * 180) / Math.PI;
    const ry = (Math.atan2(v[0], v[2]) * 180) / Math.PI;
    return T(T(T(m.rotate([rx, 0, 0])).rotate([0, ry, 0])).translate(o));
  }
  // finger scoop profile: U-shape centred on x, from yb up past the top
  const scoopCS = (d, k = 0) => {
    const yb = d.Ch / 2 + d.chanClr - SCOOP_DEPTH + k, top = d.Sy + 6, w = SCOOP_W - 2 * k;
    return T(rrCS(w, (top - yb) + 24, 11).translate([0, yb + (top - yb + 24) / 2]));
  };
  const shellProfile = (d, z0, z1) => rr(d.Sw, d.Sh, d.R, z0, z1);
  // ring-shaped band offset from the shell's inner wall surface (o0..o1 outward), z0..z1
  const band = (d, c, o0, o1, z0, z1) => {
    const ri = d.R - d.wall;
    return sub(rr(2 * (d.innerX + o1), 2 * (d.innerY + o1), ri + o1, z0, z1), rr(2 * (d.innerX + o0), 2 * (d.innerY + o0), Math.max(0.5, ri + o0), z0 - 1, z1 + 1));
  };
  // sockets print on the bed: a 0.4 mm relief at the mouth swallows the first layer's squish (elephant's foot)
  // tongue at lapA..lapA+lapT from the inner wall; the socket is a rebate open to the inside (never a sliver on its inner side)
  const sockIn = (d) => Math.min(d.lapA - LAP.clr, -LAP.clr), sockOut = (d) => d.lapA + d.lapT + LAP.clr;
  const lapSocket = (d, c, z0 = 0) => add(band(d, c, sockIn(d), sockOut(d), z0 - 1, z0 + LAP.depth), band(d, c, sockIn(d) - 0.4, sockOut(d) + 0.4, z0 - 1, z0 + 0.5));
  const lapTongue = (d, c, zFace) => band(d, c, d.lapA, d.lapA + d.lapT, zFace - 0.01, zFace + LAP.len);
  // seam groove on the underside of a tall part, full height (z0..z1)
  const seamGroove = (d, z0, z1) => {
    const v = SEAM_V, x = d.seamX, y = -d.Sy;
    const cs = T(CrossSection.ofPolygons([[[x - v - 1, y - 1], [x + v + 1, y - 1], [x, y + v]]], "NonZero"));
    return T(T(cs.extrude(z1 - z0)).translate([0, 0, z0]));
  };

  const mv = (m, x, y, z = 0) => T(m.translate([x, y, z]));
  // 45-degree peak over a horizontal (Y-axis) hole, for parts that print with +z up, so the hole's roof needs no bridge
  const teardropY = (x, z, y0, y1, dia) => { const r = dia / 2; return T(T(T(T(Manifold.cube([2 * r, y1 - y0, 2 * r], true)).rotate([0, 45, 0])).translate([x, (y0 + y1) / 2, z]))); };
  // reliefs in the tablet pocket (cx, cy = pocket centre; zFront..zBack = where the tablet sits; zb..t = back plate):
  //  - rear camera bump: a keep-out pocket through the back ledge at every corner, so any orientation clears it
  //  - buttons: a groove around the pocket wall at the tablet's mid-thickness
  const BTN = { depth: 1.0, h: 3.2 };
  function pocketReliefs(c, cx, cy, pw, ph, rPocket, zFront, zBack, zb, t) {
    const K = Math.max(0, Math.min(c.tablet.bump || 0, Math.min(pw, ph) / 2 - 10)), out = [];
    // "auto": the one corner the camera lands in; "pair": that corner and its diagonal opposite (iPad either way up); "all": every corner
    const [rx, ry] = derive(c).rearCorner, mode = c.cass.bumpCorner || "pair";
    const corners = mode === "all" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : mode === "pair" ? [[rx, ry], [-rx, -ry]] : [[rx, ry]];
    if (K > 0) for (const [sx, sy] of corners)
      out.push(mv(rr(K, K, 5, zb - 1, t + 1), cx + sx * (pw / 2 - K / 2), cy + sy * (ph / 2 - K / 2)));
    const zm = (zFront + zBack) / 2;
    // the groove keeps the iPad's own corner radius (buttons sit on the straight edges), so it stays clear of the tray's outer corners
    out.push(mv(rr(pw + 2 * BTN.depth, ph + 2 * BTN.depth, Math.max(rPocket, c.tablet.r) + BTN.depth, zm - BTN.h / 2, zm + BTN.h / 2), cx, cy));
    return out;
  }
  // camera notch: rounded tab (convex top corners) with concave flares into the window edge — sized by derive().notch
  function camNotch(n, z0, z1) {
    const h = Math.max(1.2, n.h), rf = Math.min(CAM.flare, h * 0.45), rt = Math.min(4, h * 0.5), hw = CAM.w / 2;
    // local (u along the edge, v outward from the window)
    let cs = T(rrCS(CAM.w, h + 10, rt).translate([0, (h - 10) / 2]));
    const flare = T(T(CrossSection.square([CAM.w + 2 * rf, rf + 1], true)).translate([0, (rf - 1) / 2]));
    const holes = T(CrossSection.union([T(T(CrossSection.circle(rf, 48)).translate([-(hw + rf), rf])), T(T(CrossSection.circle(rf, 48)).translate([hw + rf, rf]))]));
    cs = T(cs.add(T(flare.subtract(holes))));
    let placed;
    if (n.ax === 1) placed = T(T(n.sgn > 0 ? cs : T(cs.mirror([0, 1]))).translate([n.along, n.e]));
    else placed = T(T(cs.rotate(n.sgn > 0 ? -90 : 90)).translate([n.e, n.along]));
    return T(T(placed.extrude(z1 - z0)).translate([0, 0, z0]));
  }
  // finger dish in world coordinates (grow > 0 gives the cradle that closes it underneath)
  function dish(d, grow = 0) {
    const zA = d.cassZ + d.cassT + 0.01, zB = zA + DISH.len, cy = d.Sy - DISH.depth + DISH.r, r = DISH.r + grow;
    const pts = [];
    // the far end rises at 45 degrees (ring 1 prints front-down, so a vertical end wall would be a flat ceiling inside the scoop)
    for (const sx of [-1, 1]) for (const [z, up] of [[zA - 1, 0], [zA - 1, 40], [zB - DISH.r, 0], [zB - DISH.r + 40, 40]])
      pts.push(T(T(Manifold.sphere(r, 40)).translate([sx * (DISH.hw - DISH.r), cy + up, z])));
    return T(Manifold.hull(pts));
  }
  // flush top on the cassette: fills the slot up to the shell's top surface, following its rounded corners (cassette-local)
  function cassetteTop(d, t) {
    const ext = inter(box(-d.Cw / 2, d.Cw / 2, d.Ch / 2 - 1, d.Sy + d.chanClr, 0, t), mv(rr(d.Sw, d.Sh, d.R, -1, t + 1), 0, d.chanClr));
    return ext;
  }
  // cove cut into the cassette's back face (cassette-local), leaving a GRIP.lip-thick lip at the top
  // one continuous cassette outline: rounded bottom corners, straight sides, and a top that follows the shell's profile
  // (replaces body + separate top extension, which left a step where the body's corner radius met the extension)
  function cassetteOutline(d, t, rb) {
    const top = d.Sy + d.chanClr, bottom = -d.Ch / 2, H = top - bottom + rb;
    const tall = mv(rr(d.Cw, H + rb, rb, 0, t), 0, bottom + (H + rb) / 2);
    return inter(tall, mv(rr(d.Sw, d.Sh, d.R, -1, t + 1), 0, d.chanClr));
  }
  // full-width band of the cassette above the shoulders (cassette-local; stays within the cassette's own layer, behind the lip)
  function cassetteBand(d, t) {
    const BIG = 2000;
    return inter(mv(rr(d.Sw, d.Sh, d.R, 0, t), 0, d.chanClr), box(-BIG, BIG, d.yS + 0.15 + d.chanClr, BIG, 0, t));
  }
  const dishLocalCassette = (d) => {
    const yc = d.Sy + d.chanClr - GRIP.lip - GRIP.r, z = d.cassT;
    return T(Manifold.hull([-1, 1].map((sx) => T(T(Manifold.sphere(GRIP.r, 32)).translate([sx * (GRIP.hw - GRIP.r), yc, z])))));
  };
  // ------------------------------------------------------------ bezel-lock tray (hug mode)
  function tray(c) {
    const d = derive(c), t = d.cassT, f = c.fit, tb = c.tablet, { pw, ph, Cw, Ch, land } = d;
    const [ox, oy] = d.ipadOff, zb = t - c.cass.back;
    const rb = d.rCass;
    const body = d.capless ? add(cassetteOutline(d, t, rb), cassetteBand(d, t)) : rr(Cw, Ch, rb, 0, t);
    const cuts = [
      mv(rr(pw, ph, pocketR(tb, f), -1, zb), ox, oy),
      mv(rr(pw - 24, ph - 24, 12, zb - 1, t + 1), ox, oy),
      ...pocketReliefs(c, ox, oy, pw, ph, pocketR(tb, f), d.tabletZ - d.cassZ, zb, zb, t),
    ];
    if (land) {
      if (Cw / 2 - 2 - (ox + pw / 2) > 1) cuts.push(box(ox + pw / 2 - 0.01, Cw / 2 - 2, -14, 14, -1, t + 1));
      if ((ox - pw / 2) + Cw / 2 - 2 > 1) cuts.push(box(-(Cw / 2 - 2), ox - pw / 2 + 0.01, -14, 14, -1, t + 1));
    } else if (d.dock) {
      // the dock clip passes up through the bottom: narrow where the plug head is, wider low down for the ears and screw heads
      const k = d.dock, hw = k.halfW + 0.5, ew = k.halfW + DOCK.earW + 0.5;
      cuts.push(box(k.x - hw, k.x + hw, -Ch / 2 - 1, oy - ph / 2 + 0.01, -1, t + 1));
      cuts.push(box(k.x - ew, k.x + ew, -Ch / 2 - 1, -Ch / 2 + DOCK.earH + DOCK.head + 0.6, -1, t + 1));
    } else cuts.push(box(-14, 14, -(Ch / 2 - 2), oy - ph / 2 + 0.01, -1, t + 1));
    if (d.capless) return sub(body, U(cuts), dishLocalCassette(d));
    cuts.push(inter(cylY(0, t / 2, Ch / 2 - 9, Ch / 2 + 1, 34), box(-24, 24, Ch / 2 - 11, Ch / 2 + 2, zb - 0.01, t + 1)));
    return sub(body, U(cuts));
  }

  // ------------------------------------------------------------ cassette
  function cassette(c) {
    if (c.fitMode === "hug") return tray(c);
    const d = derive(c), t = c.cass.t, f = c.fit, tb = c.tablet;
    const { pw, ph, Cw, Ch, land } = d;
    const sw = (land ? tb.sw : tb.sh) + 2, sh = (land ? tb.sh : tb.sw) + 2;
    const zm = c.cass.mask, zb = t - c.cass.back;
    const body = d.capless ? add(cassetteOutline(d, t, d.rCass), cassetteBand(d, t)) : rr(Cw, Ch, d.rCass, 0, t);
    const [cx, cy] = d.cam;
    const cuts = [
      rr(pw, ph, pocketR(tb, f), zm, zb),
      box(-pw / 2, pw / 2, 0, Ch / 2 + 1, zm, zb),
      rr(sw, sh, 9, -1, zm + 1),
      rr(pw - 24, ph - 24, 12, zb - 1, t + 1),
      ...pocketReliefs(c, 0, 0, pw, ph, pocketR(tb, f), zm, zb, zb, t),
      camNotch(d.notch, -1, zm + 1),
    ];
    if (land) {
      cuts.push(box(pw / 2 - 6, Cw / 2 - 2, -11, 11, zm, t + 1));
      cuts.push(box(-(Cw / 2 - 2), -(pw / 2 - 6), -11, 11, zm, t + 1));
    } else cuts.push(box(-11, 11, -(Ch / 2 - 2), -(ph / 2 - 6), zm, t + 1));
    if (d.capless) {
      // the sleeve the tablet slides into stays open through the flush top
      cuts.push(box(-pw / 2, pw / 2, 0, d.Sy + d.chanClr + 1, zm, zb));
      return sub(body, U(cuts), dishLocalCassette(d));
    }
    // grip notch in the top strip, lines up with the frame scoop
    cuts.push(inter(cylY(0, t / 2, Ch / 2 - 9, Ch / 2 + 1, 34), box(-24, 24, Ch / 2 - 11, Ch / 2 + 2, zb - 0.01, t + 1)));
    return sub(body, U(cuts));
  }

  // universal cassette: slim key that fills the iPad sleeve above the tablet so the flush top reads solid
  function cassKey(c) {
    const d = derive(c), t = c.cass.t, zm = c.cass.mask, zb = t - c.cass.back, k = 0.15;
    const bar = box(-d.pw / 2 + k, d.pw / 2 - k, d.ph / 2 + 0.3, d.Sy + d.chanClr, zm + k, zb - k);
    return sub(inter(bar, cassetteTop(d, t)), dishLocalCassette(d));
  }

  // ------------------------------------------------------------ LED
  function ledRing(c, z0, z1, extra, endGap = 0) {
    const d = derive(c);
    return inter(ledLoop(c, d, z0, z1, extra), box(-3000, 3000, -3000, d.led.yEnd - endGap, z0 - 2, z1 + 2));
  }
  function ledLoop(c, d, z0, z1, extra) {
    const ox = d.Sx - d.ledSkin + extra, oy = d.Sy - d.ledSkin + extra;
    const ix = ox - d.ledW - 2 * extra, iy = oy - d.ledW - 2 * extra;
    const ro = Math.max(2, d.led.ro + extra), ri = Math.max(1, ro - d.ledW - 2 * extra);
    return sub(rr(2 * ox, 2 * oy, ro, z0, z1), rr(2 * ix, 2 * iy, ri, z0 - 1, z1 + 1));
  }
  const coverT = (c) => Math.min(3, derive(c).ledDepth - 3);

  // ------------------------------------------------------------ front frame
  // glued shells split the frame at the back of the cassette slot so neither piece overhangs:
  //   front bezel = lip + slot walls (prints face-down), cassette stop = the old back wall, now the front of ring 1
  function frame(c) {
    const d = derive(c);
    if (!d.glue) return frameFull(c, true);
    const { Sy, chW, chZ1 } = d, BIG = 2000;
    // split 0.05 mm in front of the slot's back face so the cut never lands on a coplanar face (avoids a paper-thin film)
    const bezel = inter(frameFull(c, false), box(-BIG, BIG, -BIG, BIG, -BIG, chZ1 - 0.05));
    const tongue = d.capless
      ? sub(lapTongue(d, c, chZ1 - 0.05), box(-BIG, BIG, d.yS - 0.15, BIG, chZ1 - 1, chZ1 + LAP.len + 1))
      : sub(lapTongue(d, c, chZ1 - 0.05), box(-chW / 2 - 0.5, chW / 2 + 0.5, 0, Sy + 5, chZ1 - 1, chZ1 + LAP.len + 1));
    // the tongue stops either side of the LED wire pocket instead of bridging over it
    const L = c.led.inlet;
    let tg = c.led.on ? sub(tongue, box(-L / 2 + 0.5, L / 2 - 0.5, -Sy - 1, -(Sy - d.ledSkin - d.ledW) + 0.5, chZ1 - 1, chZ1 + LAP.len + 1)) : tongue;
    if (d.dock) tg = sub(tg, box(d.dock.x - d.dock.w / 2 - 1.1, d.dock.x + d.dock.w / 2 + 1.1, -Sy - 1, d.dock.yS, chZ1 - 1, chZ1 + LAP.len + 1));
    return add(bezel, tg);
  }
  // dock: a passage under the slot floor for the cable (wide enough for the far plug to pass), heat-set insert holes for the
  // clip's ears, and a relief in the back of the lip if the plug head stands proud of the glass
  function dockCuts(c, d) {
    const k = d.dock, out = [], pw = k.w / 2 + 0.6;
    const floor = c.led.on ? -(d.Sy - d.ledSkin) : -d.innerY;
    const zPf = Math.max(1.2, Math.min(k.zF, k.zBootF) - 0.3);
    out.push(box(k.x - pw, k.x + pw, floor, k.yS + 0.01, zPf, d.fd + 1));
    for (const sx of [-1, 1]) {
      const x = k.x + sx * k.earX;
      out.push(cylY(x, k.earZ, k.yS - DOCK.insD, k.yS + 0.01, DOCK.insHole));
      out.push(inter(teardropY(x, k.earZ, k.yS - DOCK.insD, k.yS + 0.01, DOCK.insHole), box(x - 5, x + 5, k.yS - DOCK.insD - 1, k.yS + 1, k.earZ, k.earZ + 5)));
    }
    if (k.zBootF - 0.25 < d.lip) out.push(box(k.x - k.w / 2 - 0.6, k.x + k.w / 2 + 0.6, k.yS - 0.01, k.yFace + 0.6, Math.max(1.2, k.zBootF - 0.25), d.lip + 0.01));
    return out;
  }
  function dockClip(c) {
    const d = derive(c), k = d.dock;
    if (!k) return box(0, 0.01, 0, 0.01, 0, 0.01);
    const x0 = k.x, hw = k.halfW, ew = DOCK.earW;
    const body = add(box(x0 - hw, x0 + hw, k.yBot, k.yFace, k.zF, k.zB), box(x0 - hw - ew, x0 + hw + ew, k.yBot, k.yBot + DOCK.earH, k.zF, k.zB));
    const cuts = [
      box(x0 - k.w / 2 - DOCK.clr, x0 + k.w / 2 + DOCK.clr, k.yFloor, k.yFace + 1, k.zF - 1, k.zP + k.t / 2 + DOCK.clr),     // plug head, open at the front
      box(x0 - k.cable / 2 - 0.25, x0 + k.cable / 2 + 0.25, k.yBot - 1, k.yFloor + 0.01, k.zF - 1, k.zP + k.cable / 2 + 0.25),  // cable slot, open at the front
    ];
    // screw holes; the clip prints back-down, so each gets a point toward the front (print up)
    for (const sx of [-1, 1]) {
      const x = x0 + sx * k.earX;
      cuts.push(cylY(x, k.earZ, k.yBot - 1, k.yBot + DOCK.earH + 1, 3.4));
      cuts.push(inter(teardropY(x, k.earZ, k.yBot - 1, k.yBot + DOCK.earH + 1, 3.4), box(x - 3, x + 3, k.yBot - 2, k.yBot + DOCK.earH + 2, k.earZ - 3, k.earZ)));
    }
    return sub(body, U(cuts));
  }
  function stopBand(c) {
    const d = derive(c), BIG = 2000;
    return mv(inter(frameFull(c, false), box(-BIG, BIG, -BIG, BIG, d.chZ1 - 0.05, d.fd + 1)), 0, 0, -d.fd);
  }
  function frameFull(c, withTongue) {
    const d = derive(c), fd = d.fd, lip = d.lip, { Sx, Sy, Cw, Ch, chW, chH, chZ1 } = d;
    const body = shellProfile(d, 0, fd);
    const cuts = [
      mv(rr(d.winW, d.winH, d.winR, -1, lip + 0.01), d.winC[0], d.winC[1]),
      rr(chW, chH, d.rSlot, lip, chZ1),
      box(-chW / 2, chW / 2, 0, Sy + 5, lip, chZ1),
      rr(Cw - 26, Ch - 26, 14, chZ1 - 0.01, fd + 1),
      box(-chW / 2, -(Cw / 2 - 35), -14, 14, chZ1 - 0.01, fd + 1),
      box(Cw / 2 - 35, chW / 2, -14, 14, chZ1 - 0.01, fd + 1),
      box(-14, 14, -chH / 2, -(Ch / 2 - 35), chZ1 - 0.01, fd + 1),
    ];
    if (!d.capless) cuts.push(
      box(TAB.x0 - 0.3, TAB.x1 + 0.3, Sy - 4, Sy + 1, chZ1, fd + 1),
      box(-TAB.x1 - 0.3, -TAB.x0 + 0.3, Sy - 4, Sy + 1, chZ1, fd + 1),
      T(T(scoopCS(d).extrude(fd - chZ1 + 1.01)).translate([0, 0, chZ1 - 0.01])));
    // the shell's slot walls stop at the shoulders; the cassette's band sits on them (the lip in front stays whole)
    if (d.capless) cuts.push(box(-3000, 3000, d.yS - 0.15, 3000, lip, chZ1 - 0.03));   // just past the bezel split so no zero-thickness film is left at the split
    if (c.led.on) {
      const L = c.led.inlet, ct = coverT(c);
      const yIn = -(Sy - d.ledSkin), yInner = -(Sy - d.ledSkin - d.ledW);
      const keep = box(-L / 2, L / 2, -Sy - 1, yInner + 2, -2, ct);           // bridge stays solid at the face
      const groove = sub(T(Manifold.union([ledRing(c, -1, d.ledDepth, 0), ledRing(c, -1, c.led.diffT, 1.0)])), keep);
      cuts.push(groove);
      cuts.push(box(-L / 2 + 1, L / 2 - 1, yIn, yInner, ct, fd + 1));           // pocket under the bridge, open to the back
      cuts.push(box(-12, 12, yInner - 0.01, -chH / 2 + 0.01, chZ1, fd + 1));    // joins the bottom wiring notch
    }
    if (d.hug) cuts.push(camNotch(d.notch, -1, lip + 0.01));   // camera notch in the lip
    if (d.dock) cuts.push(...dockCuts(c, d));
    cuts.push(seamGroove(d, -1, fd + 1));
    const I = insertSpec(c);
    if (!d.glue) for (const [x, y] of d.A) cuts.push(cylZ(x, y, fd - I.depth, fd + 1, I.hole));
    let out = sub(body, U(cuts));
    if (d.glue && withTongue) {
      const tongue = lapTongue(d, c, fd);
      out = add(out, d.capless ? tongue : sub(tongue, box(-TAB.x1 - 1, TAB.x1 + 1, 0, Sy + 5, fd - 1, fd + LAP.len + 1)));
    }
    return d.capless ? sub(out, dish(d)) : out;
  }

  // ------------------------------------------------------------ top cap
  function cap(c) {
    const d = derive(c), { Sy, Ch, chW, chZ1, tabLen } = d, lip = d.lip, fd = d.fd, k = 0.25;
    const yb = Ch / 2 + d.chanClr + k;
    const plug = inter(box(-chW / 2 + k, chW / 2 - k, yb, Sy + 2, lip + k, chZ1 - k), shellProfile(d, 0, fd));
    // fills the scoop above the cassette so the face reads clean with the cap on
    const fillerBack = inter(T(T(scoopCS(d, k).extrude(fd - chZ1)).translate([0, 0, chZ1 - k])), box(-SCOOP_W, SCOOP_W, yb, Sy + 2, chZ1 - k, fd));
    let m = add(plug, inter(fillerBack, shellProfile(d, 0, fd)),
      box(TAB.x0 + k, TAB.x1 - k, Sy - 4 + k, Sy, lip + k, fd + tabLen),
      box(-TAB.x1 + k, -TAB.x0 - k, Sy - 4 + k, Sy, lip + k, fd + tabLen));
    const cuts = [], FX = [-TAB.fx, TAB.fx];
    if (c.cap.lock === "screws") for (const x of FX) {
      const I = insertSpec(c);
      cuts.push(cylY(x, fd + 8, Sy - 5, Sy + 1, I.clr));
      cuts.push(cylY(x, fd + 8, Sy - 1.8, Sy + 1, I.head));
    }
    if (c.cap.lock === "magnets") for (const x of FX) cuts.push(cylY(x, fd + 8, Sy - 4 + k - 0.01, Sy - 4 + k + 3.2, 6.3));
    if (c.cap.lock === "camlock") {
      // 16 mm cam lock with a D flat in the left tab (check against your lock)
      const lx = -TAB.fx;
      const D = inter(cylY(lx, fd + CAM_LOCK_Z, Sy - 5, Sy + 1, 16.2), box(lx - 8.2, lx + 8.2, Sy - 6, Sy + 2, fd + CAM_LOCK_Z - 7.3, fd + CAM_LOCK_Z + 8.2));
      cuts.push(D);
    }
    return sub(m, U(cuts));
  }

  function diffuser(c) {
    const d = derive(c), L = c.led.inlet;
    const ring = ledRing(c, 0, c.led.diffT, 0.7, 0.3);
    return c.led.on ? sub(ring, box(-L / 2 - 0.3, L / 2 + 0.3, -d.Sy - 1, -(d.Sy - d.ledSkin - d.ledW - 3), -1, c.led.diffT + 1)) : ring;
  }

  // ------------------------------------------------------------ rings
  function lugs(c, pts, z0, z1, wedge) {
    const d = derive(c), inner = d.innerX, out = [];
    for (const [x, y] of pts) {
      const s = x > 0 ? 1 : -1;
      const prof = wedge
        ? [[inner + 0.1, z1], [inner - 12, z1], [inner - 12, z0], [inner + 0.1, z0 - 12.1]]
        : [[inner + 0.1, z1], [inner - 12, z1], [inner - 12, z0], [inner + 0.1, z0]];
      const cs = T(CrossSection.ofPolygons([prof.map(([u, v]) => [s * u, v])], "NonZero"));
      out.push(T(T(T(cs.extrude(16, 0, 0, 1, true)).rotate([90, 0, 0])).translate([0, y, 0])));
    }
    return out;
  }

  // ring 1 and extension ring B: front lugs at A, rear lugs at B. Extension ring A is the mirror: front B, rear A.
  // Front lugs take the screw (clearance hole); rear lugs hold the heat-set insert (blind hole from the rear face).
  function ring(c, first, variantA = false, last = false) {
    const d = derive(c), D = first ? d.D1 : c.shell.ringD, { Sy, innerX, innerY } = d, I = insertSpec(c);
    const F = variantA ? d.B : d.A, Rr = variantA ? d.A : d.B;
    let body = sub(shellProfile(d, 0, D), rr(2 * innerX, 2 * innerY, d.R - d.wall, -1, D + 1));
    const adds = [], cuts = [];
    if (d.glue) {
      // fully glued shell: tongue at the rear, socket at the front, no lugs.
      // Ring 1 also carries the cassette stop (the frame's old back wall) on its front face.
      adds.push(lapTongue(d, c, D));
      if (first) { adds.push(stopBand(c)); cuts.push(lapSocket(d, c, d.chZ1 - 0.05 - d.fd)); }
      else cuts.push(lapSocket(d, c, 0));
    } else {
      adds.push(...lugs(c, F, 0, 6, false), ...lugs(c, Rr, D - I.lug, D, true));
      for (const [x, y] of F) cuts.push(cylZ(x, y, -1, 7, I.clr));
      for (const [x, y] of Rr) cuts.push(cylZ(x, y, D - I.depth, D + 1, I.hole));
    }
    if (first && d.capless) {
      // the finger dish continues back from the frame; a cradle underneath keeps it closed off from the inside
      adds.push(inter(mv(dish(d, d.cradle), 0, 0, -d.fd), box(-DISH.hw - 4, DISH.hw + 4, innerY - 30, innerY + 0.5, (d.glue ? d.chZ1 - d.fd : 0) + 0.01, D - 0.01)));
      adds.push(box(-45, 45, -innerY - 0.1, -innerY + 9, d.glue ? d.chZ1 - 0.05 - d.fd : 0, D - 6));   // runs down to the print bed
      cuts.push(mv(dish(d), 0, 0, -d.fd));
      for (const [x, z] of d.baseScrews) {
        cuts.push(cylY(x, z, -Sy - 1, -innerY + 10, I.clr));
        cuts.push(cylY(x, z, -innerY + 9 - I.head_h, -innerY + 10, I.head + 0.2));
      }
      const cx = cableX(c);
      cuts.push(cylY(cx, d.hubZc, -Sy - 1, -innerY + 10, PUCK.cable + 1), teardropY(cx, d.hubZc, -Sy - 1, -innerY + 10, PUCK.cable + 1));
    } else if (first) {
      const FX = [-TAB.fx, TAB.fx];
      adds.push(box(-TAB.x1 - 3, TAB.x1 + 3, innerY - 9, innerY + 0.1, 0, 20));
      adds.push(box(-45, 45, -innerY - 0.1, -innerY + 9, 6, D - 6));
      cuts.push(box(TAB.x0 - 0.3, TAB.x1 + 0.3, Sy - 4, Sy + 1, -1, d.tabLen + 0.25));
      cuts.push(box(-TAB.x1 - 0.3, -TAB.x0 + 0.3, Sy - 4, Sy + 1, -1, d.tabLen + 0.25));
      // finger well behind the cassette's top edge (continues the frame scoop)
      cuts.push(T(T(scoopCS(d).extrude(15)).translate([0, 0, -1])));
      // rounded-rectangle pocket running back from the slot between the cap tabs, closed underneath by a cradle
      const P = POCKET, cy = Sy - P.depth + P.r;
      const hullAt = (r, lift = 0) => T(Manifold.hull([-1, 1].flatMap((sx) => [-P.r, P.len - P.r].flatMap((z) =>
        [0, 20 + lift].map((up) => T(T(Manifold.sphere(r, 32)).translate([sx * (P.hw - P.r), cy + up, z])))))));
      adds.push(inter(hullAt(P.r + 2.5), box(-P.hw - 3, P.hw + 3, innerY - 25, innerY + 0.5, 14, D - 0.01)));
      cuts.push(inter(hullAt(P.r), box(-P.hw - 1, P.hw + 1, innerY - 25, Sy + 30, -P.r - 1, D - 0.01)));
      for (const x of FX) {
        if (c.cap.lock === "screws") cuts.push(cylY(x, 8, Sy - 4 - I.depth, Sy, I.hole));
        if (c.cap.lock === "magnets") cuts.push(cylY(x, 8, Sy - 4 - 3.2, Sy - 3.99, 6.3));
      }
      for (const [x, z] of d.baseScrews) {
        cuts.push(cylY(x, z, -Sy - 1, -innerY + 10, I.clr));
        cuts.push(cylY(x, z, -innerY + 9 - I.head_h, -innerY + 10, I.head + 0.2));
      }
      if (c.cap.lock === "camlock") cuts.push(cylY(-TAB.fx, CAM_LOCK_Z, Sy - 6, Sy + 1, 18));
      cuts.push(cylY(0, d.hubZc, -Sy - 1, -innerY + 10, PUCK.cable + 1));
    }
    body = add(body, U(adds));
    cuts.push(seamGroove(d, (d.glue && first ? d.chZ1 - 0.05 - d.fd : 0) - 1, D + LAP.len + 1));
    return sub(body, U(cuts));
  }

  // ------------------------------------------------------------ wall mount
  // wall case: ring 1's front (cassette stop, socket for the frame's tongue, finger dish and cradle), cut short, with a cable
  // notch in the bottom wall at the back. The wall plate glues onto its tongue like the back panel.
  function wallCase(c) {
    const d = derive(c), D = d.wallD, { Sy, innerX, innerY } = d;
    let body = sub(shellProfile(d, 0, D), rr(2 * innerX, 2 * innerY, d.R - d.wall, -1, D + 1));
    const front = d.chZ1 - 0.05 - d.fd, adds = [lapTongue(d, c, D), stopBand(c)], cuts = [lapSocket(d, c, front)];
    if (d.capless) {
      adds.push(inter(mv(dish(d, d.cradle), 0, 0, -d.fd), box(-DISH.hw - 4, DISH.hw + 4, innerY - 30, innerY + 0.5, front + 0.05 + 0.01, D - 0.01)));
      cuts.push(mv(dish(d), 0, 0, -d.fd));
    }
    cuts.push(box(-8, 8, -Sy - 1, -innerY + 1, D - 12, D + LAP.len + 1));     // cable out of the bottom, close to the wall
    body = add(body, U(adds));
    cuts.push(seamGroove(d, front - 1, D + LAP.len + 1));
    return sub(body, U(cuts));
  }
  // wall plate: the back panel's groove, no threads, two keyholes (head pocket from the inside, KEY.lip left at the wall face)
  // and a hole for a cable coming out of the wall
  function wallBack(c) {
    const d = derive(c), t = d.backT;
    const body = sub(shellProfile(d, 0, t), band(d, c, d.lapA - LAP.clr, d.lapA + d.lapT + LAP.clr, -1, LAP.depth));
    const cuts = [cylZ(0, d.wallHoleY, -1, t + 1, 22)];
    for (const [x, y] of d.keyholes) {
      cuts.push(cylZ(x, y, -1, t + 1, KEY.head));
      cuts.push(box(x - KEY.slot / 2, x + KEY.slot / 2, y, y + KEY.len, -1, t + 1), cylZ(x, y + KEY.len, -1, t + 1, KEY.slot));
      cuts.push(box(x - KEY.head / 2, x + KEY.head / 2, y, y + KEY.len, -1, t - KEY.lip), cylZ(x, y + KEY.len, -1, t - KEY.lip, KEY.head));
    }
    return sub(body, U(cuts));
  }
  // thread test coupon: one back-panel hole in a small plate, to check against your Thread Boards screws before the full panel
  function threadTest(c, pv) {
    const t = derive(c).backT, b = c.back, w = Math.max(30, b.d + 16);
    const hole = b.mode === "threaded" && !pv ? T(thread(b.d, b.pitch, t + 2, b.clr).translate([0, 0, -1])) : cylZ(0, 0, -1, t + 1, b.d + b.clr * 2);
    return sub(rr(w, w, 4, 0, t), hole, box(w / 2 - 4, w / 2 + 1, -2, 2, t - 1, t + 1));
  }

  // ------------------------------------------------------------ post mount
  // the cable hole in ring 1 and the post cap: centred for a hollow pole (cable runs inside it), beside the sleeve for a solid one
  // post cap: disc on the base screws, sleeve with a blind bore (pole stops against the disc), rib with an M5 insert for the
  // thumb screw at the back. Prints top-down: disc on the bed, sleeve and rib straight up.
  function postCap(c) {
    const d = derive(c), S = d.post, yT = -d.Sy - 0.05, zc = d.hubZc, ch = POST.ch, seg = 128;
    const cyl = (y0, y1, r0, r1) => T(T(T(Manifold.cylinder(y1 - y0, r0, r1, seg)).rotate([-90, 0, 0])).translate([0, y0, zc]));
    const yD = yT - POST.disc, yB = yD - S.depth, F = POST.fillet;
    const body = U([cyl(yD, yT - ch, S.R, S.R), cyl(yT - ch, yT, S.R, S.R - ch), cyl(yB, yB + ch, S.rS - ch, S.rS), cyl(yB + ch - 0.01, yD + 0.01, S.rS, S.rS),
      cyl(yD - F, yD + 0.01, S.rS, S.rS + F), box(-POST.rib, POST.rib, yB, yD + 0.01, zc + S.rS - 2, zc + S.rS + POST.rib)]);
    const ys = yB + 15, zo = zc + S.rS + POST.rib;
    const cuts = [cyl(yB - 1, yD, S.rB, S.rB), cyl(yB - 1, yB + 1.2, S.rB + 1.2, S.rB),
      T(T(Manifold.cylinder(10.5, 3.2, 3.2, 32)).translate([0, ys, zo - 10.5 + 0.01])),             // M5 insert, 9.5 mm
      T(T(Manifold.cylinder(zo - zc, 2.75, 2.75, 32)).translate([0, ys, zc])),                         // screw clearance to the bore
      inter(T(T(T(Manifold.cube([6.4, 6.4, zo - zc + 1], true)).rotate([0, 0, 45])).translate([0, ys, (zc + zo) / 2])), box(-5, 5, ys - 5, ys, zc, zo + 1))];   // print-up point (world -y)
    const I = insertSpec(c);
    for (const [x, z] of d.baseScrews) cuts.push(cylY(x, z, yT - I.depth, yT + 1, I.hole));
    cuts.push(cylY(cableX(c), zc, (S.hollow ? yD : yB) - 1, yT + 1, PUCK.cable));
    return sub(body, U(cuts));
  }
  // floor flange (local: y = 0 on the wood base): disc with four countersunk #8 / 4 mm wood screws, collar for the pole's foot,
  // M5 thumb screw at the back; a hollow pole's cable drops through the centre and out of a channel under the disc
  function flange(c) {
    const S = flangeSpec(c), ch = 1.2, seg = 128, yTop = FLANGE.disc + FLANGE.collar;
    const cyl = (y0, y1, r0, r1) => T(T(T(Manifold.cylinder(y1 - y0, r0, r1, seg)).rotate([-90, 0, 0])).translate([0, y0, 0]));
    const body = U([cyl(0, FLANGE.disc - ch, S.R, S.R), cyl(FLANGE.disc - ch - 0.01, FLANGE.disc, S.R, S.R - ch), cyl(0, yTop - ch, S.rC, S.rC), cyl(yTop - ch - 0.01, yTop, S.rC, S.rC - ch),
      cyl(FLANGE.disc - 0.01, FLANGE.disc + 5, S.rC + 5, S.rC), box(-POST.rib, POST.rib, 0, yTop - 6, S.rC - 2, S.rC + POST.rib)]);
    const ys = yTop - 14, zo = S.rC + POST.rib;
    const cuts = [cyl(FLANGE.floor, yTop + 1, S.rB, S.rB), cyl(yTop - 1.2, yTop + 0.01, S.rB, S.rB + 1.2),
      T(T(Manifold.cylinder(10.5, 3.2, 3.2, 32)).translate([0, ys, zo - 10.5 + 0.01])),
      T(T(Manifold.cylinder(zo, 2.75, 2.75, 32)).translate([0, ys, 0])),
      inter(T(T(T(Manifold.cube([6.4, 6.4, zo + 1], true)).rotate([0, 0, 45])).translate([0, ys, zo / 2])), box(-5, 5, ys, ys + 5, 0, zo + 1))];   // print-up point (+y)
    for (const a of [45, 135, 225, 315]) {
      const x = S.screwR * Math.cos((a * Math.PI) / 180), z = S.screwR * Math.sin((a * Math.PI) / 180);
      cuts.push(T(T(T(Manifold.cylinder(FLANGE.disc + 2, 2.4, 2.4, 32)).rotate([-90, 0, 0])).translate([x, -1, z])));
      cuts.push(T(T(T(Manifold.cylinder(2.6, 2.4, 5, 32)).rotate([-90, 0, 0])).translate([x, FLANGE.disc - 2.6 + 0.01, z])));   // 90-degree countersink
    }
    if (S.hollow) cuts.push(cyl(-1, FLANGE.floor + 1, 6, 6), box(-5, 5, -1, 5, 0, S.R + 1));   // cable out under the disc, toward the back
    return sub(body, U(cuts));
  }

  // ------------------------------------------------------------ back panel
  function backHoles(c) {
    const d = derive(c), b = c.back, g = b.grid;
    const limX = d.innerX - 3 - b.d / 2 - 2.5, limY = d.innerY - 3 - b.d / 2 - 2.5;
    const nx = Math.floor(limX / g), ny = Math.floor(limY / g);
    const rc = Math.max(1, d.R - d.wall - 3);
    const all = [];
    for (let j = ny; j >= -ny; j--) for (let i = -nx; i <= nx; i++) {
      const x = i * g, y = j * g;
      let ok = true;
      const cx = Math.abs(x) - (limX - rc + b.d / 2), cy = Math.abs(y) - (limY - rc + b.d / 2);
      if (cx > 0 && cy > 0 && Math.hypot(cx, cy) > rc - b.d / 2) ok = false;
      if (c.shell.join === "screws") for (const [px, py] of [...d.A, ...d.B]) if (Math.hypot(x - px, y - py) < 11 + b.d / 2 + 1) ok = false;
      all.push({ i, j, x, y, ok });
    }
    const on = b.cells ? new Set(b.cells.map(([i, j]) => `${i},${j}`)) : null;
    for (const h of all) h.on = h.ok && (on ? on.has(`${h.i},${h.j}`) : true);
    return { nx, ny, all };
  }

  function back(c, pv) {
    const d = derive(c), t = d.backT, rI = d.R - d.wall;
    let body = shellProfile(d, 0, t);
    if (d.glue) body = sub(body, band(d, c, d.lapA - LAP.clr, d.lapA + d.lapT + LAP.clr, -1, LAP.depth));      // groove takes the last ring's tongue
    else body = add(body, sub(rr(2 * d.innerX - 0.6, 2 * d.innerY - 0.6, rI - 0.3, -2.5, 0), rr(2 * d.innerX - 6, 2 * d.innerY - 6, Math.max(1, rI - 3), -3, 0.1)));
    const cuts = [];
    if (!d.glue) for (const [x, y] of [...d.A, ...d.B]) {
      const I = insertSpec(c);
      cuts.push(cylZ(x, y, -3, t + 1, I.clr));
      cuts.push(cylZ(x, y, t - I.head_h, t + 1, I.head + 0.2));
      cuts.push(cylZ(x, y, -3.5, 0.01, 22));
    }
    if (c.back.mode !== "none") for (const h of backHoles(c).all) {
      if (!h.on) continue;
      if (c.back.mode === "threaded" && !pv) cuts.push(T(thread(c.back.d, c.back.pitch, t + 2, c.back.clr).translate([h.x, h.y, -1])));
      else cuts.push(cylZ(h.x, h.y, -1, t + 1, c.back.d + c.back.clr * 2));
    }
    return sub(body, U(cuts));
  }

  // ------------------------------------------------------------ hub + ferrule
  function legAxes(c) {
    const th = (c.legs.splay * Math.PI) / 180;
    return [90, 210, 330].map((az) => {
      const a = (az * Math.PI) / 180;
      return { az: a, v: [Math.sin(th) * Math.cos(a), -Math.cos(th), Math.sin(th) * Math.sin(a)] };
    });
  }
  // bent style: one lofted pedestal under the head; it narrows smoothly into three tubes that drop, bend, then run at the leg angle
  function bentFrame(c) {
    const d = derive(c), bossR = d.baseBossR, rc = BASE.rc;
    const yQ = -d.Sy - BASE.H;   // tubes leave the plate here
    return legAxes(c).map(({ az, v }) => {
      const out = [Math.cos(az), 0, Math.sin(az)];
      const Q = [rc * out[0], yQ + 0.5, d.hubZc + rc * out[2]];
      const hh = BASE.drop * Math.tan((c.legs.splay * Math.PI) / 180) * BASE.hh;
      const S = [Q[0] + out[0] * hh, Q[1] - BASE.drop, Q[2] + out[2] * hh];
      return { v, Q, S, bossR };
    });
  }
  // loft from a rounded rectangle (front face to the back of ring 1) down to the hull of the three tube tops.
  // Each slice is the Minkowski blend of the two shapes (built from their support functions), eased with a smoothstep
  // so the walls leave the head vertically and arrive at the tubes vertically: no lip, no seam.
  function pedestal(c, frames) {
    const d = derive(c), bossR = d.baseBossR;
    const zf = -d.fd + 0.3, zb = d.D1 - 0.3, Dz = zb - zf, zc = (zf + zb) / 2;
    const W = Math.min(2 * (d.Sx - d.R) - 8, Math.max(110, 2 * (BASE.rc + bossR) + 40));
    const r = Math.max(4, Math.min(18, Dz / 2 - 1, W / 2 - 1)), a = W / 2 - r, b = Dz / 2 - r;
    const Q = frames.map((f) => [f.Q[0], f.Q[2]]);
    const hTop = (ux, uz) => a * Math.abs(ux) + b * Math.abs(uz) + r + zc * uz;
    const hBot = (ux, uz) => Math.max(...Q.map(([x, z]) => x * ux + z * uz)) + bossR;
    const M = 96, yTop = -d.Sy - 0.05, yBot = frames[0].Q[1];
    const slice = (e, y) => {
      const lines = [];
      for (let k = 0; k < M; k++) {
        const th = (2 * Math.PI * k) / M, ux = Math.cos(th), uz = Math.sin(th);
        lines.push([ux, uz, (1 - e) * hTop(ux, uz) + e * hBot(ux, uz)]);
      }
      const pts = [];
      for (let k = 0; k < M; k++) {
        const [a1, b1, c1] = lines[k], [a2, b2, c2] = lines[(k + 1) % M], det = a1 * b2 - a2 * b1;
        pts.push([(c1 * b2 - c2 * b1) / det, y, (a1 * c2 - a2 * c1) / det]);
      }
      return pts;
    };
    const N = 12, rings = [];
    for (let i = 0; i <= N; i++) { const t = i / N, e = t * t * (3 - 2 * t); rings.push(slice(e, yTop + (yBot - yTop) * t)); }
    const parts = [];
    for (let i = 0; i < N; i++) parts.push(T(Manifold.hull([...rings[i], ...rings[i + 1]])));
    return parts;
  }
  function sockets(c) {
    const d = derive(c);
    if (c.legs.style === "bent") return bentFrame(c).map(({ v, S }) => ({ v, o: S }));
    if (c.legs.style === "puck") return puckFrames(c).map(({ v, o }) => ({ v, o }));
    const r = c.legs.circle || 40;
    return legAxes(c).map(({ az, v }) => ({ v, o: [r * Math.cos(az), -d.Sy - 30, d.hubZc + r * Math.sin(az)] }));
  }
  // one smooth piece: signed-distance model, meshed with the kernel's level-set mesher.
  // Plate and tubes are smooth-unioned, so every junction (plate to neck, tube to tube) is a fillet with no edges.
  function bentHub(c, pv) {
    const d = derive(c), Sy = d.Sy, D = d.D1, frames = bentFrame(c), bossR = d.baseBossR;
    const [z0, z1] = d.plateZ, zc = (z0 + z1) / 2, Dz = z1 - z0;
    const W = Math.min(2 * (d.Sx - d.R) - 8, 2 * (BASE.rc + bossR) + 34);
    const yTop = -Sy - 0.05, up = 12;
    const pc = [0, -Sy - BASE.tS / 2 + up / 2, zc], ph = [W / 2, (BASE.tS + up) / 2, Dz / 2], pr = Math.min(9, Dz / 2 - 1);
    const sdBox = (x, y, z) => {
      const qx = Math.abs(x - pc[0]) - (ph[0] - pr - BASE.bulge), qy = Math.abs(y - pc[1]) - (ph[1] - pr), qz = Math.abs(z - pc[2]) - (ph[2] - pr - BASE.bulge);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - pr;
    };
    // tube centrelines: a short rise into the plate, the bezier bend, then the straight socket (flat-ended)
    const segsL = [], caps = [];
    for (const { Q, S, v } of frames) {
      const k = BASE.drop * BASE.bendK;
      const P1 = [Q[0], Q[1] - k, Q[2]], P2 = S.map((x, i) => x - v[i] * k);
      const bez = (t) => [0, 1, 2].map((i) => (1 - t) ** 3 * Q[i] + 3 * (1 - t) ** 2 * t * P1[i] + 3 * (1 - t) * t ** 2 * P2[i] + t ** 3 * S[i]);
      const pts = [[Q[0], yTop + 2, Q[2]]];
      for (let i = 0; i <= 16; i++) pts.push(bez(i / 16));
      for (let i = 0; i < pts.length - 1; i++) segsL.push([pts[i], pts[i + 1]]);
      caps.push([S, S.map((x, i) => x + v[i] * (d.seat + 26))]);
    }
    const dSeg = (p, a, b) => {
      const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const h = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2)));
      return Math.hypot(pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h);
    };
    const dCapped = (p, a, b, r) => {   // flat-ended cylinder
      const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const baba = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2, paba = pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2];
      const x = Math.hypot(pa[0] * baba - ba[0] * paba, pa[1] * baba - ba[1] * paba, pa[2] * baba - ba[2] * paba) - r * baba;
      const y = Math.abs(paba - baba * 0.5) - baba * 0.5, x2 = x * x, y2 = y * y * baba;
      const dd = Math.max(x, y) < 0 ? -Math.min(x2, y2) : (x > 0 ? x2 : 0) + (y > 0 ? y2 : 0);
      return Math.sign(dd) * Math.sqrt(Math.abs(dd)) / baba;
    };
    const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
    const tubeD = (p, i) => {
      let m = Infinity;
      for (let j = i * 17; j < (i + 1) * 17; j++) m = Math.min(m, dSeg(p, segsL[j][0], segsL[j][1]));
      return Math.min(m - bossR, dCapped(p, caps[i][0], caps[i][1], bossR));
    };
    const sdf = ([x, y, z]) => {
      const p = [x, y, z];
      let t = tubeD(p, 0);
      for (let i = 1; i < frames.length; i++) t = smin(t, tubeD(p, i), BASE.kTubes);
      const body = smin(sdBox(x, y, z), t, BASE.kPlate);
      return -Math.max(body, y - yTop);   // flat top against the shell; kernel wants positive inside
    };
    // bounds from every centreline point
    const all = [...segsL.flat(), ...caps.flat()];
    const lo = [0, 1, 2].map((i) => Math.min(...all.map((q) => q[i])) - bossR - 3), hi = [0, 1, 2].map((i) => Math.max(...all.map((q) => q[i])) + bossR + 3);
    lo[0] = Math.min(lo[0], -W / 2 - 2); hi[0] = Math.max(hi[0], W / 2 + 2); lo[2] = Math.min(lo[2], z0 - 2); hi[2] = Math.max(hi[2], z1 + 2); hi[1] = yTop + 1;
    const body = T(Manifold.levelSet(sdf, { min: lo, max: hi }, pv ? 2.2 : 1.35));
    const cuts = [];
    for (const { S, v } of frames) {
      const cutter = pv ? T(Manifold.cylinder(40, d.thrMajor / 2, d.thrMajor / 2, 64)) : thread(d.thrMajor, d.thrPitch, 40, c.legs.threadClr / 2);
      cuts.push(along(T(cutter.translate([0, 0, d.seat - 6])), v, S));
    }
    const I = insertSpec(c);
    for (const [x, z] of d.baseScrews) cuts.push(cylY(x, z, -Sy - I.depth, -Sy + 1, I.hole));
    return sub(body, U(cuts));
  }
  // drum frames: B = bore centre on the underside, seat = ferrule shoulder (square to the leg), o = socket origin (seat - 56 along the leg)
  function puckFrames(c) {
    const d = derive(c), P = d.puck, yB = -d.Sy - 0.05 - P.H;
    return legAxes(c).map(({ az, v }) => {
      const B = [P.rb * Math.cos(az), yB, d.hubZc + P.rb * Math.sin(az)], F = ferSpec(c);
      const seat = B.map((x, i) => x - v[i] * P.cb);              // where the ferrule's cone meets its cup
      return { v, B, seat, o: seat.map((x, i) => x - v[i] * (d.seat + F.tl + F.hc)) };
    });
  }
  function puckHub(c, pv) {
    const d = derive(c), P = d.puck, yT = -d.Sy - 0.05, yB = yT - P.H, zc = d.hubZc, ch = PUCK.ch;
    const seg = 128;
    const cyl = (y0, y1, r0, r1) => T(T(T(Manifold.cylinder(y1 - y0, r0, r1, seg)).rotate([-90, 0, 0])).translate([0, y0, zc]));
    const body = U([cyl(yB, yB + ch, P.R - ch, P.R), cyl(yB + ch - 0.01, yT - ch + 0.01, P.R, P.R), cyl(yT - ch, yT, P.R, P.R - ch)]);
    const cuts = [];
    for (const f of puckFrames(c)) {
      const F = ferSpec(c), top = f.seat.map((x, i) => x - f.v[i] * F.hc);
      cuts.push(along(T(Manifold.cylinder(60, P.rcb, P.rcb, segs(2 * P.rcb))), f.v, f.seat));
      cuts.push(along(T(Manifold.cylinder(F.hc + 0.01, P.rcb - (F.rC - F.rS), P.rcb, segs(2 * P.rcb))), f.v, top));   // conical seat
      const cutter = pv ? T(Manifold.cylinder(40, d.thrMajor / 2, d.thrMajor / 2, 64)) : thread(d.thrMajor, d.thrPitch, 40, c.legs.threadClr / 2);
      cuts.push(along(T(cutter.translate([0, 0, d.seat - PUCK.relief])), f.v, f.o));
    }
    const I = insertSpec(c);
    for (const [x, z] of d.baseScrews) cuts.push(cylY(x, z, yT - I.depth, yT + 1, I.hole));
    cuts.push(cylY(0, zc, yB - 1, yT + 1, PUCK.cable));
    return sub(body, U(cuts));
  }
  function hub(c, pv) {
    if (c.legs.style === "puck") return puckHub(c, pv);
    if (c.legs.style === "bent") return bentHub(c, pv);
    const d = derive(c), Sy = d.Sy, zc = d.hubZc, D = d.D1;
    const bossD = d.thrMajor + 2 * c.legs.threadClr + 14;
    // mounting disc, trimmed to sit 2 mm inside the shell's footprint (hub coords are ring-1 local: z = 0 at the frame's rear face)
    const headDepth = d.fd + D + c.shell.ringD * c.shell.nExt + d.backT;
    const zFront = 2 - d.fd, zBack = headDepth - 2 - d.fd;
    let body = inter(cylY(0, zc, -Sy - 30, -Sy, 140), T(T(rrCS(2 * d.Sx - 4, zBack - zFront, Math.max(2, d.R - 2)).extrude(30)).rotate([90, 0, 0])).translate([0, -Sy, (zFront + zBack) / 2]));
    const adds = [], cuts = [], tops = [];
    for (const s of sockets(c)) {
      adds.push(along(T(Manifold.cylinder(d.seat + 26, bossD / 2, bossD / 2, segs(bossD))), s.v, s.o));
      tops.push(along(T(Manifold.cylinder(24, bossD / 2, bossD / 2, segs(bossD))), s.v, s.o));
      const cutter = pv ? T(Manifold.cylinder(40, d.thrMajor / 2, d.thrMajor / 2, 64)) : thread(d.thrMajor, d.thrPitch, 40, c.legs.threadClr / 2);
      cuts.push(along(T(cutter.translate([0, 0, d.seat - 6])), s.v, s.o));
    }
    // blend: one smooth pedestal wrapping the disc and the top of each leg socket
    if (c.legs.blend) body = T(Manifold.hull([body, ...tops]));
    body = add(body, U(adds));
    const I = insertSpec(c);
    for (const [x, z] of d.baseScrews) cuts.push(cylY(x, z, -Sy - I.depth, -Sy + 1, I.hole));
    cuts.push(cylY(0, zc, -Sy - 80, -Sy + 1, 13));
    return sub(body, U(cuts));
  }
  function ferrule(c, pv) {
    const d = derive(c), F = ferSpec(c), tl = F.tl, cup = F.cup, dw = c.legs.dowel, z1 = tl + F.hc;
    let m = pv ? cylZ(0, 0, 0, tl, d.thrMajor - 1.2) : thread(d.thrMajor, d.thrPitch, tl, 0);
    m = add(m, T(T(Manifold.cylinder(F.hc + 0.02, F.rS - 0.6, F.rC, segs(2 * F.rC))).translate([0, 0, tl - 0.01])), cylZ(0, 0, z1, z1 + cup, 2 * F.rC));
    return sub(m, cylZ(0, 0, z1, z1 + cup + 1, dw + 0.8), cylX(0, z1 + 20, -dw, dw, 5.2), cylZ(0, 0, -1, tl + 1, 12));
  }

  const BUILDERS = {
    cassette, cassKey, frame, cap, diffuser, back, hub, ferrule, wallCase, wallBack, postCap, flange, dockClip, threadTest,
    ring1: (c) => ring(c, true),
    ringExt: (c) => ring(c, false, c.shell.join === "screws"),
    ringExt2: (c) => ring(c, false, false),
    ringExtLast: (c) => ring(c, false, false, true),
  };
  // every derived dimension that shapes a part; parts rebuild whenever any of these change
  const dims = (c) => { const d = derive(c); return [d.Cw, d.Ch, d.Sw, d.Sh, d.R, d.fd, d.lip, d.chZ1, d.cassZ, d.cassT, d.capless, d.glue, d.D1,
    d.wall, d.lapT, d.lapA, d.backT, d.cradle, d.ledDepth, d.ledSkin, d.ledW, d.seamX, d.mount, d.wallD, d.dock, d.hubZc, cableX(c)]; };
  const KEYS = {
    cassette: (c) => [c.tablet, c.orientation, c.camSide, c.fit, c.fitMode, c.cass, c.shell, c.led, c.cap, derive(c).Cw, derive(c).lip, derive(c).dock, derive(c).Ch],
    cassKey: (c) => [c.tablet, c.orientation, c.fit, c.fitMode, c.cass, c.shell, c.led, c.cap, derive(c).lip],
    frame: (c) => [dims(c), c.fitMode, c.cass, c.shell, c.led, c.inserts, c.cap, c.fitMode === "hug" ? [c.tablet, c.orientation, c.camSide, c.fit] : 0],
    cap: (c) => [dims(c), c.fitMode, c.cass, c.tablet.t, c.shell, c.cap, c.inserts],
    diffuser: (c) => [dims(c), c.shell.cornerR, c.led],
    ring1: (c) => [dims(c), c.shell, c.cap, c.inserts, c.led, c.cass, c.fitMode, c.tablet, c.orientation, c.camSide, c.fit],
    ringExt: (c) => [dims(c), c.shell, c.inserts],
    ringExt2: (c) => [dims(c), c.shell, c.inserts],
    ringExtLast: (c) => [dims(c), c.shell, c.inserts],
    back: (c) => [dims(c), c.shell, c.back, c.inserts],
    hub: (c) => [dims(c), c.shell, c.legs, c.inserts, derive(c).backT, derive(c).fd],
    ferrule: (c) => [c.legs.dowel, c.legs.threadClr],
    wallCase: (c) => [dims(c), c.shell, c.led, c.cass, c.fitMode, c.tablet, c.orientation, c.camSide, c.fit, c.dock],
    wallBack: (c) => [dims(c), c.shell],
    postCap: (c) => [dims(c), derive(c).post, c.inserts],
    flange: (c) => [flangeSpec(c)],
    dockClip: (c) => [derive(c).dock, derive(c).lip],
    threadTest: (c) => [c.back, derive(c).backT],
  };
  // the cassette prints back-down: its back ledge is then on the bed and the pocket opens upward
  // (hug tray only; the universal cassette prints face-down so the visible mask gets the bed finish, with supports under its back ledge)
  const printRot = (name, c) => (name === "cassette" && c.fitMode === "hug" ? [180, 0, 0] : SEAM_REAR.has(name) ? [0, 0, 180] : PRINT_ROT[name]);
  const PRINT_ROT = { cap: [-90, 0, 0], back: [180, 0, 0], hub: [-90, 0, 0], wallBack: [180, 0, 0], postCap: [-90, 0, 0], flange: [90, 0, 0], dockClip: [180, 0, 0] };
  // frame and rings print with the booth's underside (and its seam groove) toward the back of the bed, where seam "Rear" puts it

  function toMesh(m) {
    const mesh = m.getMesh();
    const np = mesh.numProp, vp = mesh.vertProperties, n = vp.length / np;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[3 * i] = vp[np * i]; pos[3 * i + 1] = vp[np * i + 1]; pos[3 * i + 2] = vp[np * i + 2]; }
    const bb = m.boundingBox();
    return { pos, idx: new Uint32Array(mesh.triVerts), vol: m.volume(), bbox: [bb.min, bb.max], tris: m.numTri() };
  }
  function stl(m, name) {
    const mesh = m.getMesh(), np = mesh.numProp, vp = mesh.vertProperties, tv = mesh.triVerts;
    const nt = tv.length / 3, buf = new ArrayBuffer(84 + nt * 50), dv = new DataView(buf);
    const hdr = `cassette booth: ${name}`.slice(0, 79);
    for (let i = 0; i < hdr.length; i++) dv.setUint8(i, hdr.charCodeAt(i));
    dv.setUint32(80, nt, true);
    let o = 84;
    for (let t = 0; t < nt; t++) {
      const a = tv[3 * t] * np, b = tv[3 * t + 1] * np, cc = tv[3 * t + 2] * np;
      const ux = vp[b] - vp[a], uy = vp[b + 1] - vp[a + 1], uz = vp[b + 2] - vp[a + 2];
      const wx = vp[cc] - vp[a], wy = vp[cc + 1] - vp[a + 1], wz = vp[cc + 2] - vp[a + 2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
      for (const k of [a, b, cc]) { dv.setFloat32(o, vp[k], true); dv.setFloat32(o + 4, vp[k + 1], true); dv.setFloat32(o + 8, vp[k + 2], true); o += 12; }
      dv.setUint16(o, 0, true); o += 2;
    }
    return buf;
  }

  const cache = new Map();
  function build(name, c, pv = true) {
    const key = name + pv + JSON.stringify(KEYS[name](c));
    if (cache.has(key)) return cache.get(key);
    const out = toMesh(BUILDERS[name](c, pv));
    flush();
    if (cache.size > 48) cache.delete(cache.keys().next().value);
    cache.set(key, out);
    return out;
  }
  function exportSTL(name, c) {
    let m = BUILDERS[name](c, false);
    { const r = printRot(name, c); if (r) m = T(m.rotate(r)); }
    const bb = m.boundingBox();
    m = T(m.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]]));
    const buf = stl(m, name), bb2 = m.boundingBox();
    const size = [0, 1, 2].map((i) => bb2.max[i] - bb2.min[i]);
    // indexed mesh too, for the 3MF projects
    const mesh = m.getMesh(), np = mesh.numProp, vp = mesh.vertProperties, nv = vp.length / np;
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) { pos[3 * i] = vp[i * np]; pos[3 * i + 1] = vp[i * np + 1]; pos[3 * i + 2] = vp[i * np + 2]; }
    const idx = new Uint32Array(mesh.triVerts);
    flush();
    return { buf, size, pos, idx };
  }
  const raw = (name, c) => BUILDERS[name](c, true);
  // full-detail part in its print orientation, sitting on z = 0 (for checks; caller flushes)
  const printed = (name, c) => {
    let m = BUILDERS[name](c, false);
    { const r = printRot(name, c); if (r) m = T(m.rotate(r)); }
    const bb = m.boundingBox();
    return T(m.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]]));
  };
  // for checks: each leg socket's full cut envelope (counterbore + cone + thread bore as a plain cylinder) and the drum body
  const puckDebug = (c) => {
    const d = derive(c), P = d.puck, yT = -d.Sy - 0.05, yB = yT - P.H, F = ferSpec(c);
    const drum = T(T(T(Manifold.cylinder(P.H, P.R, P.R, 128)).rotate([-90, 0, 0])).translate([0, yB, d.hubZc]));
    const socks = puckFrames(c).map((f) => {
      const top = f.seat.map((x, i) => x - f.v[i] * F.hc);
      return U([along(T(Manifold.cylinder(60, P.rcb, P.rcb, 96)), f.v, f.seat),
        along(T(Manifold.cylinder(F.hc + 0.01, P.rcb - (F.rC - F.rS), P.rcb, 96)), f.v, top),
        along(T(T(Manifold.cylinder(40, d.thrMajor / 2 + 0.4, d.thrMajor / 2 + 0.4, 96)).translate([0, 0, d.seat - PUCK.relief])), f.v, f.o)]);
    });
    const I = insertSpec(c);
    const holes = [...d.baseScrews.map(([x, z]) => cylY(x, z, yT - I.depth, yT + 1, I.hole)), cylY(0, d.hubZc, yB - 1, yT + 1, PUCK.cable)];
    return { drum, socks, holes };
  };
  return { raw, printed, puckDebug, CrossSection, Manifold, flush, build, exportSTL, backHoles: (c) => { const r = backHoles(c); flush(); return r; }, sockets };
}

// ---------------------------------------------------------------- layout + numbers (pure)
export function assembly(c) {
  const d = derive(c), fd = d.fd, D = c.shell.ringD, D1 = d.D1;
  const items = [
    { part: "cassette", pos: [0, -d.chanClr, d.cassZ] },
    ...(d.capless && !d.hug ? [{ part: "cassKey", pos: [0, -d.chanClr, d.cassZ] }] : []),
    { part: "frame", pos: [0, 0, 0] },
    ...(d.capless ? [] : [{ part: "cap", pos: [0, 0, 0] }]),
    { part: "ring1", pos: [0, 0, fd] },
  ];
  if (c.led.on) items.push({ part: "diffuser", pos: [0, 0, 0] });
  if (d.dock) items.push({ part: "dockClip", pos: [0, 0, 0] });
  if (d.mount === "wall") {
    items.splice(items.findIndex((i) => i.part === "ring1"), 1);
    items.push({ part: "wallCase", pos: [0, 0, fd] }, { part: "wallBack", pos: [0, 0, fd + d.wallD] });
    return { items, headDepth: fd + d.wallD + d.backT };
  }
  let z = fd + D1;
  for (let i = 0; i < c.shell.nExt; i++) {
    const part = d.glue || i % 2 === 0 ? "ringExt" : "ringExt2";
    items.push({ part, pos: [0, 0, z] }); z += D;
  }
  items.push({ part: "back", pos: [0, 0, z] });
  items.push({ part: d.mount === "post" ? "postCap" : "hub", pos: [0, 0, fd] });
  return { items, headDepth: z + d.backT };
}

export function legGeometry(c, sockets) {
  const d = derive(c), fd = d.fd;
  const camY = d.camShell[1];
  const floorY = camY - c.legs.camHeight;
  const F = ferSpec(c), startT = d.seat + F.tl + F.hc;
  return sockets.map((s) => {
    const o = [s.o[0], s.o[1], s.o[2] + fd];
    const start = o.map((v, i) => v + s.v[i] * startT);
    const L = (start[1] - floorY) / -s.v[1];
    const foot = start.map((v, i) => v + s.v[i] * L);
    return { o, v: s.v, start, L, foot, floorY, ferruleAt: o.map((v, i) => v + s.v[i] * d.seat) };
  });
}
