import Phaser from 'phaser';

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
    this.load.image('backgrounds', 'backgrounds.png');
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

    // The clouds-and-trees strip of the Kenney background sheet, used for the scrolling backdrop.
    this.textures.get('backgrounds').add('hills', 0, 0, 24, 96, 48);

    this.scene.start('game');
  }
}
