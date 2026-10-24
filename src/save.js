// Everything that is kept between games lives in localStorage.
// Browsers can block it (private mode), so every access is wrapped in try/catch.
const KEY = 'dragonFlight.save';

// coins: all coins collected so far. level: the level to continue with (0 = level 1).
const DEFAULTS = { coins: 0, level: 0 };

export function loadSave() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Not saved this time; the game keeps working.
  }
}
