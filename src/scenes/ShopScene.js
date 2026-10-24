import Phaser from 'phaser';
import { FONT, setupCamera } from '../view.js';
import { ACCESSORY_ART, DRAGONS, TILE } from './PreloadScene.js';
import { Accessories } from '../objects/Accessories.js';
import { ACCESSORIES, DRAGON_PRICE, FOODS, MAX_HEARTS } from '../shop.js';
import { loadSave, writeSave } from '../save.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play } from '../sound.js';

const TEXT = {
  fontFamily: FONT,
  fontStyle: 'bold',
  color: '#ffffff',
  stroke: '#1b1630',
  strokeThickness: 3,
};
const COLORS = {
  background: 0x2b2140,
  panel: 0x3d2f5c,
  card: 0x4a3a6e,
  cardOwned: 0x3c6a5e,
  selected: 0xffd84a,
  border: 0x1b1630,
};

// The pages of the shop. tab: picture on the page button. cols/w/h: card layout, iconScale: how big
// the picture on each card is drawn.
const TABS = [
  { key: 'food', label: 'Futter', tab: ['food', 0, 1], cols: 4, w: 72, h: 80, iconScale: 2 },
  { key: 'dragons', label: 'Drachen', tab: ['dragons', 0, 0.3], cols: 3, w: 98, h: 84, iconScale: 1 },
  { key: 'accessories', label: 'Accessoires', tab: ['accessories', 1, 1.5], cols: 4, w: 72, h: 54, iconScale: 2 },
];
const TAB_BUTTON = { x: 168, y: 30, w: 100, h: 22, gap: 3 };
const GRID = { x: 168, y: 57, gap: 4 };
const PREVIEW = { x: 84, y: 105, scale: 2 };

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('shop');
  }

  create(data) {
    setupCamera(this);
    this.nextLevel = data?.nextLevel ?? 0; // the level that starts when you leave the shop
    this.save = loadSave();
    this.tab = 0;
    this.selected = 0;
    this.cards = [];

    this.add.rectangle(0, 0, 480, 270, COLORS.background).setOrigin(0);
    this.add.text(10, 6, 'Shop', { ...TEXT, fontSize: '16px' }).setResolution(4);
    this.heartIcons = Array.from({ length: MAX_HEARTS }, (_, i) =>
      this.add.image(84 + i * 20, 15, 'tiles', TILE.heartFull),
    );
    this.add.image(398, 15, 'tiles', TILE.coin);
    this.coinText = this.add.text(410, 6, '', { ...TEXT, fontSize: '14px' }).setResolution(4);
    addMuteButton(this, 466, 15, { mKey: false }); // the HUD underneath handles the M key

    this.add.rectangle(8, 30, 152, 200, COLORS.panel).setOrigin(0);
    this.preview = this.add.sprite(PREVIEW.x, PREVIEW.y, 'dragons').setScale(PREVIEW.scale).setDepth(5);
    this.previewName = this.add
      .text(PREVIEW.x, 165, '', { ...TEXT, fontSize: '12px' })
      .setOrigin(0.5)
      .setResolution(4);
    this.message = this.add
      .text(PREVIEW.x, 205, '', { ...TEXT, fontSize: '10px', align: 'center', wordWrap: { width: 140 } })
      .setOrigin(0.5)
      .setResolution(4);
    this.hearts = this.add.particles(0, 0, 'tiles', {
      frame: TILE.heartFull,
      lifespan: 700,
      speed: { min: 40, max: 90 },
      angle: { min: 220, max: 320 },
      scale: { start: 0.6, end: 0 },
      emitting: false,
    }).setDepth(6);

    const help = IS_TOUCH
      ? 'Antippen: kaufen'
      : 'Pfeile + Leertaste: kaufen   Tab: Seite   Enter: weiter';
    this.add.text(12, 250, help, { ...TEXT, fontSize: '8px' }).setOrigin(0, 0.5).setResolution(4);

    // Big green "go on" button, gently pulsing so it's easy to find.
    const nextLabel = this.add
      .text(0, 0, `Weiter zu Level ${this.nextLevel + 1}  ▶`, {
        ...TEXT,
        fontSize: '13px',
        color: '#1b1630',
        strokeThickness: 0,
      })
      .setOrigin(0.5)
      .setResolution(4);
    const nextBg = this.add
      .rectangle(0, 0, 176, 28, 0x5fd068)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close());
    const nextButton = this.add.container(380, 250, [nextBg, nextLabel]);
    this.tweens.add({ targets: nextButton, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Page buttons: Futter / Drachen / Accessoires.
    this.tabButtons = TABS.map((t, i) => {
      const x = TAB_BUTTON.x + i * (TAB_BUTTON.w + TAB_BUTTON.gap);
      const bg = this.add
        .rectangle(0, 0, TAB_BUTTON.w, TAB_BUTTON.h, COLORS.card)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.showTab(i));
      const [key, frame, scale] = t.tab;
      const icon = this.add.image(14, TAB_BUTTON.h / 2, key, frame).setScale(scale);
      const label = this.add
        .text(28, TAB_BUTTON.h / 2, t.label, { ...TEXT, fontSize: '11px' })
        .setOrigin(0, 0.5)
        .setResolution(4);
      this.add.container(x, TAB_BUTTON.y, [bg, icon, label]);
      return { bg, label };
    });

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,SPACE,ENTER,TAB,ESC');

    this.refresh();
    this.showTab(0);
  }

  update() {
    this.previewAccessories.update();

    const k = this.keys;
    const pressed = (key) => Phaser.Input.Keyboard.JustDown(key);
    const cols = TABS[this.tab].cols;
    if (pressed(k.ENTER) || pressed(k.ESC)) return this.close();
    if (pressed(k.TAB)) return this.showTab((this.tab + 1) % TABS.length);
    if (pressed(k.LEFT)) this.select(this.selected - 1);
    if (pressed(k.RIGHT)) this.select(this.selected + 1);
    if (pressed(k.UP)) this.select(this.selected - cols);
    if (pressed(k.DOWN)) this.select(this.selected + cols);
    if (pressed(k.SPACE)) this.cards[this.selected]?.item.act();
  }

  // Leave the shop and fly the next level (this also stops the shop scene).
  close() {
    writeSave(this.save);
    this.scene.start('game', { level: this.nextLevel });
  }

  // The things on the current page, with what to show on their card and what happens on buy.
  items() {
    const s = this.save;
    const coins = (price) => `${price} Münzen`;
    switch (TABS[this.tab].key) {
      case 'food':
        return FOODS.map((f) => ({
          name: f.name,
          icon: ['food', f.frame],
          info: f.heal >= MAX_HEARTS ? 'alle Herzen' : `+${f.heal} Herz${f.heal > 1 ? 'en' : ''}`,
          status: coins(f.price),
          act: () => this.feed(f),
        }));
      case 'dragons':
        return DRAGONS.map((d) => {
          const owned = s.dragons.includes(d.key);
          return {
            name: d.name,
            icon: ['dragons', d.row * 3],
            owned,
            status: !owned ? coins(DRAGON_PRICE) : s.dragon === d.key ? 'fliegt ✓' : 'wählen',
            act: () => this.pickDragon(d),
          };
        });
      default:
        return ACCESSORIES.map((a) => {
          const owned = s.items.includes(a.key);
          return {
            name: a.name,
            icon: ['accessories', ACCESSORY_ART[a.key].frame],
            owned,
            status: !owned ? coins(a.price) : s.wear.includes(a.key) ? 'an ✓' : 'aus',
            act: () => this.pickAccessory(a),
          };
        });
    }
  }

  showTab(index) {
    if (this.cards.length && index !== this.tab) play(this, 'click');
    if (index !== this.tab) this.selected = 0;
    this.tab = index;
    this.tabButtons.forEach(({ bg, label }, i) => {
      const active = i === index;
      bg.setFillStyle(active ? COLORS.selected : COLORS.card).setStrokeStyle(2, active ? 0xffffff : 0x8a78b8);
      label.setColor(active ? '#1b1630' : '#ffffff').setStroke('#1b1630', active ? 0 : 3);
    });
    this.drawCards();
  }

  drawCards() {
    for (const card of this.cards) card.box.destroy();
    const layout = TABS[this.tab];
    this.cards = this.items().map((item, i) => {
      const x = GRID.x + (i % layout.cols) * (layout.w + GRID.gap);
      const y = GRID.y + Math.floor(i / layout.cols) * (layout.h + GRID.gap);
      const bg = this.add
        .rectangle(0, 0, layout.w, layout.h, item.owned ? COLORS.cardOwned : COLORS.card)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.select(i);
          item.act();
        });
      const iconY = layout.key === 'dragons' ? 28 : layout.key === 'food' ? 24 : 14;
      const icon = this.add
        .image(layout.w / 2, iconY, item.icon[0], item.icon[1])
        .setScale(layout.iconScale);
      const lines = [item.name, item.info, item.status].filter(Boolean);
      const texts = lines.map((line, n) =>
        this.add
          .text(layout.w / 2, layout.h - 8 - (lines.length - 1 - n) * 11, line, {
            ...TEXT,
            fontSize: '8px',
            color: n === lines.length - 1 ? '#ffe066' : '#ffffff',
          })
          .setOrigin(0.5)
          .setResolution(4),
      );
      const box = this.add.container(x, y, [bg, icon, ...texts]);
      return { box, bg, item };
    });
    this.select(Math.min(this.selected, this.cards.length - 1));
  }

  select(index) {
    if (index < 0 || index >= this.cards.length) return;
    if (index !== this.selected) play(this, 'click');
    this.selected = index;
    this.cards.forEach((c, i) =>
      i === index
        ? c.bg.setStrokeStyle(2, COLORS.selected)
        : c.bg.setStrokeStyle(1, COLORS.border),
    );
  }

  // Show the current dragon, hearts and coins, then redraw the cards.
  refresh() {
    const s = this.save;
    this.heartIcons.forEach((h, i) => h.setFrame(i < s.hearts ? TILE.heartFull : TILE.heartEmpty));
    this.coinText.setText(String(s.coins));
    this.preview.play(`${s.dragon}-fly`, true);
    this.previewName.setText(DRAGONS.find((d) => d.key === s.dragon).name);
    this.previewAccessories?.destroy();
    this.previewAccessories = new Accessories(this, this.preview, s.wear);
    this.registry.set('coins', s.coins);
    this.registry.set('hearts', s.hearts);
    if (this.cards.length) this.drawCards();
  }

  say(text) {
    this.message.setText(text);
    this.tweens.killTweensOf(this.message);
    this.message.setScale(0);
    this.tweens.add({ targets: this.message, scale: 1, duration: 250, ease: 'Back.Out' });
  }

  // Pay `price` coins. Returns false (and says so) when there aren't enough.
  pay(price) {
    if (this.save.coins < price) {
      this.showEmptyPiggy();
      play(this, 'nope');
      return false;
    }
    this.save.coins -= price;
    return true;
  }

  // Not enough coins: an empty piggy bank pops up for a moment.
  showEmptyPiggy() {
    this.piggy?.destroy();
    const panel = this.add.rectangle(0, 0, 210, 104, COLORS.background, 0.95).setStrokeStyle(3, 0xff9fc8);
    const pig = this.add.image(0, -18, 'piggy').setScale(3);
    const text = this.add
      .text(0, 30, 'Deine Spardose ist leer!\nSammle mehr Münzen.', {
        ...TEXT,
        fontSize: '12px',
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(4);
    const box = this.add.container(240, 140, [panel, pig, text]).setDepth(40).setScale(0);
    this.piggy = box;
    this.tweens.add({ targets: box, scale: 1, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: pig, angle: { from: -10, to: 10 }, duration: 160, yoyo: true, repeat: 3 });
    this.time.delayedCall(1800, () => {
      if (this.piggy !== box) return;
      this.tweens.add({ targets: box, scale: 0, duration: 200, onComplete: () => box.destroy() });
      this.piggy = null;
    });
  }

  feed(food) {
    const s = this.save;
    const name = DRAGONS.find((d) => d.key === s.dragon).name;
    if (s.hearts >= MAX_HEARTS) {
      play(this, 'nope');
      return this.say(`${name} ist schon satt!`);
    }
    if (!this.pay(food.price)) return;
    s.hearts = Math.min(MAX_HEARTS, s.hearts + food.heal);
    this.hearts.explode(6, PREVIEW.x, PREVIEW.y - 20);
    this.tweens.add({ targets: this.preview, scale: PREVIEW.scale * 1.15, duration: 120, yoyo: true });
    this.say(`Mmmh, lecker!`);
    play(this, 'eat');
    this.commit();
  }

  pickDragon(dragon) {
    const s = this.save;
    if (!s.dragons.includes(dragon.key)) {
      if (!this.pay(DRAGON_PRICE)) return;
      s.dragons.push(dragon.key);
      this.say(`Hurra! ${dragon.name}\ngehört jetzt dir!`);
      play(this, 'newdragon');
    } else {
      this.say(`${dragon.name} fliegt\njetzt mit dir!`);
      play(this, 'wear');
    }
    s.dragon = dragon.key;
    this.commit();
  }

  pickAccessory(item) {
    const s = this.save;
    if (!s.items.includes(item.key)) {
      if (!this.pay(item.price)) return;
      s.items.push(item.key);
      this.say(`${item.name} gekauft!`);
      play(this, 'buy');
    } else if (s.wear.includes(item.key)) {
      s.wear = s.wear.filter((k) => k !== item.key);
      this.say(`${item.name} abgelegt.`);
      play(this, 'wear');
      return this.commit();
    } else {
      this.say(`Schick!`);
      play(this, 'wear');
    }
    // Only one thing per slot: putting on the crown takes off the bow.
    const sameSlot = ACCESSORIES.filter((a) => a.slot === item.slot).map((a) => a.key);
    s.wear = [...s.wear.filter((k) => !sameSlot.includes(k)), item.key];
    this.commit();
  }

  commit() {
    writeSave(this.save);
    this.refresh();
  }
}
