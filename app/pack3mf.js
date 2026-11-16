// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// PrusaSlicer project (3MF) writer: lays the parts out on as many beds as they need (PrusaSlicer 2.9+ multi-bed layout)
// and stores the printer/print/filament system presets plus per-part setting overrides, so the file opens ready to slice.

// which preset file a project loads comes from printsettings.js (presetKey); the per-part settings arrive with the parts
export const PRINTERS = {
  xl: { key: "xl", label: "Prusa XL", bed: [360, 360] },
  coreone: { key: "coreone", label: "Prusa Core One", bed: [250, 220] },
};
export const MAX_BEDS = 9;
const GAP = 12, MARGIN = 6;

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
    for (const rot of it.fixed ? [0] : [0, 1]) {   // fixed: the part's seam groove must stay at the back of the bed
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
export function projectFiles(beds, meshes, bed, c, title, per = {}) {
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
        // modifier boxes follow the part's own triangles in the same mesh, each its own volume
        for (const b of m.mods || []) {
          const v0 = v.length;
          for (const [x, y, z] of [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]])
            v.push(`<vertex x="${num(x ? b.max[0] : b.min[0])}" y="${num(y ? b.max[1] : b.min[1])}" z="${num(z ? b.max[2] : b.min[2])}"/>`);
          for (const [a, bb, cc] of [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]])
            t.push(`<triangle v1="${v0 + a}" v2="${v0 + bb}" v3="${v0 + cc}"/>`);
        }
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
    for (const [k, v] of Object.entries(per[name] || {})) lines.push(meta("object", k, v));
    const fixes = `   <mesh edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>`;
    lines.push(`  <volume firstid="0" lastid="${m.idx.length / 3 - 1}">`, meta("volume", "name", label), meta("volume", "volume_type", "ModelPart"), fixes, `  </volume>`);
    (m.mods || []).forEach((b, i) => {
      const f0 = m.idx.length / 3 + 12 * i;
      lines.push(`  <volume firstid="${f0}" lastid="${f0 + 11}">`, meta("volume", "name", `${b.label}: bridge angle`), meta("volume", "volume_type", "ParameterModifier"),
        meta("volume", "bridge_angle", b.angle), fixes, `  </volume>`);
    });
    lines.push(` </object>`);
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
