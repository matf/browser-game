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

// Size the game box to exactly the visible screen, minus the iPhone's notch and home bar.
// iPhone home-screen apps sometimes report the old (upright) height for a moment after turning,
// which made the game too tall and cut off at the top and bottom. So measure the visible area
// ourselves, again a few times after every turn, and fit the game to it.
export function keepFitted(game) {
  const box = document.getElementById('game');
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.append(probe);

  const fit = () => {
    const vv = window.visualViewport;
    const width = vv ? vv.width : window.innerWidth;
    const height = vv ? vv.height : window.innerHeight;
    const s = getComputedStyle(probe);
    const [top, right, bottom, left] = ['Top', 'Right', 'Bottom', 'Left'].map((side) =>
      parseFloat(s[`padding${side}`]) || 0,
    );
    Object.assign(box.style, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${Math.max(0, width - left - right)}px`,
      height: `${Math.max(0, height - top - bottom)}px`,
      right: 'auto',
      bottom: 'auto',
    });
    game.scale.refresh();
  };
  const fitSoon = () => {
    fit();
    for (const ms of [100, 300, 700, 1500]) setTimeout(fit, ms);
  };

  window.addEventListener('resize', fitSoon);
  window.addEventListener('orientationchange', fitSoon);
  window.visualViewport?.addEventListener('resize', fitSoon);
  fitSoon();
}
