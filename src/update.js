// Home-screen apps on the iPhone have no reload button. So the game itself checks whether a newer
// version was published, and then shows a banner you can tap to update.
//
// Each build gives the game's script a new name (assets/index-<hash>.js), so if the index.html on
// the server points to a different script than the one running, there is a new version.
const SCRIPT = /assets\/index-[\w-]+\.js/;

async function newVersionAvailable() {
  const running = document.querySelector('script[type="module"][src]')?.src.match(SCRIPT)?.[0];
  if (!running) return false;
  try {
    const res = await fetch(`./index.html?check=${Date.now()}`, { cache: 'no-store' });
    const latest = (await res.text()).match(SCRIPT)?.[0];
    return Boolean(latest) && latest !== running;
  } catch {
    return false; // offline: just keep playing
  }
}

function showBanner() {
  if (document.getElementById('update')) return;
  const banner = document.createElement('button');
  banner.id = 'update';
  banner.textContent = '✨ Neue Version da! Tippe zum Aktualisieren';
  // A fresh address skips the browser's saved copy of the page.
  banner.addEventListener('click', () => location.replace(`${location.pathname}?v=${Date.now()}`));
  document.body.append(banner);
}

async function check() {
  if (document.visibilityState === 'visible' && (await newVersionAvailable())) showBanner();
}

export function watchForUpdates() {
  if (!import.meta.env.PROD) return; // the dev server reloads by itself
  check();
  // Home-screen apps are often only paused in the background, so also check when coming back.
  document.addEventListener('visibilitychange', check);
}
