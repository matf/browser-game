import Phaser from 'phaser';

// Frame indices in the Kenney tilesheet (assets/tiles.png, 18x18, 20 columns).
export const TILE = {
  heartFull: 44,
  heartEmpty: 46,
};

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

    // Tiny square for splash particles.
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillRect(0, 0, 2, 2).generateTexture('pixel', 2, 2).destroy();

    this.scene.start('game');
  }
}
