// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// The page's sounds in a real browser: nothing (not even an AudioContext) before the first press, one cue per activation
// by mouse or keyboard, steps expand/collapse, mute is immediate and remembered across reloads, and the export's processing
// loop stops before its outcome plays.   Serve app/ first (e.g. python3 -m http.server 8772 in app/), then:
//   node checks/sound-ui.cjs [url]
const { chromium } = require("playwright");
const URL_ = process.argv[2] || "http://localhost:8772/";
let bad = 0;
const ok = (c, what) => { if (!c) bad++; console.log(c ? "ok  " : "FAIL", what); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ acceptDownloads: true }), p = await ctx.newPage(), errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await ctx.addInitScript(() => {
    window.__sfxLog = []; window.__ctxCount = 0;
    const A = window.AudioContext; window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ctxCount++; } };
  });
  await p.goto(URL_); await p.evaluate(() => { localStorage.clear(); localStorage.setItem("printabooth.mode", "basic"); }); await p.reload();
  const idle = () => p.waitForFunction(() => document.querySelector("#busy").dataset.idle === "true", null, { timeout: 180000 });
  await idle(); await p.waitForTimeout(300);
  const log = () => p.evaluate(() => window.__sfxLog.slice());
  const take = async () => { const l = await log(); await p.evaluate(() => { window.__sfxLog.length = 0; }); return l; };
  ok((await log()).length === 0 && (await p.evaluate(() => window.__ctxCount)) === 0, "page load: no cues and no AudioContext");

  await p.click('#basicPane [data-path="orientation"] [data-v="portrait"]');
  ok(JSON.stringify(await take()) === '["select"]', "mouse on a choice: one select");
  await p.click('#basicPane [data-path="orientation"] [data-v="portrait"]');
  ok((await take()).length === 0, "choosing what is already chosen: silent");
  await p.focus('#basicPane [data-path="orientation"] [data-v="landscape"]'); await p.keyboard.press("Space");
  ok(JSON.stringify(await take()) === '["select"]', "Space on a choice: one select");
  await p.focus('#basicPane [data-path="orientation"] [data-v="portrait"]'); await p.keyboard.press("Enter");
  ok(JSON.stringify(await take()) === '["select"]', "Enter on a choice: one select");
  await p.click('label[for="bLed"]');
  ok(JSON.stringify(await take()) === '["toggle-off"]', "switch off by mouse: toggle-off");
  await p.focus("#bLed"); await p.keyboard.press("Space");
  ok(JSON.stringify(await take()) === '["toggle-on"]', "switch on by keyboard: toggle-on");

  await p.click("#tabAdv"); ok(JSON.stringify(await take()) === '["select"]', "tab: select");
  await p.click("#s2 summary"); ok(JSON.stringify(await take()) === '["expand"]', "open a step: expand");
  await p.click("#s2 summary"); ok(JSON.stringify(await take()) === '["collapse"]', "close a step: collapse");
  await p.focus("#s2 summary"); await p.keyboard.press("Enter"); ok(JSON.stringify(await take()) === '["expand"]', "Enter on a step: expand");

  await p.click("#soundBtn");
  ok((await take()).length === 0 && (await p.getAttribute("#soundBtn", "aria-pressed")) === "false", "sound off: silent, button shows off");
  await p.click("#tabBasic"); ok((await take()).length === 0, "muted: no cues");
  await p.reload(); await idle();
  ok((await p.getAttribute("#soundBtn", "aria-pressed")) === "false" && (await p.textContent("#soundTxt")) === "Sound off", "mute remembered after reload");
  await p.click("#soundBtn"); ok(JSON.stringify(await take()) === '["toggle-on"]', "sound on: toggle-on");

  // export: the loop runs while files build, stops, then the outcome
  await idle();
  const dl = p.waitForEvent("download", { timeout: 400000 }).catch(() => null);
  await p.click("#bExport");
  await p.waitForFunction(() => /Saved|failed|cancelled/.test(document.querySelector("#exportMsg").textContent), null, { timeout: 400000 });
  await dl;
  const ex = await take();
  ok(ex[0] === "processing" && ex[1] === "stop:export" && ["complete", "error", "cancel"].includes(ex[2]) && ex.length === 3, `export: ${ex.join(" → ")}`);

  // mute in the middle of an export stops the loop at once and drops the outcome
  const dl2 = p.waitForEvent("download", { timeout: 400000 }).catch(() => null);
  await p.click("#bExport"); await p.waitForTimeout(300); await p.click("#soundBtn");
  await p.waitForFunction(() => /Saved|failed|cancelled/.test(document.querySelector("#exportMsg").textContent) && !document.querySelector("#exportBtn").disabled, null, { timeout: 400000 });
  await dl2;
  const ex2 = await take();
  ok(JSON.stringify(ex2) === '["processing","stop:export"]', `mute during export: ${ex2.join(" → ")}`);

  ok(!errs.length, "no page errors" + (errs.length ? ": " + errs.join("; ") : ""));
  await b.close();
  process.exit(bad ? 1 : 0);
})();
