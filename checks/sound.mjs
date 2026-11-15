// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// The sound layer (app/sound.js) against a fake uisfx player: server-side safety, nothing before unlock, cue mapping from
// the resulting state, loops stopping on every way out before the outcome plays, mute stopping everything first and being
// remembered, and one shared player that can be disposed and made again.   node checks/sound.mjs
import { makeSound, sound, disposeSound, toggleCue, checkCue, expandCue, changeCue, PACK, PREF_KEY } from "../app/sound.js";
import { cueNames } from "../app/uisfx.js";

let bad = 0;
const ok = (cond, what) => { if (!cond) bad++; console.log(cond ? "ok  " : "FAIL", what); };

// a fake uisfx player that records what happens, with the same preference storage behaviour
function fakeFactory(log) {
  return (opts) => {
    let enabled = opts.enabled !== false, volume = opts.volume;
    const persist = () => opts.preferences && opts.preferences.storage.setItem(opts.preferences.key, JSON.stringify({ pack: opts.pack, volume, enabled }));
    log.push(["create", opts.pack, opts.volume, opts.enabled]);
    return {
      unlock: async () => { log.push(["unlock"]); return true; },
      play: (cue) => {
        if (!enabled) return null;
        log.push(["play", cue]);
        if (cue === "nullcue") return null;
        return { stop: () => log.push(["stop", cue]), ended: Promise.resolve() };
      },
      setEnabled: (v) => { log.push(["setEnabled", v]); enabled = v; persist(); },
      isEnabled: () => enabled,
      setVolume: (v) => { volume = v; persist(); },
      stopAll: () => log.push(["stopAll"]),
      destroy: async () => log.push(["destroy"]),
    };
  };
}
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const plays = (log) => log.filter((e) => e[0] === "play").map((e) => e[1]);

// every cue the app uses is a real uisfx cue
{
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../app/app.js", import.meta.url), "utf8");
  const used = new Set([...src.matchAll(/sfx\.(?:play|startLoop|during)\(\s*(?:"[a-z]+",\s*)?"([a-z-]+)"/g)].map((m) => m[1]));
  for (const c of ["toggle-on", "toggle-off", "check", "uncheck", "expand", "collapse", "warning", "select", "complete", "error", "cancel", "processing"]) used.add(c);
  const unknown = [...used].filter((c) => !cueNames.includes(c));
  ok(!unknown.length && used.size > 15, `app cues are all valid uisfx cues (${used.size} used${unknown.length ? "; unknown: " + unknown.join(", ") : ""})`);
  ok(cueNames.includes("processing") && PACK === "mechanical", "pack is mechanical; processing is a loop cue");
}

// server side: no window, nothing is created and nothing plays
{
  const log = [], s = makeSound({ create: fakeFactory(log), win: undefined });
  s.unlock(); const h = s.play("success"); s.startLoop("x", "processing"); s.setEnabled(false);
  ok(h === null && log.length === 0 && s.loopCount === 0, "no window: no player, play() returns null");
  const g = sound(); ok(g.play("select") === null, "shared player in Node is inert");
}

// nothing before a real press; cues before that are dropped, not queued
{
  const log = [], s = makeSound({ create: fakeFactory(log), win: {}, storage: memStore() });
  ok(s.play("success") === null && plays(log).length === 0, "before unlock: dropped");
  s.unlock(); s.play("select");
  ok(JSON.stringify(plays(log)) === '["select"]' && log.some((e) => e[0] === "unlock"), "after unlock: plays once, earlier cue not replayed");
  ok(s.play("nullcue") === null, "a null handle from uisfx is passed through safely");
}

// cue mapping from the resulting state
ok(toggleCue(true) === "toggle-on" && toggleCue(false) === "toggle-off", "switch: toggle-on / toggle-off by the new state");
ok(checkCue(true) === "check" && checkCue(false) === "uncheck", "checkbox / hole: check / uncheck by the new state");
ok(expandCue(true) === "expand" && expandCue(false) === "collapse", "step: expand / collapse by the new state");
ok(changeCue("select", 0, 1) === "warning" && changeCue("select", 1, 1) === "select" && changeCue("select", 2, 0) === "select", "a change that adds a problem warns instead");

// loops: idempotent, stopped before the outcome, on success, failure, cancel and mute
{
  const log = [], s = makeSound({ create: fakeFactory(log), win: {}, storage: memStore() }); s.unlock();
  const a = s.startLoop("export", "processing"), b = s.startLoop("export", "processing");
  ok(a === b && plays(log).filter((c) => c === "processing").length === 1, "starting a loop twice reuses it");
  s.stopLoop("export"); ok(s.loopCount === 0, "stopping clears the handle");

  log.length = 0;
  await s.during("export", "processing", async () => { await new Promise((r) => setTimeout(r, 5)); });
  const seqOk = log.map((e) => e.join(":")).join(" ");
  ok(seqOk === "play:processing stop:processing play:complete" && s.loopCount === 0, `success: loop, stop, complete (${seqOk})`);

  log.length = 0; let threw = false;
  try { await s.during("export", "processing", async () => { throw new Error("boom"); }); } catch (e) { threw = true; }
  const seqErr = log.map((e) => e.join(":")).join(" ");
  ok(threw && seqErr === "play:processing stop:processing play:error" && s.loopCount === 0, `failure: loop, stop, error, rethrown (${seqErr})`);

  log.length = 0;
  try { await s.during("export", "processing", async () => { throw Object.assign(new Error("no"), { code: "declined" }); }, { cancelled: (e) => e.code === "declined" }); } catch (e) {}
  ok(log.map((e) => e.join(":")).join(" ") === "play:processing stop:processing play:cancel", "cancelled: loop, stop, cancel");

  log.length = 0;
  const run = s.during("export", "processing", () => new Promise((r) => setTimeout(r, 20)));
  s.setEnabled(false);
  const iStop = log.findIndex((e) => e.join(":") === "stop:processing"), iAll = log.findIndex((e) => e[0] === "stopAll"), iOff = log.findIndex((e) => e[0] === "setEnabled");
  ok(iStop >= 0 && iStop < iAll && iAll < iOff && s.loopCount === 0, "mute: loop stopped and cleared, then stopAll, then disabled");
  await run;
  ok(!plays(log).includes("complete"), "nothing plays after mute (the outcome is dropped)");
  ok(s.play("select") === null, "muted: play() returns null");
}

// mute is remembered (uisfx preference storage) and read back by a new player
{
  const store = memStore(), log = [];
  const s1 = makeSound({ create: fakeFactory(log), win: {}, storage: store }); s1.unlock(); s1.setEnabled(false); s1.setVolume(0.4);
  const saved = JSON.parse(store.getItem(PREF_KEY));
  ok(saved.enabled === false && saved.volume === 0.4, "sound off and volume saved under " + PREF_KEY);
  const log2 = [], s2 = makeSound({ create: fakeFactory(log2), win: {}, storage: store }); s2.unlock();
  ok(log2[0][3] === false && log2[0][2] === 0.4 && s2.isEnabled() === false, "a new page starts muted at the saved volume");
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  const s3 = makeSound({ create: fakeFactory([]), win: {}, storage: broken }); s3.unlock(); s3.setEnabled(false);
  ok(true, "blocked storage does not throw");
}

// one shared player; disposing stops it and a later call makes a fresh one
{
  const a = sound(), b = sound();
  ok(a === b, "sound() returns the same player");
  await disposeSound();
  ok(sound() !== a, "after disposeSound() a new player is made");
  const log = [], s = makeSound({ create: fakeFactory(log), win: {}, storage: memStore() }); s.unlock(); s.startLoop("x", "processing");
  await s.destroy();
  ok(log.some((e) => e.join(":") === "stop:processing") && log.some((e) => e[0] === "destroy") && !s.unlocked && s.loopCount === 0, "destroy stops loops, destroys the player and needs a new unlock");
}

process.exit(bad ? 1 : 0);
