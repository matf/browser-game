import { MAX_HEARTS } from './shop.js';

// Everything that is kept between games lives in localStorage.
// Browsers can block it (private mode), so every access is wrapped in try/catch.
const KEY = 'dragonFlight.save';

const DEFAULTS = {
  coins: 0, // coins you have right now
  level: 0, // the level to continue with (0 = level 1)
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
  return structuredClone({ ...DEFAULTS, ...saved });
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Not saved this time; the game keeps working.
  }
}
