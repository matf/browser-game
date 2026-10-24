// Phones and tablets: the main input is a finger, not a mouse.
export const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

// On a touch device held upright, cover the game with "please turn your phone" and pause it.
export function watchOrientation(game) {
  if (!IS_TOUCH) return;
  const overlay = document.getElementById('rotate');
  const portrait = window.matchMedia('(orientation: portrait)');
  const check = () => {
    overlay.classList.toggle('show', portrait.matches);
    if (portrait.matches) game.pause();
    else game.resume();
  };
  portrait.addEventListener('change', check);
  check();
}
