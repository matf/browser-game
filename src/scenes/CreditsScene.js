import { MenuPage, TEXT } from './MenuPage.js';
import { TILE } from './PreloadScene.js';
import { Accessories } from '../objects/Accessories.js';
import { loadSave } from '../save.js';
import { WIDTH } from '../view.js';
import { dragonLook, showDragon } from '../dragons.js';

const MAKERS = 'Anna und Matthias';
// Who made the pictures, sounds, music and font (the full list with links is in README.md).
const HELPERS = [
  ['Drachen', 'Magicae! Games'],
  ['Inseln, Häuschen und Geräusche', 'Kenney'],
  ['Musik', 'Zane Little Music'],
  ['Schrift', 'Fredoka'],
];
const HELPERS_Y = 140; // the first line of the list
const LINE_HEIGHT = 16;
const HEART_SPREAD = 140; // how far left and right of the middle the hearts start

// Mitwirkende: who made the game.
export class CreditsScene extends MenuPage {
  constructor() {
    super('credits');
  }

  create() {
    this.openPage('Mitwirkende');
    const save = loadSave();

    this.add.text(WIDTH / 2, 54, 'Ein Spiel von', { ...TEXT, fontSize: '12px' }).setOrigin(0.5).setResolution(4);
    // Little hearts float up from behind the names (drawn first, so they stay behind).
    this.add
      .particles(WIDTH / 2, 96, 'tiles', {
        frame: TILE.heartFull,
        x: { min: -HEART_SPREAD, max: HEART_SPREAD },
        lifespan: 2200,
        speedY: { min: -35, max: -20 },
        scale: { start: 0.7, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        frequency: 150,
      });
    const names = this.add
      .text(WIDTH / 2, 82, MAKERS, { ...TEXT, fontSize: '24px', color: '#ff9fc8', strokeThickness: 4 })
      .setOrigin(0.5)
      .setResolution(4);
    this.tweens.add({ targets: names, scale: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // The dragon you fly with says hello.
    this.dragon = showDragon(this.add.sprite(64, 92, 'dragons'), dragonLook(save));
    this.tweens.add({ targets: this.dragon, y: 84, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.accessories = new Accessories(this, this.dragon, save.wear);

    this.add
      .text(WIDTH / 2, HELPERS_Y - 20, 'Bilder, Töne und Schrift von:', { ...TEXT, fontSize: '11px', color: '#ffe066' })
      .setOrigin(0.5)
      .setResolution(4);
    HELPERS.forEach(([what, who], i) => {
      const y = HELPERS_Y + i * LINE_HEIGHT;
      this.add.text(WIDTH / 2 - 6, y, what, { ...TEXT, fontSize: '11px', color: '#d8cff0' }).setOrigin(1, 0.5).setResolution(4);
      this.add.text(WIDTH / 2 + 6, y, who, { ...TEXT, fontSize: '11px' }).setOrigin(0, 0.5).setResolution(4);
    });
    this.add
      .text(WIDTH / 2, HELPERS_Y + HELPERS.length * LINE_HEIGHT + 14, 'Danke fürs Spielen!', { ...TEXT, fontSize: '13px', color: '#ffe066' })
      .setOrigin(0.5)
      .setResolution(4);
  }

  update() {
    this.accessories.update();
  }
}
