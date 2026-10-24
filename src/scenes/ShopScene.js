import Phaser from 'phaser';
import { ACCESSORY_ART, DRAGONS, TILE } from './PreloadScene.js';
import { Accessories } from '../objects/Accessories.js';
import { ACCESSORIES, DRAGON_PRICE, FOODS, MAX_HEARTS } from '../shop.js';
import { loadSave, writeSave } from '../save.js';

const TEXT = {
  fontFamily: 'monospace',
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

// Card layout for each page of the shop: columns, card size, how big the picture is drawn.
const TABS = [
  { key: 'food', label: 'Futter', cols: 4, w: 72, h: 80, iconScale: 2 },
  { key: 'dragons', label: 'Drachen', cols: 3, w: 98, h: 92, iconScale: 1 },
  { key: 'accessories', label: 'Accessoires', cols: 4, w: 72, h: 62, iconScale: 2 },
];
const GRID = { x: 168, y: 50, gap: 4 };
const PREVIEW = { x: 84, y: 105, scale: 2 };

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('shop');
  }

  create(data) {
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

    this.add.rectangle(8, 30, 152, 222, COLORS.panel).setOrigin(0);
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

    this.add
      .text(168, 262, 'Pfeile: wählen   Leertaste: kaufen   Tab: Seite', {
        ...TEXT,
        fontSize: '8px',
      })
      .setOrigin(0, 0.5)
      .setResolution(4);
    this.add
      .text(472, 262, `Enter: weiter zu Level ${this.nextLevel + 1} ▶`, {
        ...TEXT,
        fontSize: '9px',
        color: '#ffe066',
      })
      .setOrigin(1, 0.5)
      .setResolution(4)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close());

    this.tabTexts = TABS.map((t, i) =>
      this.add
        .text(GRID.x + i * 90, 32, t.label, { ...TEXT, fontSize: '11px' })
        .setResolution(4)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.showTab(i)),
    );

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
    if (index !== this.tab) this.selected = 0;
    this.tab = index;
    this.tabTexts.forEach((t, i) => t.setColor(i === index ? '#ffd84a' : '#ffffff'));
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
      const iconY = layout.key === 'dragons' ? 30 : layout.key === 'food' ? 24 : 18;
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
      this.say('Zu wenig Münzen!\nSammle noch mehr.');
      this.cameras.main.shake(120, 0.005);
      return false;
    }
    this.save.coins -= price;
    return true;
  }

  feed(food) {
    const s = this.save;
    const name = DRAGONS.find((d) => d.key === s.dragon).name;
    if (s.hearts >= MAX_HEARTS) return this.say(`${name} ist schon satt!`);
    if (!this.pay(food.price)) return;
    s.hearts = Math.min(MAX_HEARTS, s.hearts + food.heal);
    this.hearts.explode(6, PREVIEW.x, PREVIEW.y - 20);
    this.tweens.add({ targets: this.preview, scale: PREVIEW.scale * 1.15, duration: 120, yoyo: true });
    this.say(`Mmmh, lecker!`);
    this.commit();
  }

  pickDragon(dragon) {
    const s = this.save;
    if (!s.dragons.includes(dragon.key)) {
      if (!this.pay(DRAGON_PRICE)) return;
      s.dragons.push(dragon.key);
      this.say(`Hurra! ${dragon.name}\ngehört jetzt dir!`);
    } else {
      this.say(`${dragon.name} fliegt\njetzt mit dir!`);
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
    } else if (s.wear.includes(item.key)) {
      s.wear = s.wear.filter((k) => k !== item.key);
      this.say(`${item.name} abgelegt.`);
      return this.commit();
    } else {
      this.say(`Schick!`);
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
