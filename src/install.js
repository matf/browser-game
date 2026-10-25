import { IS_TOUCH } from './touch.js';

// Putting the game on the phone's home screen, so it starts like an app, full screen.

const SEEN_KEY = 'dragonFlight.homeHintSeen';

// iPhones and iPads (newer iPads say they are a Mac, but a Mac has no touch screen).
export const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// True when the game was started from the home screen (no browser bars).
export const IS_APP =
  window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;

// Android Chrome can install the game with one tap. It offers this with an event early on, which
// has to be kept until the player taps "Installieren".
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
});

export function canInstallNow() {
  return installEvent !== null;
}

export async function installNow() {
  if (!installEvent) return false;
  const event = installEvent;
  installEvent = null; // it can only be used once
  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

// Only on phones and tablets, only in the browser, and only the very first time.
export function shouldShowHomeHint() {
  if (!IS_TOUCH || IS_APP) return false;
  try {
    return localStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return false;
  }
}

export function markHomeHintSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // private browsing: then it may show again next time
  }
}
