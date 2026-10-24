import Phaser from 'phaser';
import { SOUNDS, loadSoundSettings } from '../sound.js';
import { THEMES } from '../world.js';

// Frame indices in the Kenney tilesheet (assets/tiles.png, 18x18, 20 columns).
export const TILE = {
  heartFull: 44,
  heartEmpty: 46,
  coin: 151,
  coinSide: 152,
  digit0: 160, // digits 0-9 are 160-169
};

// Accessory pictures in assets/accessories.png (12x10 cells). ax/ay is the pixel that sits on the
// dragon's anchor point (see src/objects/Accessories.js).
export const ACCESSORY_ART = {
  bow: { frame: 0, ax: 5, ay: 5 },
  crown: { frame: 1, ax: 5, ay: 5 },
  glasses: { frame: 2, ax: 7, ay: 2 },
  necklace: { frame: 3, ax: 4, ay: 3 },
  pawchain: { frame: 4, ax: 2, ay: 1 },
  'gem-pink': { frame: 5, ax: 2, ay: 2 },
  'gem-blue': { frame: 6, ax: 2, ay: 2 },
  'gem-green': { frame: 7, ax: 2, ay: 2 },
  'gem-purple': { frame: 8, ax: 2, ay: 2 },
  glitter: { frame: 9, ax: 4, ay: 4 },
};
export const ACCESSORY_CELL = { width: 12, height: 10 };

// Size of one frame in assets/dragons.png (5 rows, one per dragon, 3 flying frames each).
export const DRAGON_FRAME = { width: 67, height: 52 };

// All dragons in the game. `row` is the row in dragons.png. Marshmallow is the starter.
export const DRAGONS = [
  { key: 'marshmallow', name: 'Marshmallow', row: 0 },
  { key: 'chili', name: 'Chili', row: 1 },
  { key: 'blubb', name: 'Blubb', row: 2 },
  { key: 'wolke', name: 'Wolke', row: 3 },
  { key: 'kiesel', name: 'Kiesel', row: 4 },
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    this.load.setPath('assets');
    this.load.spritesheet('dragons', 'dragons.png', {
      frameWidth: DRAGON_FRAME.width,
      frameHeight: DRAGON_FRAME.height,
    });
    this.load.spritesheet('tiles', 'tiles.png', { frameWidth: 18, frameHeight: 18 });
    this.load.spritesheet('bee', 'bee.png', { frameWidth: 24, frameHeight: 20 });
    // Each island theme has its own hills, ground, pillars and falling thing (ground-candy.png, ...).
    for (const theme of Object.keys(THEMES)) {
      for (const name of ['drop', 'hills', 'ground', 'pillar-top', 'pillar-bottom']) {
        this.load.image(`${name}-${theme}`, `${name}-${theme}.png`);
      }
    }
    this.load.image('map', 'map.png');
    this.load.image('shop-house', 'shop-house.png');
    this.load.image('rainbow', 'rainbow.png');
    this.load.image('piggy', 'piggy.png');
    this.load.spritesheet('accessories', 'accessories.png', {
      frameWidth: ACCESSORY_CELL.width,
      frameHeight: ACCESSORY_CELL.height,
    });
    this.load.spritesheet('food', 'food.png', { frameWidth: 18, frameHeight: 18 });
    for (const key of Object.keys(SOUNDS)) this.load.audio(key, `audio/${key}.mp3`);
  }

  create() {
    // Wings up, down, up, down: frames 0, 1, 2, 1 of each dragon's row.
    for (const dragon of DRAGONS) {
      const first = dragon.row * 3;
      this.anims.create({
        key: `${dragon.key}-fly`,
        frames: this.anims.generateFrameNumbers('dragons', {
          frames: [first, first + 1, first + 2, first + 1],
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    this.anims.create({
      key: 'bee-fly',
      frames: this.anims.generateFrameNumbers('bee', { start: 0, end: 1 }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: 'coin-spin',
      frames: this.anims.generateFrameNumbers('tiles', { frames: [TILE.coin, TILE.coinSide] }),
      frameRate: 5,
      repeat: -1,
    });

    // Tiny square for splash particles.
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillRect(0, 0, 2, 2).generateTexture('pixel', 2, 2).destroy();

    // Speaker icons for the mute button (14x12): with sound waves, and with a cross.
    const speaker = (key, off) => {
      const s = this.add.graphics();
      s.fillStyle(0x1b1630).fillRect(0, 3, 6, 6).fillTriangle(1, 6, 8, -1, 8, 13);
      s.fillStyle(0xffffff).fillRect(1, 4, 4, 4).fillTriangle(2, 6, 7, 1, 7, 11);
      s.lineStyle(2, off ? 0xff5a5f : 0xffffff);
      if (off) s.lineBetween(9, 3, 13, 9).lineBetween(13, 3, 9, 9);
      else s.lineBetween(10, 3, 12, 6).lineBetween(12, 6, 10, 9);
      s.generateTexture(key, 14, 12).destroy();
    };
    speaker('speaker', false);
    speaker('speaker-off', true);
    loadSoundSettings(this.game);
    this.makeMapTextures();
    this.makeStar();

    this.scene.start('title');
  }

  // Pictures for the world map, drawn here instead of loaded.
  // The power-up star (16x16): yellow with a darker edge and a little shine.
  makeStar() {
    const points = (outer, inner) =>
      Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? inner : outer;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        return { x: 8 + r * Math.cos(a), y: 8.5 + r * Math.sin(a) };
      });
    const g = this.add.graphics();
    g.fillStyle(0xd98a1c).fillPoints(points(8, 3.8), true);
    g.fillStyle(0xffd84a).fillPoints(points(6.2, 2.8), true);
    g.fillStyle(0xffffff).fillRect(6, 5, 2, 2);
    g.generateTexture('powerup-star', 16, 16).destroy();
  }

  makeMapTextures() {
    const draw = (key, width, height, paint) => {
      const g = this.add.graphics();
      paint(g);
      g.generateTexture(key, width, height).destroy();
    };
    // Level stations: a flat round stone, grey when locked, pink when open, gold when done.
    const station = (key, top, side) =>
      draw(key, 18, 12, (g) => {
        g.fillStyle(0x1b1630).fillEllipse(9, 6.5, 18, 11);
        g.fillStyle(side).fillEllipse(9, 6.5, 16, 9);
        g.fillStyle(top).fillEllipse(9, 5, 16, 7);
      });
    station('station-locked', 0xa7a3b8, 0x6f6a85);
    station('station-open', 0xff8cc6, 0xc2508f);
    station('station-done', 0xffd84a, 0xd08a1e);

    // A small star that sits above a finished station.
    draw('map-star', 11, 11, (g) => {
      const points = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.4 : 5.4;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        points.push({ x: 5.5 + Math.cos(a) * r, y: 5.8 + Math.sin(a) * r });
      }
      g.fillStyle(0xffd84a).fillPoints(points, true).lineStyle(1, 0x8a4b14).strokePoints(points, true);
    });

    // A fluffy cloud that hides the islands you can't visit yet.
    draw('map-cloud', 64, 36, (g) => {
      g.fillStyle(0xc9d9ee);
      for (const [x, y, r] of [[16, 22, 12], [32, 18, 16], [48, 22, 12], [26, 26, 10], [40, 26, 10]]) g.fillCircle(x, y + 2, r);
      g.fillStyle(0xffffff);
      for (const [x, y, r] of [[16, 22, 12], [32, 18, 16], [48, 22, 12], [26, 26, 10], [40, 26, 10]]) g.fillCircle(x, y, r);
    });

    // Button on the map that goes back to the main menu: a little house.
    draw('menu-icon', 16, 14, (g) => {
      g.fillStyle(0x1b1630).fillTriangle(8, 0, -1, 7, 17, 7).fillRect(1, 5, 14, 9);
      g.fillStyle(0xe84537).fillTriangle(8, 2, 2, 6, 14, 6);
      g.fillStyle(0xffffff).fillRect(3, 7, 10, 6);
      g.fillStyle(0x8a4b2a).fillRect(7, 9, 3, 4);
    });

    // Button that leaves a level and goes back to the map: a little folded map with a red path.
    draw('map-icon', 16, 14, (g) => {
      g.fillStyle(0x1b1630).fillRect(0, 0, 16, 14);
      g.fillStyle(0xf3e3b5).fillRect(1, 1, 14, 12);
      g.fillStyle(0xd9c48e).fillRect(5, 1, 1, 12).fillRect(10, 1, 1, 12);
      g.fillStyle(0x7ccf6b).fillRect(2, 7, 4, 4).fillRect(9, 3, 4, 3);
      g.fillStyle(0xe84537).fillRect(3, 5, 2, 1).fillRect(6, 5, 2, 1).fillRect(8, 8, 2, 1).fillRect(12, 8, 2, 2);
    });
  }
}
