import * as THREE from "./three.module.js";
import { OrbitControls } from "./OrbitControls.js";
import { toCreasedNormals } from "./BufferGeometryUtils.js";
import { DEFAULTS, TABLETS, PART_INFO, INSERTS, insertSpec, screwLen, validate, assembly, legGeometry, derive, mountOf, LED_STRIPS, stripOf, ledFit, poleOf, postSpec, flangeSpec, POST, FLANGE, PLY, KEY, DOCK_PLUGS, plugOf } from "./geom.js";
import { howtoBody, howtoPage, HOWTO_CSS } from "./howto.js";
import { PRINTERS } from "./pack3mf.js";
import { printSettings, applyConfig, presetKey } from "./printsettings.js";

// ------------------------------------------------------------------ state
const STORE = "cassette-booth-config-v1";
const clone = (o) => JSON.parse(JSON.stringify(o));
function merge(base, over) {
  for (const k in over) {
    if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k]) && base[k] && typeof base[k] === "object") merge(base[k], over[k]);
    else base[k] = over[k];
  }
  return base;
}
let cfg = clone(DEFAULTS);
// settings saved before the LED strip choice existed keep their own channel size (Custom)
const fromSaved = (o) => { const c2 = merge(clone(DEFAULTS), o); if (o && o.led && !("strip" in o.led)) c2.led.strip = "custom"; return c2; };
try { const s = localStorage.getItem(STORE); if (s) cfg = fromSaved(JSON.parse(s)); } catch (e) {}
// migrate settings saved by earlier versions: the cap is gone (slide-in only), and the LED channel now sets the lip depth
cfg.cap.lock = "none"; if ((cfg.cass.bumpCorner || "auto") === "auto") cfg.cass.bumpCorner = "pair"; if (cfg.shell.lip === 3) cfg.shell.lip = DEFAULTS.shell.lip; if (cfg.shell.cornerR === 44) cfg.shell.cornerR = DEFAULTS.shell.cornerR; cfg.legs.style = "puck";
if (cfg.led.depth === 10) cfg.led.depth = DEFAULTS.led.depth;
if (cfg.back.d === 8 && cfg.back.pitch === 1.25) { cfg.back.d = DEFAULTS.back.d; cfg.back.pitch = DEFAULTS.back.pitch; }   // old placeholder thread, far smaller than Thread Boards
if (!cfg.shell.ring1D || cfg.shell.ring1D < DEFAULTS.shell.ring1D) cfg.shell.ring1D = DEFAULTS.shell.ring1D;
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) {} };

let view = "head", focus = null;
let holes = null, sockets = null, built = false;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const get = (p) => p.split(".").reduce((o, k) => o[k], cfg);
const set = (p, v) => { const ks = p.split("."); const last = ks.pop(); ks.reduce((o, k) => o[k], cfg)[last] = v; };
const mm = (v, d = 0) => `${(+v).toFixed(d)} mm`;
const inch = (v) => `${(v / 25.4).toFixed(1)}"`;

// ------------------------------------------------------------------ worker
const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
let reqId = 0, inFlight = false, pending = false;
const waiters = new Map();
worker.onmessage = (ev) => {
  const m = ev.data;
  if (m.type === "ready") return;
  if (m.type === "fatal") { busy(false, "Geometry kernel failed to load"); $("#loadMsg").textContent = "The geometry kernel could not load in this browser."; return; }
  if (m.type === "progress") { const w = waiters.get(m.id); if (w && w.progress) w.progress(m.part); return; }
  const w = waiters.get(m.id);
  if (w) { waiters.delete(m.id); m.type === "error" ? w.reject(new Error(m.msg)) : w.resolve(m); }
};
function call(msg, progress) {
  const id = ++reqId;
  return new Promise((resolve, reject) => { waiters.set(id, { resolve, reject, progress }); worker.postMessage({ ...msg, id }); });
}
function busy(on, text) { $("#busy").dataset.idle = String(!on); $("#busyText").textContent = text; }

const ALL_PARTS = ["cassette", "cassKey", "frame", "cap", "diffuser", "dockClip", "ring1", "ringExt", "ringExt2", "ringExtLast", "back", "wallCase", "wallBack", "hub", "ferrule", "postCap", "flange", "threadTest"];
// parts this booth uses (built for the preview); the export list adds quantities
function usedParts() {
  const mt = mountOf(cfg), d = derive(cfg);
  return ALL_PARTS.filter((p) => !(p === "diffuser" && !cfg.led.on) && !(p === "dockClip" && !d.dock)
    && !(mt === "wall" && ["ring1", "ringExt", "ringExt2", "ringExtLast", "back", "hub", "ferrule", "postCap", "flange"].includes(p))
    && !(mt !== "wall" && ["wallCase", "wallBack"].includes(p))
    && !(mt !== "tripod" && ["hub", "ferrule"].includes(p)) && !(mt !== "post" && ["postCap", "flange"].includes(p))
    && !(p === "threadTest" && (mt === "wall" || cfg.back.mode === "none")));
}
let timer = null;
function rebuild(delay = 220) {
  clearTimeout(timer);
  timer = setTimeout(runBuild, delay);
}
async function runBuild() {
  const issues = validate(cfg);
  renderIssues(issues);
  if (issues.some((i) => i.level === "error")) { busy(false, "Fix the highlighted setting"); return; }
  if (inFlight) { pending = true; return; }
  inFlight = true; busy(true, "Building");
  try {
    const parts = usedParts();
    for (const k of Object.keys(GEO)) if (!parts.includes(k)) { GEO[k].geo.dispose(); GEO[k].edges.dispose(); delete GEO[k]; }
    const res = await call({ type: "build", cfg: clone(cfg), parts });
    holes = res.holes; sockets = res.sockets;
    for (const [name, g] of Object.entries(res.parts)) setGeometry(name, g);
    built = true;
    $("#loadMsg").hidden = true;
    composeScene();
    renderHoles(); renderStats(); renderParts(); syncControls();
    busy(false, "Up to date");
  } catch (e) {
    busy(false, "Build failed");
    renderIssues([...issues, { level: "error", msg: `Build failed: ${e.message}` }]);
  }
  inFlight = false;
  if (pending) { pending = false; runBuild(); }
}

// ------------------------------------------------------------------ three.js
const stage = $("#stage");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 5, 20000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.12;
controls.addEventListener("change", requestRender);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f8c, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-900, 1300, -1600); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.8); fill.position.set(1400, 400, 900); scene.add(fill);
const root = new THREE.Group(); scene.add(root);

const COLORS = {
  shell: 0xe3e1db, cassette: 0x2f5d62, diffuser: 0xffc56b, hub: 0x5f6461, ferrule: 0x6d726f,
  wood: 0xb98a55, tablet: 0x1b1e22, screen: 0x24384a, steel: 0xa9aeb0, ply: 0xd8b98a, wall: 0xcfd2cc,
};
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.0, ...extra });
const MATS = {
  cassette: mat(COLORS.cassette), cassKey: mat(COLORS.cassette), frame: mat(COLORS.shell), cap: mat(COLORS.shell), ring1: mat(COLORS.shell),
  ringExt: mat(COLORS.shell), ringExt2: mat(COLORS.shell), ringExtLast: mat(COLORS.shell), back: mat(COLORS.shell), hub: mat(COLORS.hub), ferrule: mat(COLORS.ferrule),
  diffuser: mat(COLORS.diffuser, { emissive: 0xffa53a, emissiveIntensity: 0.55, roughness: 0.4, transparent: true, opacity: 0.92 }),
  wallCase: mat(COLORS.shell), wallBack: mat(COLORS.shell), postCap: mat(COLORS.hub), flange: mat(COLORS.hub), dockClip: mat(COLORS.hub), threadTest: mat(COLORS.shell),
};
const edgeMat = new THREE.LineBasicMaterial({ color: 0x1d2420, transparent: true, opacity: 0.22 });
const GEO = {};
function setGeometry(name, g) {
  if (GEO[name]) { GEO[name].geo.dispose(); GEO[name].edges.dispose(); }
  const base = new THREE.BufferGeometry();
  base.setAttribute("position", new THREE.BufferAttribute(g.pos, 3));
  base.setIndex(new THREE.BufferAttribute(g.idx, 1));
  const geo = toCreasedNormals(base, 0.3);   // ~17°: only true curves are smoothed, so chamfers next to flat faces don’t streak
  const edges = new THREE.EdgesGeometry(base, 28);
  base.dispose();
  GEO[name] = { geo, edges, vol: g.vol, bbox: g.bbox };
}
function partMesh(name) {
  const m = new THREE.Mesh(GEO[name].geo, MATS[name]);
  m.add(new THREE.LineSegments(GEO[name].edges, edgeMat));
  m.userData.part = name;
  return m;
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function tabletMesh() {
  const tb = cfg.tablet, land = cfg.orientation === "landscape";
  const w = land ? tb.w : tb.h, h = land ? tb.h : tb.w, sw = land ? tb.sw : tb.sh, sh = land ? tb.sh : tb.sw;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(w, h, tb.r), { depth: tb.t, bevelEnabled: false, curveSegments: 10 }), mat(COLORS.tablet, { roughness: 0.4 }));
  const scr = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(sw, sh, 6)), mat(COLORS.screen, { emissive: 0x16304a, emissiveIntensity: 0.5, roughness: 0.25 }));
  scr.position.z = -0.05; scr.rotation.y = Math.PI;
  g.add(body, scr);
  return g;
}
function dowel(start, v, L) {
  const geo = new THREE.CylinderGeometry(cfg.legs.dowel / 2, cfg.legs.dowel / 2, L, 28);
  const m = new THREE.Mesh(geo, mat(COLORS.wood, { roughness: 0.8 })); m.userData.own = true;
  const dir = new THREE.Vector3(...v);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  m.position.set(...start).addScaledVector(dir, L / 2);
  return m;
}

function composeScene() {
  if (!built) return;
  while (root.children.length) {
    const c = root.children.pop();
    c.traverse((o) => {
      if (!o.userData.own) return;
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      if (!o.isSprite && o.geometry) o.geometry.dispose();
    });
  }
  const d = derive(cfg), asm = assembly(cfg);
  const exploded = view === "exploded";
  const kiosk = view === "kiosk";
  const fd = d.fd, D = cfg.shell.ringD;
  if (focus) {
    const m = partMesh(focus); root.add(m);
    fit(focusDir(focus), true); return;
  }
  let extIndex = 0;
  for (const it of asm.items) {
    if (!GEO[it.part]) continue;
    const m = partMesh(it.part);
    m.position.set(...it.pos);
    if (it.flip) { m.rotation.x = Math.PI; m.position.z += D; }
    if (exploded) {
      const off = {
        cassette: [0, d.Ch * 1.12, 0], cassKey: [0, d.Ch * 1.12 + 120, 0], cap: [0, 150, 0], diffuser: [0, 0, -110], ring1: [0, 0, 60],
        back: [0, 0, 60 * (cfg.shell.nExt + 2)], hub: [0, -150, 60], postCap: [0, -150, 60], wallCase: [0, 0, 60], wallBack: [0, 0, 140], dockClip: [0, -70, -90],
      }[it.part];
      if (it.part.startsWith("ringExt")) { extIndex++; m.position.z += 60 * (extIndex + 1); }
      else if (off) m.position.add(new THREE.Vector3(...off));
    }
    root.add(m);
    if (it.part === "cassette") {
      const t = tabletMesh();
      t.position.set(d.ipadOff[0], d.ipadOff[1] - d.chanClr, d.tabletZ);
      if (exploded) t.position.add(new THREE.Vector3(0, d.Ch * 1.12, d.hug ? -60 : 70));
      root.add(t);
    }
  }
  const mt = mountOf(cfg);
  if (kiosk && mt !== "tripod") {
    const floorY = d.camShell[1] - cfg.legs.camHeight;
    addScale(floorY, d, mt === "wall" ? asm.headDepth + 0.5 : 900);
    if (mt === "wall") {
      const w = new THREE.Mesh(new THREE.BoxGeometry(5200, 2600, 20), mat(COLORS.wall, { roughness: 0.95 }));
      w.position.set(-700, floorY + 1300, asm.headDepth + 11); w.userData.own = true; root.add(w);
    } else {
      const pz = fd + d.hubZc, S = d.post, F = flangeSpec(cfg), bt = PLY.t * (+cfg.mount.layers || 2), B = +cfg.mount.base || 600;
      const base = new THREE.Mesh(new THREE.BoxGeometry(B, bt, B), mat(COLORS.ply, { roughness: 0.85 })); base.position.set(0, floorY + bt / 2, pz); base.userData.own = true; root.add(base);
      if (GEO.flange) { const f = partMesh("flange"); f.position.set(0, floorY + bt, pz); root.add(f); }
      const y0 = floorY + bt + FLANGE.floor, y1 = -d.Sy - 0.05 - POST.disc;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(S.od / 2, S.od / 2, y1 - y0, 40), mat(S.hollow ? COLORS.steel : COLORS.wood, { roughness: S.hollow ? 0.45 : 0.8, metalness: S.hollow ? 0.4 : 0 }));
      pole.position.set(0, (y0 + y1) / 2, pz); pole.userData.own = true; root.add(pole);
    }
  }
  if (kiosk && sockets && mt === "tripod") {
    const legs = legGeometry(cfg, sockets);
    addScale(legs[0].floorY, d);
    for (const lg of legs) {
      const f = new THREE.Mesh(GEO.ferrule.geo, MATS.ferrule);
      f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...lg.v));
      f.position.set(...lg.ferruleAt);
      root.add(f);
      root.add(dowel(lg.start, lg.v, lg.L));
    }
  }
  const dirs = { head: [-0.75, 0.42, -1], exploded: [-1, 0.5, -0.85], kiosk: [-0.45, 0.18, -1], back: [0.7, 0.35, 1] };
  fit(dirs[view] || dirs.head, true);
}
// ---------------- scale figures + height board for the kiosk view
const PEOPLE = [
  { label: "Adult", h: 1753, note: "5′9″", x: -880 },
  { label: "Adult", h: 1615, note: "5′4″", x: -1280 },
  { label: "Child, 8", h: 1280, note: "4′2″", x: -1640 },
];
function personShape(H) {
  const half = [[0.012, 0.45], [0.02, 0.012], [0.02, 0], [0.085, 0], [0.072, 0.04], [0.095, 0.48], [0.085, 0.585], [0.1, 0.735],
    [0.108, 0.5], [0.14, 0.488], [0.137, 0.78], [0.12, 0.83], [0.036, 0.866]];
  const pts = [...half, ...half.slice().reverse().map(([x, y]) => [-x, y])];
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * H, y * H)));
  const head = new THREE.Shape(); head.absarc(0, 0.935 * H, 0.066 * H, 0, Math.PI * 2, false);
  return [s, head];
}
function textSprite(lines, color, size = 64) {
  const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
  ctx.font = `600 ${size}px "Instrument Sans", system-ui, sans-serif`;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
  cv.width = Math.ceil(w); cv.height = Math.ceil(size * 1.25 * lines.length + 12);
  ctx.font = `600 ${size}px "Instrument Sans", system-ui, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, cv.width / 2, 6 + i * size * 1.25));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sp.scale.set(cv.width * 1.5, cv.height * 1.5, 1);
  sp.userData.own = true;
  return sp;
}
function addScale(floorY, d, boardZ = 900) {
  const dark = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--viewer").trim()).getHSL({}).l < 0.4;
  const fig = dark ? 0x59615d : 0xaab1ad, ink = dark ? "#9aa49f" : "#5e6763";
  for (const p of PEOPLE) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(personShape(p.h), 24), new THREE.MeshBasicMaterial({ color: fig, side: THREE.DoubleSide }));
    g.position.set(p.x, floorY, 60); g.userData.own = true;
    root.add(g);
    const t = textSprite([p.label, p.note], ink, 56);
    t.position.set(p.x, floorY + p.h + 170, 60);
    root.add(t);
  }
  // height board behind: a line every foot, camera height in amber
  const W = 3600, H = 7.2 * 304.8;
  const cv = document.createElement("canvas"); cv.width = 1800; cv.height = Math.round(1800 * H / W);
  const ctx = cv.getContext("2d"), px = cv.width / W;
  ctx.font = `500 ${Math.round(26)}px "JetBrains Mono", ui-monospace, monospace`; ctx.textBaseline = "bottom";
  for (let ft = 1; ft <= 7; ft++) {
    const y = cv.height - ft * 304.8 * px;
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.45; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke();
    ctx.globalAlpha = 0.9; ctx.fillStyle = ink; ctx.fillText(`${ft}′`, 10, y - 4);
  }
  const cy = cv.height - cfg.legs.camHeight * px;
  ctx.globalAlpha = 1; ctx.strokeStyle = "#e08a17"; ctx.lineWidth = 4; ctx.setLineDash([16, 10]);
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(cv.width, cy); ctx.stroke();
  ctx.fillStyle = "#e08a17"; ctx.fillText(`camera ${Math.floor(cfg.legs.camHeight / 25.4 / 12)}′ ${(cfg.legs.camHeight / 25.4 % 12).toFixed(1).replace(/\.0$/, "")}″`, cv.width - 300, cy - 6);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  board.rotation.y = Math.PI; board.position.set(-650, floorY + H / 2, boardZ); board.userData.own = true;
  root.add(board);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2200, 64), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: dark ? 0.18 : 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(-500, floorY - 1, 300); floor.userData.own = true;
  root.add(floor);
}
function focusDir(p) { return p === "back" ? [0.6, 0.4, 1] : p === "hub" || p === "ferrule" ? [-0.7, -0.5, -1] : [-0.6, 0.45, -1]; }

let lastViewKey = "";
function fit(dir, maybeKeep) {
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const viewKey = view + "|" + focus;
  if (maybeKeep && viewKey === lastViewKey) { controls.target.lerp(center, 1); requestRender(); return; }
  lastViewKey = viewKey;
  const radius = size.length() / 2;
  const vh = THREE.MathUtils.degToRad(camera.fov / 2);
  const half = Math.min(vh, Math.atan(Math.tan(vh) * camera.aspect));
  const dist = radius / Math.sin(half) * (view === "kiosk" && !focus ? 1.08 : 0.95);
  const v = new THREE.Vector3(...dir).normalize();
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(v, dist);
  camera.near = dist / 50; camera.far = dist * 20; camera.updateProjectionMatrix();
  controls.update(); requestRender();
}

let rq = false;
function requestRender() { if (rq) return; rq = true; requestAnimationFrame(frame); }
function frame() {
  rq = false;
  const changed = controls.update();
  renderer.render(scene, camera);
  if (changed) requestRender();
}
function resize() {
  const r = stage.getBoundingClientRect();
  if (!r.width || !r.height) return;
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  requestRender();
}
new ResizeObserver(resize).observe(stage);
function applyTheme() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--viewer").trim() || "#dfe3e0";
  renderer.setClearColor(new THREE.Color(bg));
  const dark = new THREE.Color(bg).getHSL({}).l < 0.4;
  edgeMat.color.set(dark ? 0x000000 : 0x1d2420);
  edgeMat.opacity = dark ? 0.45 : 0.22;
  requestRender();
}
applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ------------------------------------------------------------------ controls binding
const insSel = $("#insType");
for (const [k, v] of Object.entries(INSERTS)) insSel.add(new Option(v.label, k));
const presetSel = $("#preset");
for (const [k, t] of Object.entries(TABLETS)) presetSel.add(new Option(t.label, k));
presetSel.addEventListener("change", () => {
  const k = presetSel.value; cfg.tablet.preset = k;
  if (k !== "custom") Object.assign(cfg.tablet, (({ label, ...r }) => r)(TABLETS[k]));
  else $("#dims").open = true;
  changed();
});

function fmt(path, v) {
  if (path === "legs.splay") return `${v}°`;
  return mm(v, Number.isInteger(+v) ? 0 : 1);
}
function syncControls() {
  const d = derive(cfg);
  presetSel.value = cfg.tablet.preset in TABLETS ? cfg.tablet.preset : "custom";
  for (const el of $$("[data-path]")) {
    const p = el.dataset.path, v = get(p);
    if (el.classList.contains("seg")) for (const b of el.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.v === String(v)));
    else if (el.type === "checkbox") el.checked = !!v;
    else if (el.tagName === "SELECT") el.value = String(v);
    else if (document.activeElement !== el) el.value = v;
  }
  for (const o of $$("output[data-for]")) o.textContent = fmt(o.dataset.for, get(o.dataset.for));
  const camIn = cfg.legs.camHeight / 25.4;
  $("#camH").value = camIn;
  $("#camHOut").textContent = `${Math.floor(camIn / 12)}′ ${(camIn % 12).toFixed(1).replace(/\.0$/, "")}″ · ${mm(cfg.legs.camHeight)}`;
  $("#extOut").textContent = cfg.shell.nExt;
  const land = cfg.orientation === "landscape";
  const side = land !== (cfg.tablet.camEdge === "long");
  $("#camSideField").hidden = !side;
  $("#ledFields").hidden = !cfg.led.on;
  const hug = cfg.fitMode === "hug";
  {
    const [sx, sy] = d.rearCorner, nm = (x, y) => `${y > 0 ? "top" : "bottom"}-${x < 0 ? "right" : "left"}`, mode = cfg.cass.bumpCorner || "pair";
    $("#bumpHint").textContent = mode === "all"
      ? "Cleared at every corner of the back ledge, so the tablet can go in any way round."
      : mode === "pair"
      ? `Cleared at the ${nm(sx, sy)} and ${nm(-sx, -sy)} corners, seen from the front, so the camera clears with the iPad either way up.`
      : `Cleared at the ${nm(sx, sy)} corner, seen from the front. The front camera's notch fixes which way the iPad goes in, so that's where the rear camera lands. Check it against your iPad.`;
  }
  $("#ring1Out").textContent = d.D1 > (cfg.shell.ring1D || 0) ? `${d.D1} mm (minimum)` : `${d.D1} mm`;
  const I = insertSpec(cfg);
  $("#joinHint").textContent = cfg.shell.join !== "screws"
    ? "Each ring has a tongue on its back edge that slides into a socket in the next ring, and the last one into a groove in the back panel. Everything glues into one solid shell with hairline seams. Only the hub and the cap use screws."
    : "Screws through internal lugs into heat-set inserts. You can change the depth later; extension rings alternate A and B.";
  $("#insCustom").hidden = cfg.inserts.type !== "custom";
  $("#insHint").textContent = `Holes print at ${I.hole} mm and ${I.depth.toFixed(1)} mm deep (blind, with room for melted plastic). Screws pass through ${I.clr} mm clearance holes with ${I.head} mm counterbores. Rear lugs grow to ${I.lug} mm to fit the insert.`;
  $("#csizeField").hidden = hug; $("#hugFields").hidden = !hug;
  $("#portSideField").hidden = !hug;
  {
    const [px, py] = d.portDir, edge = px ? (px < 0 ? "right" : "left") : (py > 0 ? "top" : "bottom");
    $("#portHint").textContent = cfg.cass.portSide === "both"
      ? "Plug room on both opposite edges, in case your port isn't where the camera suggests."
      : `With the camera where it is, the port faces the ${edge} edge (seen from the front), so the plug room goes there only.`;
  }
  $("#fitHint").textContent = hug
    ? `Bezel lock: the iPad lies face-forward in an open tray and the frame's lip holds it by its black glass border. Shell ${d.Sw.toFixed(0)} × ${d.Sh.toFixed(0)} mm, ${d.bezel.side.toFixed(0)} mm from the edge to the screen at the sides and ${d.bezel.top.toFixed(0)} mm at the top. This shell fits this tablet only.`
    : `A ${d.Cw} mm square cassette with a front mask fits most 11" iPads in either orientation. Every cassette for this booth shares that size.`;

  if (cfg.led.on) {
    const L = d.led;
    const S = stripOf(cfg);
    const P = ledPower(), watts = P.watts;
    $("#ledOut").innerHTML = (S ? `<dt>One strip, cut to</dt><dd class="big">${L.leds} LEDs · ${L.cutLen.toFixed(0)} mm</dd>
      <dt>Buy</dt><dd>${L.reel} m reel</dd>
      <dt>Cut marks every</dt><dd>${S.cut.toFixed(S.cut % 1 ? 1 : 0)} mm (${Math.round((S.cut * S.perM) / 1000)} LED${Math.round((S.cut * S.perM) / 1000) > 1 ? "s" : ""})</dd>
      <dt>Power</dt><dd>${watts.toFixed(0)} W at full white: ${S.volts} V ${P.full} A${S.usb ? `; a ${P.half} A USB port at half brightness` : ""}</dd>`
      : `<dt>One strip, cut to</dt><dd class="big">${L.strip.toFixed(0)} mm · ${(L.strip / 25.4).toFixed(1)}″</dd>`) + `
      <dt>Channel centerline, shoulder to shoulder</dt><dd>${L.perimeter.toFixed(0)} mm</dd>
      <dt>Visible lit length</dt><dd>${L.lit.toFixed(0)} mm</dd>
      <dt>Glass behind the front face</dt><dd>${d.tabletZ.toFixed(1)} mm</dd>`;
    const Sk = LED_STRIPS[cfg.led.strip] || LED_STRIPS.custom;
    $("#ledLinks").innerHTML = Sk.url ? `<a href="${Sk.url}" target="_blank" rel="noopener">Get it ↗</a>${Sk.url2 ? ` · <a href="${Sk.url2[1]}" target="_blank" rel="noopener">${Sk.url2[0]} ↗</a>` : ""}` : "";
    $("#ledStripHint").textContent = S ? `${S.kind}, ${S.volts} V, ${S.w} mm ${S.edge ? "thick, 8 mm tall: stand it on its edge, LEDs facing out of the channel, with a dab of hot glue every 10 cm" : "wide: lay it flat, LEDs forward, on its adhesive"}. Power: ${S.power} Sizes are the listing's (or typical for the type), so check yours before printing.` : "Set the width to your strip plus 1 mm, and the depth to the diffuser, the strip and a few mm of air.";
  }
  $("#holeFields").hidden = cfg.back.mode === "none";
  const depth = assembly(cfg).headDepth;
  $("#depthOut").textContent = `${depth.toFixed(0)} mm deep`;
  $("#sum1").textContent = `${(TABLETS[cfg.tablet.preset] || TABLETS.custom).label}, ${cfg.orientation}${cfg.fitMode === "hug" ? ", hugged" : ""}`;
  $("#sum2").textContent = `${cfg.shell.nExt} extension ring${cfg.shell.nExt === 1 ? "" : "s"} · ${depth.toFixed(0)} mm deep`;
  $("#sum3").textContent = cfg.led.on ? (stripOf(cfg) ? `${(LED_STRIPS[cfg.led.strip].label.split(",")[0])} · ${d.led.leds} LEDs` : `${cfg.led.w} × ${cfg.led.depth} mm channel · ${(d.led.strip / 25.4).toFixed(1)}″ strip`) : "Off";
  $("#sum2").textContent += " · slide-in";
  const n = holes ? holes.all.filter((h) => isOn(h)).length : 0;
  $("#sum4").textContent = cfg.back.mode === "none" ? "Solid" : `${n} ${cfg.back.mode} holes on a ${cfg.back.grid} mm grid`;
  // mount
  const mt = mountOf(cfg);
  $("#tripodFields").hidden = mt !== "tripod"; $("#postFields").hidden = mt !== "post"; $("#wallFields").hidden = mt !== "wall";
  $("#ringFields").hidden = mt === "wall"; $("#wallShellHint").hidden = mt !== "wall";
  $("#wallBackHint").hidden = mt !== "wall"; $("[data-path='back.mode']").closest(".field").hidden = mt === "wall";
  if (mt === "wall") $("#holeFields").hidden = true;
  $("#poleCustom").hidden = cfg.mount.pole !== "custom";
  $("#wallDOut").textContent = d.wallD > (+cfg.mount.wallD || 0) ? `${d.wallD} mm (minimum)` : `${d.wallD} mm`;
  if (mt === "wall") {
    const w = wallNumbers();
    $("#wallOut").innerHTML = `<dt>Screws, level, apart</dt><dd class="big">${w.span} mm · ${(w.span / 25.4).toFixed(1)}″</dd>
      <dt>Top of the slots from the floor</dt><dd>${mm(w.lockH)} · ${inch(w.lockH)}</dd>
      <dt>Screws</dt><dd>#8 or M4 pan head, head ≤ ${KEY.head - 0.5} mm</dd>
      <dt>Leave the heads off the wall by</dt><dd>3 mm</dd>
      <dt>Stands off the wall</dt><dd>${assembly(cfg).headDepth.toFixed(0)} mm</dd>`;
  }
  if (mt === "post") {
    const p = postNumbers();
    $("#postOut").innerHTML = `<dt>Cut the pole to</dt><dd class="big">${mm(p.pole)} · ${inch(p.pole)}</dd>
      <dt>Base</dt><dd>${p.B} × ${p.B} mm, ${p.layers} × 18 mm ply, ${p.baseKg.toFixed(1)} kg</dd>
      <dt>Tips at a push on the screen of</dt><dd>${p.tipKg.toFixed(1)} kg</dd>
      <dt>${p.addKg > 0 ? "Add for 3 kg of push" : "Extra weight"}</dt><dd>${p.addKg > 0 ? `${Math.ceil(p.addKg)} kg (a weight plate under the base)` : "None needed"}</dd>`;
    $("#woodGuide").innerHTML = woodGuide(p).map((t) => `<li>${t}</li>`).join("");
  }
  // dock
  const dk = cfg.dock || {};
  $("#dockFields").hidden = !dk.on; $("#plugRoomRow").hidden = !!d.dock;
  $("#dockCustom").hidden = dk.brand !== "custom";
  { const b = DOCK_PLUGS[dk.brand], a = $("#dockLink");
    a.hidden = !b || !b.url; if (b && b.url) { a.href = b.url; a.textContent = `Get it: ${b.label} ↗`; } }
  { const pl = plugOf(cfg);
    $("#dockHint").textContent = !dk.on ? "" : d.dock
      ? `The plug stands in a printed clip at the bottom of the slot, pointing up. Plug head ${pl.w} × ${pl.t} × ${pl.len} mm${dk.brand === "custom" ? "" : " (typical; measure yours, and switch to Custom if it differs)"}. Print the clip first and check the fit; it's a 10-minute print. Makes the shell ${(d.Sh - derive({ ...cfg, dock: { ...dk, on: false } }).Sh).toFixed(0)} mm taller.`
      : "Docking works in portrait only: the plug points up, so the iPad's USB-C port has to be on its bottom edge. In landscape the port is on a side, so plug the cable in before sliding the cassette down.";
  }
  $("#sum5").textContent = mt === "tripod" ? `Tripod, camera at ${inch(cfg.legs.camHeight)}, ${cfg.legs.splay}° splay` : mt === "post" ? `Post, camera at ${inch(cfg.legs.camHeight)}` : `Wall, camera at ${inch(cfg.legs.camHeight)}`;
  if (d.dock) $("#sum1").textContent += ", dock";
  renderPrint();
}
function changed(delay) { save(); syncControls(); rebuild(delay); }

// ---------------------------------------------------------------- print setup (nozzle + material)
var PRESET_BASE = null;   // var: syncControls can run before this line on startup
const presetsReady = fetch("presets/index.json").then((r) => r.json()).then((j) => { PRESET_BASE = j; renderPrint(); }).catch(() => {});
var printChanges = [];
const flatRows = (ps) => [...ps.geometry, ...ps.settings, ...ps.matRows].map(([k, v]) => [k, v]);
function renderPrint() {
  $("#plaNote").hidden = (cfg.print.material || "PETG") !== "PLA";
  if (!PRESET_BASE) return;
  const ps = printSettings(cfg, PRESET_BASE);
  $("#sum6").textContent = `${ps.nozzle} mm nozzle · ${ps.material}`;
  $("#sum7").textContent = `STLs + PrusaSlicer projects · ${ps.nozzle} mm · ${ps.material}`;
  $("#printReminder").textContent = ps.reminder;
  const fill = (el, rows) => { el.replaceChildren(); for (const [k, v, note] of rows) {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v; if (note) { const sm = document.createElement("small"); sm.textContent = note; dd.append(sm); }
    if (printChanges.some((c) => c[0] === k)) dd.classList.add("changed");
    el.append(dt, dd); } };
  fill($("#printGeom"), ps.geometry); fill($("#printSet"), ps.settings); fill($("#printMat"), ps.matRows);
  const box = $("#printChanges");
  box.hidden = !printChanges.length;
  box.replaceChildren();
  if (printChanges.length) {
    const h = document.createElement("b"); h.textContent = "Changed by this setting";
    const ul = document.createElement("ul");
    for (const [k, a, b] of printChanges) { const li = document.createElement("li"); li.textContent = `${k}: ${a} → ${b}`; ul.append(li); }
    box.append(h, ul);
  }
}
// a nozzle or material change records what it changed (shown above the tables until the next change)
function printChange(path, v) {
  const before = PRESET_BASE ? flatRows(printSettings(cfg, PRESET_BASE)) : [];
  set(path, path === "print.nozzle" ? parseFloat(v) : v);
  if (path === "print.material") cfg.print.ironing = v === "PLA";      // ironing defaults: on for PLA, off for PETG
  const after = PRESET_BASE ? flatRows(printSettings(cfg, PRESET_BASE)) : [];
  const was = new Map(before);
  printChanges = after.filter(([k, val]) => was.has(k) && was.get(k) !== val).map(([k, val]) => [k, was.get(k), val]);
}

for (const el of $$("input[data-path], select[data-path]")) {
  const ev = el.type === "range" ? "input" : "change";
  el.addEventListener(ev, () => {
    const p = el.dataset.path;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (el.type === "number" || el.type === "range" || el.dataset.num) { v = parseFloat(v); if (!isFinite(v)) return; }
    if (p.startsWith("tablet.")) cfg.tablet.preset = "custom";
    set(p, v);
    if (p === "led.strip") { const f = ledFit(cfg, v); if (f) { cfg.led.w = f.w; cfg.led.depth = f.depth; } }   // a strip sizes its channel
    changed(el.type === "range" ? 260 : 120);
  });
}
for (const seg of $$(".seg[data-path]")) seg.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (seg.dataset.path.startsWith("print.")) printChange(seg.dataset.path, b.dataset.v);
  else set(seg.dataset.path, b.dataset.v);
  changed(60);
});
$("#camH").addEventListener("input", (e) => { cfg.legs.camHeight = Math.round(parseFloat(e.target.value) * 25.4); save(); syncControls(); renderStats(); if (view === "kiosk") composeScene(); });
$("#extMinus").addEventListener("click", () => { if (cfg.shell.nExt > 0) { cfg.shell.nExt--; changed(40); } });
$("#extPlus").addEventListener("click", () => { if (cfg.shell.nExt < 6) { cfg.shell.nExt++; changed(40); } });
$("#reset").addEventListener("click", () => { cfg = clone(DEFAULTS); focus = null; changed(0); });

$("[data-view]").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  view = b.dataset.v; focus = null; lastViewKey = "";
  for (const x of $$("[data-view] button")) x.setAttribute("aria-pressed", String(x === b));
  $("#focusPill").classList.remove("show");
  composeScene();
});
$("#focusClose").addEventListener("click", () => { focus = null; lastViewKey = ""; $("#focusPill").classList.remove("show"); composeScene(); });

// ------------------------------------------------------------------ issues
// warnings with no fix can be acknowledged; they stay hidden until their wording (and so the numbers) changes
const acked = new Set();
function applyFix(fix) { for (const [p, v] of fix.set) set(p, typeof v === "object" && v ? { ...v } : v); }
function fixAll() {
  // apply each fix, re-check, repeat: one fix can surface the next (e.g. a narrower channel, then the corner radius)
  for (let n = 0; n < 6; n++) {
    const todo = validate(cfg).filter((i) => i.fix);
    if (!todo.length) break;
    applyFix(todo[0].fix);
  }
  changed(0);
}
function renderIssues(list) {
  const box = $("#issues"); box.replaceChildren();
  const shown = list.filter((i) => i.fix || i.level === "error" || !acked.has(i.msg));
  for (const i of shown) {
    const div = document.createElement("div");
    div.className = `issue ${i.level}`;
    const b = document.createElement("b"); b.textContent = i.level === "error" ? "Fix" : "Check";
    const s = document.createElement("span"); s.textContent = i.msg;
    div.append(b, s);
    if (i.fix) {
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "fixbtn"; btn.textContent = i.fix.label;
      btn.addEventListener("click", () => { applyFix(i.fix); changed(0); });
      div.append(btn);
    } else if (i.level !== "error") {
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "fixbtn ghost"; btn.textContent = "Got it";
      btn.addEventListener("click", () => { acked.add(i.msg); renderIssues(validate(cfg)); });
      div.append(btn);
    }
    box.append(div);
  }
  if (shown.filter((i) => i.fix).length > 1) {
    const all = document.createElement("button"); all.type = "button"; all.className = "fixbtn all"; all.textContent = "Apply all fixes";
    all.addEventListener("click", fixAll); box.append(all);
  }
}

// ------------------------------------------------------------------ hole layout editor
const svg = $("#holes");
const NS = "http://www.w3.org/2000/svg";
const isOn = (h) => {
  if (!h.ok) return false;
  if (!cfg.back.cells) return true;
  return cfg.back.cells.some(([i, j]) => i === h.i && j === h.j);
};
function el(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function renderHoles() {
  if (!holes) return;
  const d = derive(cfg), Sx = d.Sx, Sy = d.Sy, pad = 6;
  svg.setAttribute("viewBox", `${-Sx - pad} ${-Sy - pad} ${2 * Sx + 2 * pad} ${2 * Sy + 2 * pad}`);
  svg.style.aspectRatio = `${Sx} / ${Sy}`;
  svg.replaceChildren();
  svg.append(el("rect", { class: "shell", x: -Sx, y: -Sy, width: 2 * Sx, height: 2 * Sy, rx: d.R }));
  const lx = d.innerX - 3, ly = d.innerY - 3;
  svg.append(el("rect", { class: "lip", x: -lx, y: -ly, width: 2 * lx, height: 2 * ly, rx: Math.max(1, d.R - cfg.shell.wall - 3) }));
  for (const [x, y] of cfg.shell.join === "screws" ? [...d.A, ...d.B] : []) {
    svg.append(el("circle", { class: "screw", cx: x, cy: -y, r: 3.2 }));
    svg.append(el("path", { class: "screw", d: `M${x - 2.2} ${-y}h4.4M${x} ${-y - 2.2}v4.4` }));
  }
  const t = el("text", { class: "cap-mark", x: 0, y: -Sy + 12, "text-anchor": "middle" }); t.textContent = "TOP"; svg.append(t);
  const r = Math.max(2.5, Math.min(cfg.back.grid * 0.42, cfg.back.d / 2 + 1.5));
  let count = 0;
  for (const h of holes.all) {
    if (!h.ok) continue;
    const on = isOn(h); if (on) count++;
    const c = el("circle", { class: `cell ${on ? "on" : "off"}`, cx: h.x, cy: -h.y, r });
    c.dataset.i = h.i; c.dataset.j = h.j;
    svg.append(c);
  }
  $("#holeCount").textContent = `${count} hole${count === 1 ? "" : "s"}`;
}
function materialize() { if (!cfg.back.cells) cfg.back.cells = holes.all.filter((h) => h.ok).map((h) => [h.i, h.j]); }
function setCell(i, j, on) {
  materialize();
  const k = cfg.back.cells.findIndex(([a, b]) => a === i && b === j);
  if (on && k < 0) cfg.back.cells.push([i, j]);
  if (!on && k >= 0) cfg.back.cells.splice(k, 1);
}
let paint = null;
function cellAt(evt) {
  const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const g = cfg.back.grid, i = Math.round(p.x / g), j = Math.round(-p.y / g);
  const h = holes.all.find((q) => q.i === i && q.j === j);
  if (!h || !h.ok || Math.hypot(p.x - h.x, -p.y - h.y) > g * 0.55) return null;
  return h;
}
svg.addEventListener("pointerdown", (e) => {
  if (!holes) return;
  const h = cellAt(e); if (!h) return;
  paint = !isOn(h); setCell(h.i, h.j, paint); svg.setPointerCapture(e.pointerId); renderHoles();
});
svg.addEventListener("pointermove", (e) => {
  if (paint === null) return;
  const h = cellAt(e); if (!h || isOn(h) === paint) return;
  setCell(h.i, h.j, paint); renderHoles();
});
const endPaint = () => { if (paint === null) return; paint = null; changed(50); };
svg.addEventListener("pointerup", endPaint); svg.addEventListener("pointercancel", endPaint);
for (const chip of $$("[data-preset]")) chip.addEventListener("click", () => {
  if (!holes) return;
  const ok = holes.all.filter((h) => h.ok), has = new Set(ok.map((h) => `${h.i},${h.j}`));
  const pick = {
    all: () => null,
    clear: () => [],
    border: () => ok.filter((h) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !has.has(`${h.i + a},${h.j + b}`))),
    checker: () => ok.filter((h) => (h.i + h.j) % 2 === 0),
    center: () => ok.filter((h) => Math.abs(h.i) <= 2 && Math.abs(h.j) <= 2),
    lower: () => ok.filter((h) => h.j < 0),
  }[chip.dataset.preset]();
  cfg.back.cells = pick && pick.map((h) => [h.i, h.j]);
  changed(50);
});

// ------------------------------------------------------------------ stats + legs
function legNumbers() {
  if (!sockets) return null;
  const lg = legGeometry(cfg, sockets);
  const L = lg[0].L, cut = L + 40;
  const feet = lg.map((l) => [l.foot[0], l.foot[2]]);
  const cx = feet.reduce((a, f) => a + f[0], 0) / 3, cz = feet.reduce((a, f) => a + f[1], 0) / 3;
  const r = feet.reduce((a, f) => a + Math.hypot(f[0] - cx, f[1] - cz), 0) / 3;
  return { L, cut, r };
}
// wall: keyhole spacing and the height of the slot tops for the camera height
function wallNumbers() {
  const d = derive(cfg), [k] = d.keyholes, lockY = d.keyLockY;
  return { span: 2 * Math.abs(k[0]), lockH: cfg.legs.camHeight - (d.camShell[1] - lockY) };
}
// post: pole length, base weight and how hard a push on the screen tips it over (square base, push square to an edge)
function postNumbers() {
  const d = derive(cfg), S = d.post, layers = +cfg.mount.layers || 2, B = +cfg.mount.base || 600, bt = PLY.t * layers;
  const floorY = d.camShell[1] - cfg.legs.camHeight, top = -d.Sy - 0.05 - POST.disc;
  const pole = Math.floor(top - (floorY + bt + FLANGE.floor) - 2);
  const baseKg = (B / 1000) ** 2 * (bt / 1000) * PLY.density;
  const poleKg = (pole / 1000) * (S.hollow ? (S.od > 34 ? 1.5 : 0.95) : Math.PI * (S.od / 2000) ** 2 * 700);
  const total = baseKg + poleKg + 2.0, h = cfg.legs.camHeight / 1000, arm = B / 2000;
  const tipKg = (total * arm) / h, addKg = (3 * h) / arm - total;
  return { pole, B, layers, bt, baseKg, tipKg, addKg, hollow: S.hollow, od: S.od };
}
function woodGuide(p) {
  const steps = [
    `Cut ${p.layers === 2 ? "two" : "one"} <b>${p.B} mm</b> square${p.layers === 2 ? "s" : ""} of 18 mm (¾″) plywood${p.layers === 2 ? "; glue and screw them together, grain crossed" : ""}.`,
    "Round the edges with a 6 mm roundover or sandpaper, then seal (oil, or primer and paint).",
    p.hollow ? "Cables: they run down inside the pole, through the flange and the base. Drill a 25 mm (1″) hole through the base at the centre, and on the underside cut a 20 × 12 mm groove from it to the back edge so the base sits flat." : "Cables: clip them to the back of the pole every 30 cm.",
    `Mark the centre; screw the <b>floor flange</b> there with four #8 × 1¼″ (4 × 30 mm) countersunk wood screws, the thumb screw toward the back.`,
    "Stick four rubber feet near the corners so it sits flat on uneven floors.",
    `Cut the pole to <b>${p.pole} mm</b>, push it into the flange and the post cap, and snug both thumb screws.`,
  ];
  if (p.addKg > 0) steps.push(`For busy events, add about <b>${Math.ceil(p.addKg)} kg</b> under the base (a steel plate or barbell plate screwed to the underside).`);
  return steps;
}
// LED power for the one strip: watts at full white, supply amps with 25% margin, and at half brightness (USB controllers)
function ledPower() {
  const S = stripOf(cfg), L = derive(cfg).led;
  if (!S) return { watts: 0, full: 0, half: 0 };
  const watts = (S.wPerM * L.cutLen) / 1000, a = watts / S.volts;
  return { watts, full: Math.max(1, Math.ceil(a * 1.25)), half: Math.max(1, Math.ceil(a * 0.5 * 1.25)) };
}
function renderStats() {
  const d = derive(cfg), depth = assembly(cfg).headDepth, ln = legNumbers();
  const stats = [
    ["Face", `${d.Sw.toFixed(0)} × ${d.Sh.toFixed(0)}<small> mm</small>`],
    ["Head depth", `${depth.toFixed(0)}<small> mm</small>`],
    mountOf(cfg) === "tripod" ? ["Dowel cut", ln ? `${(ln.cut / 25.4).toFixed(1)}″<small> × 3</small>` : "–"]
      : mountOf(cfg) === "post" ? ["Pole cut", `${(postNumbers().pole / 25.4).toFixed(1)}″<small> × 1</small>`] : ["On the wall", `${wallNumbers().span}<small> mm screws</small>`],
    ["Bezel to screen", `${d.bezel.side.toFixed(0)}<small> side · </small>${d.bezel.top.toFixed(0)}<small> top mm</small>`],
  ];
  $("#stats").innerHTML = stats.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
  if (ln) {
    $("#legOut").innerHTML = `
      <dt>Dowel cut length, each</dt><dd class="big">${(ln.cut / 25.4).toFixed(1)}″ · ${ln.cut.toFixed(0)} mm</dd>
      <dt>Exposed below the ferrule</dt><dd>${(ln.L / 25.4).toFixed(1)}″</dd>
      <dt>Foot circle diameter</dt><dd>${(ln.r * 2).toFixed(0)} mm</dd>
      <dt>Weak-side tip distance</dt><dd>${(ln.r / 2).toFixed(0)} mm</dd>`;
  }
}

// ------------------------------------------------------------------ parts list + export
function exportList() {
  const list = [
    ["cassette", 1], ...(cfg.fitMode !== "hug" && (cfg.cap.lock || "none") === "none" ? [["cassKey", 1]] : []), ["frame", 1], ...(cfg.cap.lock && cfg.cap.lock !== "none" ? [["cap", 1]] : []), ["ring1", 1],
  ];
  if (cfg.led.on) list.push(["diffuser", 1]);
  if (derive(cfg).dock) list.push(["dockClip", 1]);
  const mt = mountOf(cfg);
  if (mt === "wall") { list.splice(list.findIndex(([n]) => n === "ring1"), 1); list.push(["wallCase", 1], ["wallBack", 1]); return list; }
  const glue = cfg.shell.join !== "screws";
  if (glue) {
    if (cfg.shell.nExt > 0) list.push(["ringExt", cfg.shell.nExt]);
  } else if (cfg.shell.nExt > 0) list.push(["ringExt", Math.ceil(cfg.shell.nExt / 2)]);
  if (!glue && cfg.shell.nExt > 1) list.push(["ringExt2", Math.floor(cfg.shell.nExt / 2)]);
  list.push(["back", 1], ...(mt === "post" ? [["postCap", 1], ["flange", 1]] : [["hub", 1], ["ferrule", 3]]));
  if (cfg.back.mode !== "none") list.push(["threadTest", 1]);
  return list;
}
const selected = new Set(ALL_PARTS);
function bedFor(name) {
  const g = GEO[name]; if (!g) return "";
  const s = [0, 1, 2].map((i) => g.bbox[1][i] - g.bbox[0][i]).sort((a, b) => b - a);
  if (s[0] <= 250 && s[1] <= 220) return "Core One";
  return s[0] <= 360 && s[1] <= 360 ? "XL" : "Too big";
}
function renderParts() {
  const box = $("#parts"); box.replaceChildren();
  for (const [name, qty] of exportList()) {
    const g = GEO[name]; if (!g) continue;
    const s = [0, 1, 2].map((i) => g.bbox[1][i] - g.bbox[0][i]);
    const row = document.createElement("div"); row.className = "part";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = `pick-${name}`; cb.checked = selected.has(name);
    cb.setAttribute("aria-label", `Include ${PART_INFO[name].label}`);
    cb.addEventListener("change", () => { cb.checked ? selected.add(name) : selected.delete(name); });
    const pn = document.createElement("div"); pn.className = "pn";
    const btn = document.createElement("button"); btn.type = "button";
    btn.textContent = `${partLabel(name)}${qty > 1 ? ` ×${qty}` : ""}`;
    btn.title = "Show this part on its own";
    btn.addEventListener("click", () => { focus = name; lastViewKey = ""; $("#focusName").textContent = partLabel(name); $("#focusPill").classList.add("show"); composeScene(); });
    const pd = document.createElement("span"); pd.className = "pd";
    pd.textContent = `${s.map((v) => v.toFixed(0)).sort((a, b) => b - a).join(" × ")} mm${PART_INFO[name].note ? " · " + PART_INFO[name].note : ""}`;
    pn.append(btn, pd);
    const bed = document.createElement("span"); const b = bedFor(name);
    bed.className = `bed ${b === "XL" ? "xl" : ""}`; bed.textContent = b;
    row.append(cb, pn, bed); box.append(row);
  }
}

function partLabel(n) { return n === "ringExt" && cfg.shell.join !== "screws" ? "Extension ring" : PART_INFO[n].label; }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function readme(sizes, projNotes = []) {
  const d = derive(cfg), ln = legNumbers(), lines = [];
  const tl = (TABLETS[cfg.tablet.preset] || TABLETS.custom).label;
  lines.push("CASSETTE BOOTH — PRINT PACK", "", `Tablet: ${tl}, ${cfg.orientation}`, `Face: ${d.Sw} x ${d.Sh} mm (${cfg.fitMode === "hug" ? "hugged to this tablet" : "universal " + d.Cw + " mm cassette"}), head depth ${assembly(cfg).headDepth.toFixed(0)} mm (${mountOf(cfg) === "wall" ? "wall case" : `${cfg.shell.nExt} extension rings`}), ${mountOf(cfg)} mount${d.dock ? ", USB-C dock" : ""}`, "");
  if (projNotes.length) lines.push("PRUSASLICER PROJECTS (open in PrusaSlicer 2.9 or newer: File > Open project)", ...projNotes,
    "  Each opens with the printer, print and filament presets selected and every part already placed on its bed, with the",
    "  per-part settings below applied as object settings. Use Slice all, then Export all G-codes. If your installed profiles",
    "  are a newer version, a few values may show as modified; that's expected.", "");
  lines.push("PARTS");
  for (const [name, qty] of exportList()) {
    if (!sizes[name]) continue;
    lines.push(`  ${String(qty).padStart(2)} x ${partLabel(name).padEnd(16)} ${sizes[name].map((v) => v.toFixed(0)).join(" x ")} mm   ${bedFor(name)}${PART_INFO[name].note ? "  (" + PART_INFO[name].note + ")" : ""}`);
  }
  if (cfg.fitMode === "hug") lines.push("", "BEZEL LOCK: the iPad lies face-forward in the tray; the frame lip covers " + cfg.cass.overlap + " mm of its black glass border.",
    "  Stick " + cfg.cass.liner + " mm felt or microfiber tape on the back of the lip so the glass never touches bare plastic.",
    d.dock ? "  The USB-C plug stands fixed in the dock clip; the iPad plugs onto it as the cassette drops in." : "  Use a right-angle USB-C cable whose plug fits in " + cfg.cass.portGap + " mm beside the port; the cable exits backward through the tray.");
  if (PRESET_BASE) {
    const ps = printSettings(cfg, PRESET_BASE), xlB = PRESET_BASE[presetKey(cfg, "xl")], coB = PRESET_BASE[presetKey(cfg, "coreone")];
    const row = ([k, v, note]) => `  ${k}: ${v}${note ? ` (${note})` : ""}`;
    lines.push("", `PRINT SETTINGS: ${ps.nozzle} mm nozzle, ${ps.material} (the .3mf projects carry all of this; the STLs are in print orientation)`,
      `  ${ps.reminder}`,
      `  XL: ${xlB.printer} / ${xlB.print} / ${xlB.filament}.`,
      `  Core One (base and ferrules): ${coB.printer} / ${coB.print} / ${coB.filament}.`,
      ...(ps.plaNote ? [`  ${ps.plaNote}`] : []),
      "", " Shell geometry for this nozzle (walls in whole extrusion widths, skins in whole layers; outer size and fits unchanged)",
      ...ps.geometry.map(row), "", " Slicer settings", ...ps.settings.map(row), "", ` ${ps.material}`, ...ps.matRows.map(row),
      "", " Orientation (already set in the STLs and projects)", ...ps.orientation.map(row),
      "", " Also: smooth or satin PEI with a thin wipe of glue stick; elephant-foot compensation 0.2 mm (in the profiles); fan 100% on bridges.",
      `  ${cfg.fitMode === "hug" ? "No supports on any part." : "No supports except the universal cassette (on, for its back ledge)."}`,
      "  Fit: joints 0.2 mm/side glue gap, cassette 0.5 mm/side in its slot, diffuser 0.3 mm/side, leg threads 0.8 mm on diameter.",
      "  Print one ring's socket corner and the frame's tongue corner as a test before the full set.", "");
  }
  lines.push("HARDWARE");
  const I = insertSpec(cfg), M = `M${I.screw}`, nRings = 1 + cfg.shell.nExt, mt = mountOf(cfg), dk = d.dock;
  const glue = cfg.shell.join !== "screws";
  const baseIns = mt === "wall" ? 0 : 4;
  const nIns = (glue ? baseIns : baseIns + 4 + 4 * nRings) + (cfg.cap.lock === "screws" ? 2 : 0);
  if (nIns) {
    lines.push(`  ${nIns} x ${M} heat-set inserts, ${I.len} mm long (printed holes ${I.hole} mm, ${I.depth.toFixed(1)} mm deep):`);
    lines.push(glue ? `       4 in the ${mt === "post" ? "post cap" : "hub"} top` : `       4 in the frame's rear face, 4 in the rear lugs of every ring, 4 in the ${mt === "post" ? "post cap" : "hub"} top`);
    if (!glue) lines.push(`  ${4 * nRings} x ${M} x ${screwLen(6, I)} mm socket head: ring-to-ring joints (through each ring's front lugs)`);
  }
  if (glue) lines.push("  Glue: PETG or PLA - 2-part epoxy (30-minute gives time to align) or gel CA. ASA/ABS - acetone or ABS slurry.");
  if (!glue && mt !== "wall") lines.push(`  8 x ${M} x ${screwLen(cfg.back.t - I.head_h, I)} mm: back panel (counterbored, from outside; 4 used, 4 spare holes)`);
  if (mt !== "wall") lines.push(`  4 x ${M} x ${screwLen(9 - I.head_h + 4, I)} mm: ${mt === "post" ? "post cap" : "hub"} to ring 1 (from inside, through the bottom boss)`);
  if (mt === "tripod") {
    if (ln) lines.push(`  3 x ${(cfg.legs.dowel / 25.4).toFixed(2)}" hardwood dowel, cut ${(ln.cut / 25.4).toFixed(1)}" (${ln.cut.toFixed(0)} mm) each`);
    lines.push("  Epoxy + 5 mm pin or screw through each ferrule cross-hole");
  } else if (mt === "post") {
    const pn = postNumbers(), pl = poleOf(cfg);
    lines.push(`  1 x ${pl.label}, cut to ${pn.pole} mm (${(pn.pole / 25.4).toFixed(1)}")`,
      "  2 x M5 heat-set insert (9.5 mm) + 2 x M5 x 16 thumb screw: one in the post cap, one in the floor flange",
      "  4 x #8 x 1-1/4\" (4 x 30 mm) countersunk wood screws: flange to the base",
      `  Plywood 18 mm (3/4"): ${pn.layers} x ${pn.B} x ${pn.B} mm, wood glue, 4 rubber feet${pn.addKg > 0 ? `, about ${Math.ceil(pn.addKg)} kg of weight under the base for busy events` : ""}`);
  } else {
    const w = wallNumbers();
    lines.push(`  2 x #8 or M4 pan-head screws with wall anchors rated 10 kg+ (or one into a stud): ${w.span} mm apart, level, heads 3 mm off the wall`,
      `  The tops of the keyhole slots sit ${w.lockH.toFixed(0)} mm (${(w.lockH / 25.4).toFixed(1)}") off the floor for a ${(cfg.legs.camHeight / 25.4).toFixed(1)}" camera height`);
  }
  if (dk) lines.push(`  USB-C dock: ${(DOCK_PLUGS[cfg.dock.brand] || DOCK_PLUGS.custom).label}${DOCK_PLUGS[cfg.dock.brand] && DOCK_PLUGS[cfg.dock.brand].url ? " - " + DOCK_PLUGS[cfg.dock.brand].url : ""}`,
    `       plug head ${dk.w} x ${dk.t} x ${dk.len} mm, cable ${dk.cable} mm (measure yours). 2 x M3 x 8 button head + 2 x M3 x 4 short heat-set inserts, 1 small zip tie`);
  else lines.push(`  Right-angle USB-C cable (${mt === "wall" ? "leaves through the notch in the bottom, or the hole in the wall plate" : mt === "post" ? (postSpec(cfg).hollow ? "runs down inside the pole" : "drops beside the pole; clip it to the back") : "routes down through the base"})`);
  if (cfg.led.on && stripOf(cfg)) { const S = stripOf(cfg), L = d.led;
    lines.push(`  LED strip: ${S.label} - ${S.url}`, `       one piece of ${L.leds} LEDs (${L.cutLen.toFixed(0)} mm, from a ${L.reel} m reel)${S.edge ? ", standing on its edge with the LEDs facing out" : ", flat, LEDs forward"}. Power: ${S.power} ${S.volts} V, ${ledPower().full} A at full white.`); }
  if (cfg.led.on && stripOf(cfg) && stripOf(cfg).usb) lines.push(`  One 2-port USB charger at the outlet: USB-C (PD, 20 W+) for the iPad, USB-A for the LED controller (${ledPower().half} A with the controller at half brightness, ${ledPower().full} A for full). Both cables run down through the ${mountOf(cfg) === "wall" ? "notch in the bottom" : "base"}.`);
  if (cfg.led.on && !stripOf(cfg)) lines.push(`  LED strip up to ${cfg.led.w - 1} mm wide that bends sideways (zig-zag / S-shape). One piece, ${d.led.strip.toFixed(0)} mm (${(d.led.strip / 25.4).toFixed(1)}"), cut at the nearest mark below that.`);
  if (cfg.back.mode !== "none" && mt !== "wall") lines.push(`  Back: ${holes.all.filter(isOn).length} ${cfg.back.mode} holes, ${cfg.back.d} mm x ${cfg.back.pitch} pitch on a ${cfg.back.grid} mm grid (an estimate of Thread Boards' 12 mm thread: print the test coupon first)`);
  lines.push("", "ASSEMBLY (the pictures are in instructions.html)");
  const A = [];
  if (nIns) A.push(`Melt the inserts in (${mt === "post" ? "post cap" : "hub"} top${dk ? ", the two under the slot floor for the dock clip" : ""}${glue ? "" : ", frame rear face, rear lugs of every ring"}).`);
  else if (dk) A.push("Melt the two M3 short inserts into the slot floor for the dock clip.");
  A.push(glue ? `Dry-fit, then glue the frame onto ${mt === "wall" ? "the wall case" : "ring 1"}. Clamp or tape, check the seam all round.` : "Screw ring 1 to the frame from inside.");
  if (cfg.led.on) A.push(`LED: press the strip's lead into the slot at the top of the ${cfg.led.feed === "right" ? "right" : "left"} side (as you face the booth) and feed its plug into the box. Lay the strip down that side, across the bottom and up the other side; cut at the last mark before the shoulder. Press in the diffuser.`);
  if (dk) A.push("Dock: push the cable's far end down through the passage under the slot into the box. Slide the plug into the clip from the front, zip-tie the cable right under the clip floor, then screw the clip onto the slot floor (reach down from the top).");
  A.push(mt === "wall" ? "Glue on the wall plate, on a flat table so it squares the case." : glue ? "Glue each ring, then the back panel last on a flat table, one joint at a time." : "Screw on each ring (they alternate A, B), then the back panel.");
  if (mt === "tripod") A.push("Screw the drum to ring 1 from inside. Epoxy and pin the ferrules onto the dowels, then thread them into the drum.");
  if (mt === "post") A.push("Screw the post cap to ring 1 from inside. Build the base (see the page's guide), screw on the flange, put the pole in both, snug the thumb screws.");
  if (mt === "wall") A.push("Drill two level holes, screws 3 mm proud. Hang the case: heads into the round holes, then slide down.");
  A.push(`Felt on the back of the lip. ${dk ? "iPad face-down in the tray, then slide the cassette down: the plug goes in by itself." : "iPad in the tray, plug in, then slide the cassette down until flush."} Lift it out by the finger scoop.`);
  A.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  lines.push("", "BOOTH CODE (paste into the configurator: Export > Restore a booth)", `  ${boothCode || "(see booth-config.json)"}`);
  return lines.join("\n");
}

$("#exportBtn").addEventListener("click", async () => {
  const msg = $("#exportMsg"), btn = $("#exportBtn");
  msg.classList.remove("err");
  const parts = exportList().map(([n]) => n).filter((n) => selected.has(n) && GEO[n]);
  if (!parts.length) { msg.textContent = "Select at least one part."; return; }
  if (validate(cfg).some((i) => i.level === "error")) { msg.classList.add("err"); msg.textContent = "Fix the highlighted settings first."; return; }
  // on claude.ai the host's downloads capability saves the file; anywhere else (Netlify, local) a plain browser download
  let downloads = null;
  try { downloads = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) {}
  if (!downloads) downloads = { save: async ({ filename, data }) => {
    const url = URL.createObjectURL(data), a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  } };
  btn.disabled = true;
  try {
    const qty = Object.fromEntries(exportList()), labels = Object.fromEntries(parts.map((p) => [p, partLabel(p)]));
    const title = `cassette-booth-${slug(cfg.tablet.preset)}-${cfg.orientation}`;
    if (!PRESET_BASE) await presetsReady;
    const ps = printSettings(cfg, PRESET_BASE);
    const res = await call({ type: "export", cfg: clone(cfg), parts, qty, labels, title, per: ps.per }, (p) => {
      msg.textContent = p === "projects" ? "Laying the parts out on PrusaSlicer beds…" : `Generating ${PART_INFO[p].label.toLowerCase()} with full threads…`;
    });
    msg.textContent = "Packing the zip…";
    const zip = new JSZip(), sizes = {};
    const order = exportList().map(([n]) => n);
    for (const p of parts) {
      const f = res.files[p]; sizes[p] = f.size;
      const n = String(order.indexOf(p) + 1).padStart(2, "0");
      let name = `${n}_${slug(partLabel(p))}`;
      if (p === "cassette") name += `_${slug(cfg.tablet.preset)}_${cfg.orientation}`;
      const qty = exportList().find(([x]) => x === p)[1];
      if (qty > 1) name += `_x${qty}`;
      zip.file(`${name}.stl`, f.buf);
    }
    // PrusaSlicer projects (3MF): printer, print and filament presets plus per-part settings, parts already on their beds
    const projNotes = [];
    for (const pj of res.projects || []) {
      const P = PRINTERS[pj.printer];
      const key = presetKey(cfg, pj.printer), B = PRESET_BASE[key];
      const conf = applyConfig(await (await fetch(`presets/${key}.config`)).text(), ps[pj.printer]);
      const z3 = new JSZip();
      for (const [path, text] of Object.entries(pj.files)) z3.file(path, text);
      z3.file("Metadata/Slic3r_PE.config", conf);
      zip.file(`${pj.name}.3mf`, await z3.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } }));
      projNotes.push(`  ${pj.name}.3mf  ${P.label}, ${pj.beds} bed${pj.beds > 1 ? "s" : ""}: ${B.printer} · ${B.print} · ${B.filament}`);
    }
    boothCode = await encodeCode(cfg);
    zip.file("README.txt", readme(sizes, projNotes));
    zip.file("booth-config.json", JSON.stringify({ code: boothCode, ...cfg }, null, 2));
    zip.file("instructions.html", howtoPage(howtoInfo()));
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    msg.textContent = `Ready: ${(blob.size / 1e6).toFixed(1)} MB. Saving…`;
    await downloads.save({ filename: `cassette-booth-${slug(cfg.tablet.preset)}-${cfg.orientation}.zip`, data: blob });
    msg.textContent = "Saved.";
  } catch (e) {
    msg.classList.add("err");
    msg.textContent = e && e.code === "declined" ? "Download cancelled." : `Export failed: ${e.message || e.code || e}`;
  }
  btn.disabled = false;
});

// ------------------------------------------------------------------ booth code (restore a previous booth)
// PB1. + base64url(deflate(JSON settings)). The same code is in the README and booth-config.json of every download.
var boothCode = "";
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0));
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function encodeCode(c) {
  const json = new TextEncoder().encode(JSON.stringify(c));
  try { return "PB1." + b64u(await pipe(json, new CompressionStream("deflate-raw"))); } catch (e) { return "PB0." + b64u(json); }
}
async function decodeCode(code) {
  const m = /^(PB[01])\.([A-Za-z0-9_-]+)$/.exec(String(code).trim());
  if (!m) throw new Error("That doesn't look like a booth code (they start with PB1.)");
  const raw = unb64u(m[2]);
  return JSON.parse(new TextDecoder().decode(m[1] === "PB1" ? await pipe(raw, new DecompressionStream("deflate-raw")) : raw));
}
function restore(obj, how) {
  const { code, ...rest } = obj || {};
  if (!rest.tablet || !rest.shell) throw new Error("No booth settings in that file.");
  cfg = fromSaved(rest); focus = null; acked.clear(); printChanges = [];
  changed(0);
  $("#codeMsg").textContent = `Restored ${how}: ${(TABLETS[cfg.tablet.preset] || TABLETS.custom).label}, ${cfg.orientation}, ${mountOf(cfg)}.`;
}
$("#codeLoad").addEventListener("click", async () => {
  try { restore(await decodeCode($("#codeIn").value), "from the code"); } catch (e) { $("#codeMsg").textContent = e.message; }
});
$("#cfgFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const j = JSON.parse(await f.text()); restore(j, `from ${f.name}`); } catch (err) { $("#codeMsg").textContent = err.message || "Couldn't read that file."; }
  e.target.value = "";
});
$("#codeCopy").addEventListener("click", async () => {
  const code = await encodeCode(cfg);
  $("#codeIn").value = code;
  try { await navigator.clipboard.writeText(code); $("#codeMsg").textContent = "Booth code copied. Paste it here any time to bring this booth back."; }
  catch (e) { $("#codeIn").select(); $("#codeMsg").textContent = "Booth code is in the box above; copy it from there."; }
});
// a code in the page address (#cfg=PB1....) loads on open
(async () => { const m = /[#&]cfg=([^&]+)/.exec(location.hash); if (m) try { restore(await decodeCode(decodeURIComponent(m[1])), "from the link"); } catch (e) {} })();

// ------------------------------------------------------------------ picture instructions
function howtoInfo() {
  const d = derive(cfg), mt = mountOf(cfg), ln = legNumbers();
  const parts = exportList().map(([n, q]) => [partLabel(n), q, bedFor(n) || PART_INFO[n].printer]);
  const pn = mt === "post" ? postNumbers() : null, w = mt === "wall" ? wallNumbers() : null;
  return {
    title: "Booth", subtitle: `${(TABLETS[cfg.tablet.preset] || TABLETS.custom).label}, ${cfg.orientation} · ${mt} · ${cfg.print.nozzle} mm ${cfg.print.material}`,
    mount: mt, dock: !!d.dock, led: cfg.led.on, ledLeds: stripOf(cfg) ? d.led.leds : 0, ledEdge: !!(stripOf(cfg) && stripOf(cfg).edge), ledFeed: cfg.led.feed === "right" ? "right" : "left", nExt: mt === "wall" ? 0 : cfg.shell.nExt, parts, nozzle: cfg.print.nozzle, material: cfg.print.material,
    backHoles: mt !== "wall" && cfg.back.mode !== "none", liner: cfg.cass.liner,
    legCut: ln ? `${(ln.cut / 25.4).toFixed(1)}″` : "", poleCut: pn ? `${pn.pole} mm` : "", base: pn ? `${pn.B} mm` : "", layers: pn ? pn.layers : 0,
    keySpan: w ? w.span : 0, keyHeight: w ? `${(w.lockH / 25.4).toFixed(1)}″ up` : "",
    plug: d.dock ? ((DOCK_PLUGS[cfg.dock.brand] || {}).label || "Plug").split(" ")[0] + " plug" : "", code: boothCode,
  };
}
$("#howtoBtn").addEventListener("click", async () => {
  boothCode = await encodeCode(cfg);
  $("#howtoBody").innerHTML = `<style>${HOWTO_CSS}</style><div class="howto-doc"><h1>Booth</h1><p class="hsub">${howtoInfo().subtitle}</p>${howtoBody(howtoInfo())}</div>`;
  $("#howto").showModal();
});
$("#howtoClose").addEventListener("click", () => $("#howto").close());
$("#howtoSave").addEventListener("click", async () => {
  const data = new Blob([howtoPage(howtoInfo())], { type: "text/html" });
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) {}
  if (dl) { try { await dl.save({ filename: "booth-instructions.html", data }); } catch (e) {} return; }
  const url = URL.createObjectURL(data), a = Object.assign(document.createElement("a"), { href: url, download: "booth-instructions.html" });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
});

// ------------------------------------------------------------------ go
syncControls();
rebuild(0);
