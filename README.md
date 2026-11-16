# Cassette Booth

A browser configurator for a 3D-printed, modular iPad photo booth. Pick the tablet, orientation and options, preview the head and the full kiosk in 3D, and export print-ready parts.

![Head preview](docs/screenshot.png)

## No cassette (experimental, branch `cassetteless`)

A third fit, "No cassette" ("Just mine, no cassette" in Basic): for one iPad in one orientation. The iPad's pocket is cut straight into the frame (its corner radius plus the fit clearance, plus room for the plug), and it opens up through the top only as a slit the iPad's own width and thickness; the shell fills everything else, so there's no cassette and no key. The iPad slips in from the top, face against the felted lip, and lifts out by its back edge from the finger dish in ring 1, which runs 6 mm below its top edge. The pocket walls carry the button groove, and ring 1's stop has keep-outs for the rear camera bump that run up to the top, so the bump clears as the iPad slides in. With the dock, the clip's back sits in a pocket in the stop. Compared with the snug cassette, the face is about 4 mm smaller each way, the front frame 2.4 mm shallower, and the cassette is one less part. It won't take an iPad in a case. `checks/direct.mjs` places the iPad (with a rear camera bump) in seven booths and checks it touches nothing, that it slides out of the top, and that the slit is no wider than the iPad.

## Basic and Advanced

Two tabs sit at the top of the settings. **Basic** walks through eleven plain questions (which iPad, which way the screen sits, whether other iPads should fit, the USB-C dock, the light ring, how it stands and how high the camera is, room for electronics, the back panel, your printer, colors, and the download), each answered with a dropdown, a switch or a choice of buttons. **Advanced** is the full set of numbered steps with every dimension exposed. Both edit the same booth, so you can switch at any time; anything set to a custom value in Advanced shows as its own choice in Basic. The page remembers which tab you used.

## The design

- **Cassette:** the iPad lies in a tray (hugged to the tablet, or a one-size-fits-most cassette) that slides into the shell from the top. A finger scoop and a grip ridge lift it back out. The cassette's top band wraps the upper corners as a contrasting accent color.
- **Shell:** a rounded rectangle built from a front frame, a main shell (ring 1) and any number of extension rings, glued with lap joints. A 2 mm front lip holds the iPad by its glass border; the camera notch never shows the iPad's metal edge.
- **LED halo:** one unbroken U-shaped channel around the sides and bottom of the face, with a one-piece translucent diffuser, lit end to end by a single strip. The top 22 mm of each side is an unlit end bay: a tunnel under the frame's own face, with no separate cover and no seam, dug 3 mm deeper behind. The strip starts on the side you pick, 8 mm up inside that tunnel. Its lead turns in the 14 mm above, into a slot straight back into the box. The plug is too big for the slot, so you cut it off, thread the wires and rejoin them inside the box with three lever connectors. The strip runs down, across and up the other side, and its cut end slides 8 mm up the other tunnel. The face hides both ends, the solder pads and the lead. It has to bend sideways round the two bottom corners with its LEDs facing forward, so the page offers strips that do: TOPXCDZ 5 V RGB (the default: a USB controller, rejoined with lever connectors, no soldering), DEMASLED 12 V white, BTF-LIGHTING 12 V RGB, or Adafruit's NeoPixel side-light strip standing on its edge. Picking one sizes the channel and gives the cut length in LEDs, the reel to buy and the power it needs. The cable holes in the base take a USB-A plug, so the LED and iPad cables both run down to one 2-port charger.
- **Back panel:** Thread Boards-style threaded holes, laid out in the page's grid editor.
- **Mount:** three choices.
  - **Tripod:** a drum centred under the head, with three wood-dowel legs that thread in through printed ferrules on 45-degree self-centring seats.
  - **Post:** one pole you supply (EMT conduit or a hardwood dowel) between a printed post cap under the head and a printed floor flange on a plywood base. The page sizes the base, gives the pole's cut length, how hard a push tips it, and a step-by-step guide to build the base.
  - **Wall:** the same front frame and cassette on a shallow wall case and a wall plate with two keyholes. The page gives the screw spacing and the height to hang it at.
- **USB-C dock (portrait, hugged tray):** a fixed plug in a printed clip at the bottom of the slot, so the iPad plugs itself in as the cassette drops in. Pick Apple, Anker or Amazon Basics (links to each), or measure your own plug.

Overhangs are designed out where possible, and the bridges that remain are pinned in the slicer:

- **LED channel floor.** The frame prints face down, so the channel floor is bridged. Left to itself, PrusaSlicer bridged parts of it lengthwise, even straight runs, and the lines sagged. The frame's 3MF project now carries invisible modifier boxes that set the bridge angle for each run: straight across the sides, the end bays and the bottom, and along the radius at each bottom corner. `checks/slicer-bridges.mjs` slices the project in PrusaSlicer itself and fails if any bridge line over the channel is longer than 12 mm (it skips when `prusa-slicer` isn't installed).
- **Diffuser seat.** The ledge the diffuser rests on is a 45° chamfer rather than a 1 mm square step, so it prints without an overhang and the diffuser still sits flush.
- **Glue sockets.** Each ring's glue socket has a 45° pointed roof, so it prints with no bridge at all.

Only the PrusaSlicer projects carry the bridge angles; if you slice the STLs yourself, set the frame's bridge angles by hand. Every printed part is checked to print without supports (except the universal cassette's back ledge), with no wall under 1.4 mm and no overlaps in the assembly.

## Nozzle and material

Step 6 sets the nozzle (0.4, 0.6 or 0.8 mm, default 0.8) and material (PETG or PLA). The nozzle reshapes the white shell parts: walls, ribs and lips snap to whole extrusion widths (nozzle × 1.125, at least 2 lines) and skins to whole layers (nozzle × 0.5, at least 1.2 mm), with outer size and every fit clearance unchanged. The front frame and rings get a 0.4 mm V-groove down their underside and print with it at the back of the bed, where a Rear seam lines up in it. The material only changes the slicer settings (temperature offset, max volumetric speed, cooling, ironing). The page lists what each change did before you export.

## Colors

Step 7, Colors, previews filament colors. Pick a look from the dropdown (Studio, Graphite, Sage, Clay, Cobalt, Night). Under In use, each color is listed with what it covers and how many parts ("Shell · 4 parts"); change a color there and every part wearing it changes too. Hovering a row outlines its parts in the view. To give one part its own color, click it in the view and pick from the swatches or a new color; new colors join the library. Colors travel with saves and booth codes, and the README in the download lists which parts to print in which color.

## Sound

Interface sounds come from [uisfx](https://github.com/romainsimon/uisfx) with its **mechanical** pack: short switch and detent clicks that suit a tool for building hardware and keep up with a page full of choices. They only reinforce what the page already shows.

- **Choices:** a choice, dropdown, tab or view gives a select click. A switch gives toggle-on or toggle-off, and a check box or a back-panel hole (once per stroke) gives check or uncheck, by the new state. Opening or closing a step gives expand or collapse. Typed numbers and sliders stay quiet.
- **Problems:** a change that brings up a new problem gives a warning instead. A fix that clears one gives success. "Got it" closes it.
- **Results:** copying the booth code, restoring one, opening and closing the instructions, the extension ring stepper (snap, or blocked at its limit), and Reset (delete, only when something changed) each have their own cue.
- **Download:** a quiet processing loop runs while the files build and always stops first. Then you hear complete, error or cancel.
- **Sound on/off:** the button next to Reset turns sounds on and off. Off is immediate, even mid-download. The choice and the volume are kept in this browser (`printabooth:sound`).
- **Before you interact:** nothing plays, and no audio starts, until your first click or key press.

The library is vendored as `app/uisfx.js` (`npm run vendor` refreshes it from `node_modules`). Its code is MIT licensed and its sounds are CC0, outside this project's license. `npm run check` includes `checks/sound.mjs`. With the page served on port 8772, `npm run check:sound-ui` checks the sounds in a real browser.

## Export

The download is a zip with:

- STLs in print orientation, full-detail threads.
- PrusaSlicer 2.9+ projects. By default there are two: one for a Prusa XL (single tool, the chosen nozzle and material) and one for a Core One (HF 0.4, the chosen material). Choose "All in one file" (in Export, or Basic step 11) to get a single XL project with every part, since every part fits the XL's bed; past nine beds it continues in a second file. Each loads with its printer and print presets and the Generic PETG or PLA filament preset selected (any brand) and every part already placed on its bed, across up to nine beds, with per-part settings applied.
- `instructions.html`: picture instructions for this exact booth, drawn to the visual language in `docs/instructions-style.md` (an original character and symbol set; no words needed).
- A README with quantities, hardware, print settings and assembly order, plus the settings as JSON and a booth code. Paste the code (or open the JSON) under Export, Restore a booth to bring the booth back exactly; a link ending in `#cfg=<code>` opens it too.

## Layout

| Path | What |
|---|---|
| `app/` | The configurator. `index.html` (UI, a body fragment), `app.js` (UI, three.js scene, export), `geom.js` (all geometry, on manifold-3d), `worker.js` (geometry off the main thread), `pack3mf.js` (bed packing and the PrusaSlicer 3MF writer), `printsettings.js` (slicer settings from the Nozzle and Material settings), `howto.js` (the picture instructions), `presets/` (flattened PrusaSlicer presets per printer, nozzle and material), plus vendored three.js, manifold-3d and JSZip. |
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

- The back panel's thread (12 mm x 1.75 on a 25 mm grid) is an estimate of Thread Boards' 12 mm screws, which aren't published. The export includes a one-hole test coupon: print it first.
- USB-C plug head sizes for the dock are typical measurements, not published specs. Measure yours and print the dock clip first.
- Tablet presets are estimates from published specs. Measure your iPad and use Custom size before a big print. The tray's pocket corners are deliberately tighter than any iPad's, so the corner radius doesn't need to be exact.
- The `.3mf` presets come from the profile bundle shipped with PrusaSlicer 2.9.7. If your installed profiles are newer, a few values may show as modified when you open a project.

## License

Proprietary. Copyright (c) 2026 Guy Meyer. All rights reserved. The public site is for interactive use only; the source code, design assets and content may not be copied or redistributed without permission. See [LICENSE.md](LICENSE.md).
