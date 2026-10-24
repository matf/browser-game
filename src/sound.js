import Phaser from 'phaser';

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
const VOLUME_KEY = 'dragonFlight.volume';

export const VOLUME_STEPS = 5; // the volume bars in Einstellungen go from 0 to this
const NORMAL_STEP = 3; // the step where everything sounds as loud as the numbers above

// Phaser's sound.mute only reports the new value a moment after it is set, so keep our own copy.
let muted = false;
// Volume steps for the music and for the sound effects (0 = silent).
const volume = { music: NORMAL_STEP, sfx: NORMAL_STEP };

const loudness = (kind) => volume[kind] / NORMAL_STEP;

export function play(scene, key) {
  if (muted || volume.sfx === 0) return;
  scene.sound.play(key, { volume: SOUNDS[key] * loudness('sfx') });
}

// Background music ("Flowerbed Fields"), looping for the whole game. Safe to call again: it only
// starts once. Browsers only allow sound after the first tap or key press, so it may wait for that.
let music = null;
export function startMusic(scene) {
  if (music) return;
  music = scene.sound.add('music', { loop: true, volume: MUSIC_VOLUME * loudness('music') });
  if (scene.sound.locked) scene.sound.once('unlocked', () => music.play());
  else music.play();
}

export function isMuted() {
  return muted;
}

// kind: 'music' or 'sfx'.
export function getVolume(kind) {
  return volume[kind];
}

export function setVolume(kind, step) {
  volume[kind] = Phaser.Math.Clamp(step, 0, VOLUME_STEPS);
  if (kind === 'music') music?.setVolume(MUSIC_VOLUME * loudness('music'));
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify(volume));
  } catch {
    // Not remembered this time.
  }
}

// Remember mute and volume between visits (in their own keys, so they never fight with the save
// game, and "Neues Spiel" keeps them).
export function loadSoundSettings(game) {
  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
    const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) || '{}');
    for (const kind of Object.keys(volume)) {
      if (Number.isInteger(saved[kind])) volume[kind] = Phaser.Math.Clamp(saved[kind], 0, VOLUME_STEPS);
    }
  } catch {
    // Sound stays on, at normal volume.
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
