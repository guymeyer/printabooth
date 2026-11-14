# Cassette Booth

A browser configurator for a 3D-printed, modular iPad photo booth. Pick the tablet, orientation and options, preview the head and the full kiosk in 3D, and export print-ready parts.

![Head preview](docs/screenshot.png)

## The design

- **Cassette:** the iPad lies in a tray (hugged to the tablet, or a one-size-fits-most cassette) that slides into the shell from the top. A finger scoop and a grip ridge lift it back out. The cassette's top band wraps the upper corners as a contrasting accent color.
- **Shell:** a rounded rectangle built from a front frame, a main shell (ring 1) and any number of extension rings, glued with lap joints. A 2 mm front lip holds the iPad by its glass border; the camera notch never shows the iPad's metal edge.
- **LED halo:** a U-shaped front channel around the sides and bottom, with a translucent diffuser.
- **Back panel:** Thread Boards-style threaded holes, laid out in the page's grid editor.
- **Base and legs:** a drum centred under the head, with three wood-dowel legs that thread in through printed ferrules on 45-degree self-centring seats. Camera height and splay are set in the page.

Every printed part is checked to print without supports (except the universal cassette's back ledge), with no wall under 1.4 mm and no overlaps in the assembly.

## Export

The download is a zip with:

- STLs in print orientation, full-detail threads.
- Two PrusaSlicer 2.9+ projects: one for a Prusa XL (single tool, 0.6 nozzle) and one for a Core One (HF 0.4). Each loads with its printer, print and filament presets selected and every part already placed on its bed, across up to nine beds, with per-part settings applied.
- A README with quantities, hardware, print settings and assembly order, plus the settings as JSON.

## Layout

| Path | What |
|---|---|
| `app/` | The configurator. `index.html` (UI, a body fragment), `app.js` (UI, three.js scene, export), `geom.js` (all geometry, on manifold-3d), `worker.js` (geometry off the main thread), `pack3mf.js` (bed packing and the PrusaSlicer 3MF writer), `xl.config` and `coreone.config` (flattened PrusaSlicer presets), plus vendored three.js, manifold-3d and JSZip. |
| `checks/` | Node scripts that build the parts and verify them: assembly overlaps, single-body parts, overhangs and thin walls per part, wall thickness around the LED channel, tray and base sockets, ferrule fit, and the 3MF layout. |
| `tools/build.py` | Builds the static site into `build/` (used by Netlify). |
| `tools/preview.py` | Builds and serves the configurator locally. |
| `tools/prusa/flatten.py` | Regenerates the preset configs from PrusaSlicer's `PrusaResearch.ini`. |

## Run it

```sh
python3 tools/preview.py      # http://localhost:8765/
npm install                   # manifold-3d, for the checks
npm run check                 # geometry checks
npm run check:print           # full print audit of the default hugged landscape setup (slow)
```

## Deploy

`netlify.toml` builds the site with `python3 tools/build.py` and publishes `build/`, with the right content types for the WebAssembly kernel and the preset configs. Connect the repo in Netlify (Add new site → Import an existing project → GitHub → `printabooth`) and every push to `main` deploys. Exports save as a normal browser download outside claude.ai.

## Notes

- Tablet presets are estimates from published specs. Measure your iPad and use Custom size before a big print. The tray's pocket corners are deliberately tighter than any iPad's, so the corner radius doesn't need to be exact.
- The `.3mf` presets come from the profile bundle shipped with PrusaSlicer 2.9.7. If your installed profiles are newer, a few values may show as modified when you open a project.
