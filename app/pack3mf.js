// PrusaSlicer project (3MF) writer: lays the parts out on as many beds as they need (PrusaSlicer 2.9+ multi-bed layout)
// and stores the printer/print/filament system presets plus per-part setting overrides, so the file opens ready to slice.

export const PRINTERS = {
  xl: {
    key: "xl", label: "Prusa XL", file: "xl.config", bed: [360, 360],
    presets: "Original Prusa XL Input Shaper 0.6 nozzle · 0.20mm STRUCTURAL @XLIS 0.6 · Prusament PETG @XL 0.6",
  },
  coreone: {
    key: "coreone", label: "Prusa Core One", file: "coreone.config", bed: [250, 220],
    presets: "Prusa CORE One HF0.4 nozzle · 0.20mm SPEED @COREONE HF0.4 · Prusament PETG @COREONE HF0.4",
  },
};
export const MAX_BEDS = 9;
const GAP = 12, MARGIN = 6;

// per-part overrides on top of the print profile (PrusaSlicer object settings)
export function partSettings(name, c) {
  const shell = { perimeters: 3, fill_density: "15%", fill_pattern: "gyroid" };
  const s = {
    frame: shell, ring1: shell, ringExt: shell, ringExt2: shell, ringExtLast: shell, back: shell, cap: shell, cassKey: shell,
    cassette: c.fitMode === "hug" ? shell : { ...shell, support_material: "1", support_material_auto: "1" },
    diffuser: { perimeters: 2, fill_density: "100%", brim_width: 2 },
    hub: { perimeters: 5, fill_density: "40%", fill_pattern: "gyroid" },
    ferrule: { perimeters: 6, fill_density: "100%", brim_width: 5 },
  }[name] || {};
  return s;
}

// PrusaSlicer's bed grid (BedsGrid::index2grid_coords): bed 0 at the origin, then a growing square spiral into +x/+y
function gridCoords(index) {
  if (index === 0) return [0, 0];
  let id = index + 1, a = 1;
  while ((a + 1) * (a + 1) < id) a++;
  id -= a * a;
  return id <= a ? [a, id - 1] : [id - a - 1, a];
}
// MultipleBeds::bed_gap(): min(100, 0.3 * diagonal of the bed)
export function bedOffset(index, bed) {
  const gap = Math.min(100, 0.3 * Math.hypot(bed[0], bed[1]));
  const [x, y] = gridCoords(index);
  return [x * (bed[0] + gap), y * (bed[1] + gap)];
}

// shelf packing; items: [{w, h, ...}] footprints in mm. Returns beds: [[{item, x, y, rot}]], positions are footprint centres.
export function packBeds(items, bed) {
  const W = bed[0] - 2 * MARGIN, H = bed[1] - 2 * MARGIN;
  const order = items.slice().sort((a, b) => Math.max(b.w, b.h) * Math.min(b.w, b.h) - Math.max(a.w, a.h) * Math.min(a.w, a.h));
  const beds = [];
  const tryBed = (b, it) => {
    for (const rot of [0, 1]) {
      const w = rot ? it.h : it.w, h = rot ? it.w : it.h;
      if (w > W || h > H) continue;
      for (const s of b.shelves) if (h <= s.h && s.x + w <= W) { b.list.push({ item: it, x: s.x + w / 2, y: s.y + h / 2, rot, w, h }); s.x += w + GAP; return true; }
      const top = b.shelves.length ? b.shelves[b.shelves.length - 1].y + b.shelves[b.shelves.length - 1].h + GAP : 0;
      if (top + h <= H) { b.shelves.push({ y: top, h, x: w + GAP }); b.list.push({ item: it, x: w / 2, y: top + h / 2, rot, w, h }); return true; }
    }
    return false;
  };
  for (const it of order) {
    if (!beds.some((b) => tryBed(b, it))) {
      const b = { shelves: [], list: [] };
      if (!tryBed(b, it)) throw new Error(`${it.label} doesn't fit the ${bed[0]} x ${bed[1]} mm bed`);
      beds.push(b);
    }
  }
  // centre each bed's group on the bed
  return beds.map((b) => {
    const x0 = Math.min(...b.list.map((p) => p.x - p.w / 2)), x1 = Math.max(...b.list.map((p) => p.x + p.w / 2));
    const y0 = Math.min(...b.list.map((p) => p.y - p.h / 2)), y1 = Math.max(...b.list.map((p) => p.y + p.h / 2));
    const dx = bed[0] / 2 - (x0 + x1) / 2, dy = bed[1] / 2 - (y0 + y1) / 2;
    return b.list.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  });
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (v) => { const r = Math.round(v * 1e5) / 1e5; return Object.is(r, -0) ? "0" : String(r); };

// meshes: {name: {pos: Float32Array, idx: Uint32Array}} in print orientation, centred in x/y, sitting on z = 0
// beds: output of packBeds, items carry {name, label}
export function projectFiles(beds, meshes, bed, c, title) {
  const objects = [], build = [], modelCfg = [];
  let nextId = 1;
  const first = {};                               // part name -> object id holding its mesh
  const byPart = {};
  beds.forEach((list, bi) => list.forEach((p) => (byPart[p.item.name] ||= []).push({ ...p, bi })));
  for (const [name, places] of Object.entries(byPart)) {
    const m = meshes[name], firstId = nextId;
    places.forEach((p, k) => {
      const id = nextId++;
      if (k === 0) {
        const v = [], t = [];
        for (let i = 0; i < m.pos.length; i += 3) v.push(`<vertex x="${num(m.pos[i])}" y="${num(m.pos[i + 1])}" z="${num(m.pos[i + 2])}"/>`);
        for (let i = 0; i < m.idx.length; i += 3) t.push(`<triangle v1="${m.idx[i]}" v2="${m.idx[i + 1]}" v3="${m.idx[i + 2]}"/>`);
        objects.push(`  <object id="${id}" type="model">\n   <mesh>\n    <vertices>\n${v.join("\n")}\n    </vertices>\n    <triangles>\n${t.join("\n")}\n    </triangles>\n   </mesh>\n  </object>`);
      } else {
        objects.push(`  <object id="${id}" type="model">\n   <components>\n    <component objectid="${firstId}"/>\n   </components>\n  </object>`);
      }
      const [ox, oy] = bedOffset(p.bi, bed);
      const tx = ox + p.x, ty = oy + p.y;
      // 3MF stores the 3x4 matrix column by column (PrusaSlicer's add_transformation)
      const r = p.rot ? [0, 1, 0, -1, 0, 0, 0, 0, 1] : [1, 0, 0, 0, 1, 0, 0, 0, 1];
      build.push(`  <item objectid="${id}" transform="${[...r, tx, ty, 0].map(num).join(" ")}" printable="1"/>`);
    });
    first[name] = firstId;
    const label = places[0].item.objName || places[0].item.label;
    const meta = (type, key, value) => `${type === "object" ? "  " : "   "}<metadata type="${type}" key="${key}" value="${esc(value)}"/>`;
    const lines = [` <object id="${firstId}" instances_count="${places.length}">`, meta("object", "name", label)];
    for (const [k, v] of Object.entries(partSettings(name, c))) lines.push(meta("object", k, v));
    lines.push(`  <volume firstid="0" lastid="${m.idx.length / 3 - 1}">`, meta("volume", "name", label), meta("volume", "volume_type", "ModelPart"),
      `   <mesh edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>`, `  </volume>`, ` </object>`);
    modelCfg.push(lines.join("\n"));
  }
  const date = new Date().toISOString().slice(0, 10);
  const model = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">`,
    ` <metadata name="slic3rpe:Version3mf">1</metadata>`,
    ` <metadata name="Title">${esc(title)}</metadata>`,
    ` <metadata name="Designer"></metadata>`,
    ` <metadata name="Description">${esc(title)}</metadata>`,
    ` <metadata name="CreationDate">${date}</metadata>`,
    ` <metadata name="ModificationDate">${date}</metadata>`,
    ` <metadata name="Application">Cassette Booth Builder</metadata>`,
    ` <resources>`, objects.join("\n"), ` </resources>`,
    ` <build>`, build.join("\n"), ` </build>`,
    `</model>`,
  ].join("\n");
  return {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>`,
    "3D/3dmodel.model": model,
    "Metadata/Slic3r_PE_model.config": `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n${modelCfg.join("\n")}\n</config>\n`,
  };
}
