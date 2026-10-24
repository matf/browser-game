// Everything that is kept between games lives in localStorage.
// Browsers can block it (private mode), so every access is wrapped in try/catch.
const KEY = 'dragonFlight.save';

export function loadSave() {
  try {
    return { coins: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { coins: 0 };
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Not saved this time; the game keeps working.
  }
}
