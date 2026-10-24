import Phaser from 'phaser';
import { SOUNDS, loadMuted } from '../sound.js';

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
    this.load.image('drop', 'drop.png');
    this.load.image('hills', 'hills.png');
    this.load.image('ground', 'ground.png');
    this.load.image('pillar-top', 'pillar-top.png');
    this.load.image('pillar-bottom', 'pillar-bottom.png');
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
    loadMuted(this.game);

    this.scene.start('game');
  }
}
