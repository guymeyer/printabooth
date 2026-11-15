// Copyright (c) 2026 Guy Meyer. All rights reserved. Proprietary; see LICENSE.md.
// UI sound: one shared uisfx player (the "mechanical" pack: switches, relays and firm detents, for a tool that builds hardware).
// Sound only reinforces what the page already shows; it never carries meaning on its own.
//
// Rules this module keeps:
// - Client only: with no window (Node, a server render, the checks) nothing is created and play() returns null.
// - Nothing plays until a real pointer or key press has unlocked audio; cues before that are dropped, not queued.
// - Loops are owned by id: starting one twice reuses it, and every exit (success, failure, cancel, mute, page hide) stops it.
// - Muting stops loops and clears their handles, then stops everything, then turns the player off.
import { createUISFX } from "./uisfx.js";

export const PACK = "mechanical";
export const PREF_KEY = "printabooth:sound";
export const DEFAULT_VOLUME = 0.7;

// cue choices that depend on the resulting state
export const toggleCue = (on) => (on ? "toggle-on" : "toggle-off");
export const checkCue = (on) => (on ? "check" : "uncheck");
export const expandCue = (open) => (open ? "expand" : "collapse");
// a settings change: a choice made, unless it brought up a new problem
export const changeCue = (cue, errorsBefore, errorsAfter) => (errorsAfter > errorsBefore ? "warning" : cue);

function readPrefs(storage) {
  try { const v = JSON.parse(storage.getItem(PREF_KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; }
}

export function makeSound({ create = createUISFX, win = typeof window === "undefined" ? undefined : window, storage } = {}) {
  let ui = null, unlocked = false;
  const loops = new Map();
  const log = (cue) => { if (win && Array.isArray(win.__sfxLog)) win.__sfxLog.push(cue); };   // the browser check counts cues here
  const store = storage || (win && (() => { try { return win.localStorage; } catch (e) { return null; } })()) || null;
  const safeStore = store && { getItem: (k) => { try { return store.getItem(k); } catch (e) { return null; } }, setItem: (k, v) => { try { store.setItem(k, v); } catch (e) {} } };

  function player() {
    if (!win) return null;
    if (!ui) {
      const saved = safeStore ? readPrefs(safeStore) : {};
      ui = create({ pack: PACK, volume: typeof saved.volume === "number" ? saved.volume : DEFAULT_VOLUME, enabled: saved.enabled !== false,
        preferences: safeStore ? { key: PREF_KEY, storage: safeStore } : undefined });
    }
    return ui;
  }
  // call synchronously inside a pointerdown or keydown handler
  function unlock() {
    const p = player(); if (!p) return;
    unlocked = true;
    try { p.unlock().catch(() => {}); } catch (e) {}
  }
  function play(cue, opts) {
    if (!unlocked) return null;
    const p = player(); if (!p || !p.isEnabled()) return null;
    log(cue);
    try { return p.play(cue, opts) || null; } catch (e) { return null; }
  }
  function startLoop(id, cue) {
    if (loops.has(id)) return loops.get(id);
    const h = play(cue);
    if (h) loops.set(id, h);
    return h;
  }
  function stopLoop(id) {
    const h = loops.get(id); loops.delete(id);
    if (h) { log(`stop:${id}`); try { h.stop(); } catch (e) {} }
  }
  function stopAll() {
    for (const id of [...loops.keys()]) stopLoop(id);
    if (ui) try { ui.stopAll(); } catch (e) {}
  }
  // run an async job with a loop going; the loop always stops first, then the real outcome plays
  async function during(id, cue, job, { done = "complete", fail = "error", cancelled = (e) => false } = {}) {
    startLoop(id, cue);
    try {
      const r = await job();
      stopLoop(id); if (done) play(done);
      return r;
    } catch (e) {
      stopLoop(id); play(cancelled(e) ? "cancel" : fail);
      throw e;
    } finally {
      stopLoop(id);
    }
  }
  function setEnabled(on) {
    const p = player(); if (!p) return;
    if (!on) stopAll();
    p.setEnabled(!!on);
  }
  const isEnabled = () => { const p = player(); return p ? p.isEnabled() : false; };
  const setVolume = (v) => { const p = player(); if (p) p.setVolume(v); };
  async function destroy() {
    stopAll();
    if (ui) { const u = ui; ui = null; unlocked = false; await u.destroy(); }
  }
  return { unlock, play, startLoop, stopLoop, stopAll, during, setEnabled, isEnabled, setVolume, destroy,
    get unlocked() { return unlocked; }, get loopCount() { return loops.size; } };
}

// the page's one player
let shared = null;
export const sound = () => (shared || (shared = makeSound()));
export async function disposeSound() { if (shared) { const s = shared; shared = null; await s.destroy(); } }
