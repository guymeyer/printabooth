// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// Print settings from the Nozzle and Material settings: the values written into the PrusaSlicer projects, the README and the
// on-page summary all come from printSettings(), so they always agree with each other and with the snapped geometry.
import { derive, mountOf } from "./geom.js";

export const MATERIALS = ["PETG", "PLA"];
export const nozzleOf = (c) => derive(c).plan.nozzle;
export const materialOf = (c) => (MATERIALS.includes(c.print && c.print.material) ? c.print.material : "PETG");
// preset files under presets/ (flattened PrusaSlicer system presets, see tools/prusa/flatten.py)
export const presetKey = (c, printer) => (printer === "xl" ? `xl-${nozzleOf(c)}-${materialOf(c).toLowerCase()}` : `coreone-${materialOf(c).toLowerCase()}`);

// nozzle temperature: the generic filament's 0.4 nozzle temperature plus an offset by nozzle size (bigger nozzle, more flow,
// more heat). Generic presets so any brand works; the maker's range on the spool label wins if it disagrees.
const TEMP_OFFSET = { PETG: { 0.4: 0, 0.6: 5, 0.8: 10 }, PLA: { 0.4: 0, 0.6: 0, 0.8: 5 } };
export const PLA_NOTE = "PLA softens above about 55 °C. Not recommended for hot cars, direct sun or outdoor summer events. Use PETG for those.";

const num = (v) => parseFloat(String(v).split(",")[0]);
const lines = (t, ew) => Math.round((t / ew) * 100) / 100;
const perimetersFor = (walls, ew) => Math.max(2, ...walls.filter((t) => t > 0 && t / ew <= 8.01).map((t) => Math.ceil(Math.round(t / ew) / 2)));

// base: presets/index.json (preset values the overrides start from)
export function printSettings(c, base) {
  const d = derive(c), P = d.plan, mat = materialOf(c), nz = P.nozzle;
  const ironing = !!(c.print && c.print.ironing);
  const xlBase = base[presetKey(c, "xl")], coreBase = base[presetKey(c, "coreone")];

  // same for both materials (XL: everything; Core One keeps its own 0.4 HF widths and layer height)
  const surface = (lh) => ({
    top_solid_layers: Math.max(4, Math.ceil(1.2 / lh - 1e-9)), bottom_solid_layers: Math.max(4, Math.ceil(1.2 / lh - 1e-9)),
    fill_density: "15%", fill_pattern: "gyroid", top_fill_pattern: "monotonic",
    top_solid_infill_speed: "50%",                     // PrusaSlicer reads a percentage as a share of the solid infill speed
    seam_position: "rear", scarf_seam_placement: "everywhere", scarf_seam_only_on_smooth: 0,   // scarf also in the V-groove
    perimeters: 2,
  });
  const widths = Object.fromEntries(["extrusion_width", "perimeter_extrusion_width", "external_perimeter_extrusion_width",
    "infill_extrusion_width", "solid_infill_extrusion_width", "top_infill_extrusion_width"].map((k) => [k, P.ew]));
  // material, by nozzle size (the Core One stays a 0.4 HF nozzle)
  const ref = base[`xl-0.4-${mat.toLowerCase()}`];
  const material = (b, nozzle) => {
    const off = TEMP_OFFSET[mat][nozzle] || 0, r = nozzle === 0.4 ? b : ref, o = {
      temperature: num(r.temperature) + off, first_layer_temperature: num(r.first_layer_temperature) + off,
      filament_max_volumetric_speed: mat === "PETG" && nozzle === 0.8 ? Math.round(num(b.filament_max_volumetric_speed) * 0.8 * 10) / 10 : num(b.filament_max_volumetric_speed),
      ironing: ironing ? 1 : 0, ironing_type: "topmost",
    };
    if (mat === "PLA") Object.assign(o, { cooling: 1, fan_always_on: 1, min_fan_speed: 100, max_fan_speed: 100, bridge_fan_speed: 100, disable_fan_first_layers: 3, full_fan_speed_layer: 4 });
    return o;
  };
  const xl = { ...widths, layer_height: P.lh, ...surface(P.lh), ...material(xlBase, nz) };
  const coreone = { ...surface(num(coreBase.layer_height)), ...material(coreBase, 0.4) };

  // per part: enough perimeters to fill its thin walls (whole lines thanks to the geometry snapping), at least 2
  const ringWalls = [d.wall, d.lapT, P.sock];
  const frameWalls = [d.lapT, ...(c.led.on ? [d.ledSkin, d.ledGap] : [d.hug ? P.sideNoLed : 0])];
  const per = {
    frame: { perimeters: perimetersFor(frameWalls, P.ew) },
    ring1: { perimeters: perimetersFor([...ringWalls, d.cradle], P.ew) },
    ringExt: { perimeters: perimetersFor(ringWalls, P.ew) },
    back: { perimeters: perimetersFor([P.sock], P.ew) },
    cassette: c.fitMode === "universal" ? { support_material: 1, support_material_auto: 1 } : {},
    topKey: { perimeters: 3 },
    diffuser: { perimeters: 2, fill_density: "100%", brim_width: 2 },
    hub: { perimeters: 5, fill_density: "40%", fill_pattern: "gyroid" },
    ferrule: { perimeters: 6, fill_density: "100%", brim_width: 5 },
  };
  per.ringExt2 = per.ringExtLast = per.ringExt; per.cap = per.cassKey = {};
  per.wallCase = per.ring1; per.wallBack = per.back;
  per.postCap = per.flange = { perimeters: 5, fill_density: "40%", fill_pattern: "gyroid" };
  per.dockClip = { perimeters: 4, fill_density: "100%" };
  per.threadTest = per.back;

  // what shows on the page and in the README
  const mm = (v) => `${(+v).toFixed(2)} mm`, ln = (t) => `${mm(t)} (${lines(t, P.ew)} lines)`, ly = (t) => `${mm(t)} (${Math.round(t / P.lh)} layers)`;
  const geometry = [
    ["Ring walls", ln(d.wall), `set ${c.shell.wall} mm, outer size unchanged`],
    ["Glue tongue", ln(d.lapT), "socket follows, 0.2 mm/side gap kept"],
    ["Skin beside the socket", ln(P.sock)],
    ...(c.led.on ? [["LED outer wall", ln(d.ledSkin), `set ${c.led.skin} mm`], ["LED wall to the slot", d.ledGap / P.ew > 8 ? `${mm(d.ledGap)} (infilled)` : ln(d.ledGap)],
      ["LED channel", mm(d.ledW), `set ${c.led.w} mm; takes the difference`], ["LED channel depth", ly(d.ledDepth)]]
      : d.hug ? [["Frame side wall", ln(P.sideNoLed), "cassette tray absorbs it"]] : []),
    ["Scoop cradle", ln(d.cradle)],
    ["Front lip", ly(d.lip), `set ${c.shell.lip} mm`],
    ["Back plate", ly(d.backT), `set ${c.back.t} mm`],
    ["Seam groove", d.seamX ? `${0.4} mm V on the underside, ${d.seamX} mm off centre` : "0.4 mm V on the underside, centred (the base covers it)"],
  ];
  const settings = [
    ["Nozzle / extrusion width / layer", `${nz} / ${P.ew} / ${P.lh} mm`],
    ["Perimeters", `frame ${per.frame.perimeters}, rings ${per.ring1.perimeters}, back ${per.back.perimeters} (min 2)`],
    ["Top / bottom solid layers", `${xl.top_solid_layers} / ${xl.bottom_solid_layers}`],
    ["Infill", "15% gyroid, top monotonic at half solid speed"],
    ["Seam", "Rear, on the groove, scarf on"],
  ];
  const off = TEMP_OFFSET[mat][nz] || 0;
  const matRows = [
    ["Filament", `Generic ${mat}, any brand (preset ${xlBase.filament})`],
    ["Nozzle temperature", `${xl.temperature} °C (generic ${mat} ${num(ref.temperature)}${off ? ` +${off} for the ${nz} nozzle` : ""}), first layer ${xl.first_layer_temperature} °C. Stay inside the range on your spool.`],
    ["Max volumetric speed", `${xl.filament_max_volumetric_speed} mm³/s${xl.filament_max_volumetric_speed !== num(xlBase.filament_max_volumetric_speed) ? ` (80% of ${num(xlBase.filament_max_volumetric_speed)})` : " (preset)"}`],
    ["Cooling", mat === "PLA" ? "100% fan from layer 4" : "Filament preset"],
    ["Ironing", ironing ? "On, topmost surfaces only" : "Off"],
  ];
  const mt = mountOf(c);
  const orientation = [
    ["Front frame", "Front face down on the sheet (the visible face gets the sheet's finish); seam groove at the back of the bed"],
    [mt === "wall" ? "Wall case" : "Rings", "Upright, front edge down: every visible face is a wall; underside (seam groove) toward the back of the bed"],
    [mt === "wall" ? "Wall plate" : "Back panel", mt === "wall" ? "Wall face down (keyhole pockets open upward)" : "Outer face down on the sheet"],
    d.direct ? ["Top key", "Face down"] : ["Cassette", d.hug ? "Back down" : "Face down, supports under the back ledge"],
    ...(mt === "tripod" ? [["Diffuser / base / ferrules", "Flat / top face down / stud down"]] : mt === "post" ? [["Diffuser / post cap / floor flange", "Flat / disc down / disc down"]] : [["Diffuser", "Flat"]]),
    ...(d.dock ? [["Dock clip", "Back down, open side up"]] : []),
  ];
  const reminder = `Printer, print and filament presets in PrusaSlicer must all match a ${nz} mm nozzle and ${mat}. The projects select the Generic ${mat} filament preset; if you have a preset for your brand, pick its ${nz} mm version and keep the nozzle temperature above.`;
  return { nozzle: nz, material: mat, ew: P.ew, lh: P.lh, xl, coreone, per, geometry, settings, matRows, orientation, reminder, plaNote: mat === "PLA" ? PLA_NOTE : null };
}

// overrides on top of a flattened preset config ("; key = value" lines); vector values get every element replaced
export function applyConfig(text, overrides) {
  const lines = text.split("\n"), idx = new Map();
  lines.forEach((l, i) => { const m = /^; ([a-z0-9_]+) = /.exec(l); if (m) idx.set(m[1], i); });
  for (const [k, v] of Object.entries(overrides)) {
    const i = idx.get(k), val = String(v);
    if (i == null) { lines.splice(lines.length - 1, 0, `; ${k} = ${val}`); continue; }
    const cur = lines[i].slice(lines[i].indexOf(" = ") + 3);
    const n = cur.includes(",") && !/^"/.test(cur) ? cur.split(",").length : 1;
    lines[i] = `; ${k} = ${Array(n).fill(val).join(",")}`;
  }
  return lines.join("\n");
}
