import { MAX_HEARTS } from './shop.js';

// Everything that is kept between games lives in localStorage.
// Browsers can block it (private mode), so every access is wrapped in try/catch.
const KEY = 'dragonFlight.save';

const DEFAULTS = {
  coins: 0, // coins you have right now
  done: [], // levels you have finished (0 = the first level)
  at: 0, // where the dragon sits on the world map: a level, or -1 for the shop
  hearts: MAX_HEARTS, // hearts only come back by feeding
  dragon: 'marshmallow', // the dragon you fly with
  dragons: ['marshmallow'], // dragons you own
  items: [], // accessories you own
  wear: [], // accessories the dragon is wearing
  seenHelp: false, // the "So geht's!" screen was shown once
};

export function loadSave() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    // Use the defaults.
  }
  // Saves from before the world map only knew the next level: everything before it counts as done.
  if (!saved.done && saved.level) {
    saved.done = Array.from({ length: saved.level }, (_, i) => i);
    saved.at = saved.level;
  }
  delete saved.level;
  return structuredClone({ ...DEFAULTS, ...saved });
}

// True once there is something to lose: finished levels, coins, or things bought in the shop.
export function hasProgress(save) {
  return save.done.length > 0 || save.coins > 0 || save.dragons.length > 1 || save.items.length > 0;
}

// Start over. Only "So geht's!" stays seen.
export function resetSave() {
  const fresh = structuredClone({ ...DEFAULTS, seenHelp: loadSave().seenHelp });
  writeSave(fresh);
  return fresh;
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Not saved this time; the game keeps working.
  }
}
