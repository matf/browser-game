import { MenuPage, TEXT, COLORS } from './MenuPage.js';
import { DRAGONS, TILE } from './PreloadScene.js';
import { Accessories } from '../objects/Accessories.js';
import { DRAGON_PRICE } from '../shop.js';
import { loadSave } from '../save.js';
import { WIDTH } from '../view.js';
import { play } from '../sound.js';

const CARD = { y: 128, width: 86, height: 150, gap: 6 }; // y: the middle of the cards
const NOT_OWNED_TINT = 0x3a3350; // dragons you don't have yet show as a dark shadow

// Drachen-Galerie: every dragon in the game. Yours fly; the others wait as shadows in the shop.
export class GalleryScene extends MenuPage {
  constructor() {
    super('gallery');
  }

  create() {
    this.openPage('Drachen-Galerie');
    const save = loadSave();
    this.add
      .text(WIDTH / 2, 44, `Du hast ${save.dragons.length} von ${DRAGONS.length} Drachen`, { ...TEXT, fontSize: '11px' })
      .setOrigin(0.5)
      .setResolution(4);

    const rowWidth = DRAGONS.length * CARD.width + (DRAGONS.length - 1) * CARD.gap;
    this.accessories = [];
    DRAGONS.forEach((dragon, i) => {
      const x = (WIDTH - rowWidth) / 2 + CARD.width / 2 + i * (CARD.width + CARD.gap);
      const owned = save.dragons.includes(dragon.key);
      const flying = save.dragon === dragon.key;
      const card = this.add
        .rectangle(x, CARD.y, CARD.width, CARD.height, owned ? COLORS.card : 0x342a4c)
        .setStrokeStyle(flying ? 3 : 2, flying ? COLORS.selected : 0xffffff);

      const sprite = this.add.sprite(x, CARD.y - 32, 'dragons', dragon.row * 3);
      if (owned) {
        sprite.play(`${dragon.key}-fly`);
        // Each dragon flaps a little out of step with the others.
        sprite.anims.setProgress(i / DRAGONS.length);
        this.tweens.add({ targets: sprite, y: sprite.y - 4, duration: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        // A tap makes it do a happy loop.
        card.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.cheer(sprite));
      } else {
        sprite.setTint(NOT_OWNED_TINT);
      }
      if (flying) this.accessories.push(new Accessories(this, sprite, save.wear));

      this.add
        .text(x, CARD.y + 18, dragon.name, { ...TEXT, fontSize: '13px' })
        .setOrigin(0.5)
        .setResolution(4);
      if (flying) {
        this.add.text(x, CARD.y + 44, 'fliegt\nmit dir!', { ...TEXT, fontSize: '10px', color: '#ffe066', align: 'center' }).setOrigin(0.5).setResolution(4);
      } else if (owned) {
        this.add.text(x, CARD.y + 44, 'gehört dir', { ...TEXT, fontSize: '10px', color: '#9ff0a8' }).setOrigin(0.5).setResolution(4);
      } else {
        this.add.text(x, CARD.y + 38, 'im Shop', { ...TEXT, fontSize: '10px' }).setOrigin(0.5).setResolution(4);
        this.add.image(x - 10, CARD.y + 56, 'tiles', TILE.coin);
        this.add.text(x + 8, CARD.y + 56, String(DRAGON_PRICE), { ...TEXT, fontSize: '11px' }).setOrigin(0.5).setResolution(4);
      }
    });
  }

  update() {
    for (const a of this.accessories) a.update();
  }

  cheer(sprite) {
    if (sprite.cheering) return;
    sprite.cheering = true;
    play(this, 'wear');
    this.tweens.add({
      targets: sprite,
      angle: -360,
      duration: 600,
      ease: 'Cubic.InOut',
      onComplete: () => {
        sprite.setAngle(0);
        sprite.cheering = false;
      },
    });
  }
}
