// Sound effects (Kenney, CC0) and the mute button. Files are mp3 because the iPhone can't play ogg.

const MUSIC_VOLUME = 0.15; // background music, 0 to 1

// key -> volume (0 to 1)
export const SOUNDS = {
  music: MUSIC_VOLUME,
  coin: 0.5,
  hit: 0.8,
  nap: 0.8,
  win: 0.8,
  start: 0.7,
  eat: 0.7,
  buy: 0.9,
  newdragon: 0.8,
  nope: 0.7,
  wear: 0.7,
  click: 0.8,
};

const MUTE_KEY = 'dragonFlight.muted';

// Phaser's sound.mute only reports the new value a moment after it is set, so keep our own copy.
let muted = false;

export function play(scene, key) {
  if (muted) return;
  scene.sound.play(key, { volume: SOUNDS[key] });
}

// Background music ("Flowerbed Fields"), looping for the whole game. Safe to call again: it only
// starts once. Browsers only allow sound after the first tap or key press, so it may wait for that.
let music = null;
export function startMusic(scene) {
  if (music) return;
  music = scene.sound.add('music', { loop: true, volume: MUSIC_VOLUME });
  if (scene.sound.locked) scene.sound.once('unlocked', () => music.play());
  else music.play();
}

// Remember mute between visits (in its own key, so it never fights with the save game).
export function loadMuted(game) {
  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    // Sound stays on.
  }
  game.sound.mute = muted;
  // Browsers only start audio after the first tap or key press; apply the setting again then.
  game.sound.once('unlocked', () => (game.sound.mute = muted));
}

function toggleMute(scene) {
  muted = !muted;
  scene.sound.mute = muted;
  scene.sound.emit('dragonmute', muted);
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Not remembered this time.
  }
}

// A speaker icon you can tap, plus the M key. Shows a cross when the sound is off.
// Only one running scene should listen to M (the HUD), or one key press would switch twice.
export function addMuteButton(scene, x, y, { mKey = true } = {}) {
  const icon = scene.add
    .image(x, y, muted ? 'speaker-off' : 'speaker')
    .setInteractive({ useHandCursor: true })
    .setDepth(30);
  const refresh = (isMuted) => icon.setTexture(isMuted ? 'speaker-off' : 'speaker');
  icon.on('pointerdown', () => toggleMute(scene));
  if (mKey) scene.input.keyboard.on('keydown-M', () => toggleMute(scene));
  scene.sound.on('dragonmute', refresh);
  scene.events.once('shutdown', () => scene.sound.off('dragonmute', refresh));
  return icon;
}
