import { DECO } from '../shop.js';
import { writeSave } from '../save.js';
import { FONT, WIDTH, HEIGHT } from '../view.js';
import { onIslandGround } from '../world.js';
import { play } from '../sound.js';

export const BAR_TOP = 224; // while building, taps below this line belong to the bar
const SLOT = { x: 96, gap: 36, y: 247, iconScale: 0.55 }; // the things in your bag, along the bottom
const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// Bauen on the island view: pick something from your bag and tap the island to put it there.
// Tapping something that stands on the island puts it back into the bag.
export class BuildMode {
  constructor(scene) {
    this.scene = scene;
    this.save = scene.save;
    this.active = false;
    this.selected = null; // the DECO item you're about to place
    this.parts = []; // the bar, while building
    this.ghost = scene.add.image(0, 0, 'deco', 0).setOrigin(0.5, 1).setAlpha(0.6).setVisible(false).setDepth(999);

    const bg = scene.add.rectangle(0, 0, 64, 22, 0x5fd068).setStrokeStyle(2, 0xffffff);
    this.label = scene.add.text(0, 0, 'Bauen', { ...TEXT, fontSize: '12px', color: '#1b1630', strokeThickness: 0 }).setOrigin(0.5).setResolution(4);
    scene.add
      .container(40, 248, [bg, this.label])
      .setScrollFactor(0, 0, true)
      .setDepth(1002);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, x, y, event) => {
      event.stopPropagation();
      this.toggle();
    });
  }

  toggle() {
    this.active = !this.active;
    play(this.scene, 'click');
    this.label.setText(this.active ? 'Fertig' : 'Bauen');
    this.scene.setHintVisible(!this.active);
    this.select(null);
    this.drawBar();
  }

  // The things in your bag, each with how many you have.
  drawBar() {
    for (const part of this.parts) part.destroy();
    this.parts = [];
    if (!this.active) return;
    const fixed = (obj) => {
      this.parts.push(obj.setScrollFactor(0).setDepth(1001));
      return obj;
    };
    fixed(this.scene.add.rectangle(0, BAR_TOP, WIDTH, HEIGHT - BAR_TOP, 0x1b1630, 0.75).setOrigin(0));
    const items = DECO.filter((d) => this.save.bag[d.key] > 0);
    if (!items.length) {
      fixed(this.scene.add.text(SLOT.x - 16, SLOT.y, 'Deine Tasche ist leer. Kauf Deko im Shop!', { ...TEXT, fontSize: '10px' }).setOrigin(0, 0.5).setResolution(4));
      return;
    }
    fixed(this.scene.add.text(WIDTH / 2, BAR_TOP - 8, this.hint(), { ...TEXT, fontSize: '9px' }).setOrigin(0.5).setResolution(4));
    items.forEach((item, i) => {
      const x = SLOT.x + i * SLOT.gap;
      const chosen = this.selected === item;
      fixed(
        this.scene.add
          .rectangle(x, SLOT.y, SLOT.gap - 4, 34, chosen ? 0xffd84a : 0x4a3a6e)
          .setStrokeStyle(2, 0xffffff)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', (pointer, px, py, event) => {
            event.stopPropagation();
            this.select(chosen ? null : item);
          }),
      );
      fixed(this.scene.add.image(x, SLOT.y + 12, 'deco', item.frame).setOrigin(0.5, 1).setScale(SLOT.iconScale));
      fixed(this.scene.add.text(x + 12, SLOT.y + 12, String(this.save.bag[item.key]), { ...TEXT, fontSize: '9px' }).setOrigin(1).setResolution(4));
    });
  }

  hint() {
    return this.selected ? `Tippe auf die Insel: ${this.selected.name} hinstellen` : 'Wähle etwas aus, oder tippe auf ein Ding, um es wegzuräumen';
  }

  select(item) {
    if (item) play(this.scene, 'click');
    this.selected = item;
    this.ghost.setVisible(false);
    if (item) this.ghost.setFrame(item.frame);
    this.drawBar();
  }

  // Does the thing fit there? All of its bottom edge has to stand on the island.
  fits(item, x, y) {
    const half = item.size[0] / 2;
    return onIslandGround(x - half, y, 4) && onIslandGround(x + half, y, 4);
  }

  // The pointer moved to (x, y) on the current island: the ghost follows it.
  hover(x, y) {
    if (!this.active || !this.selected || y > BAR_TOP) return this.ghost.setVisible(false);
    this.ghost
      .setVisible(true)
      .setPosition(this.scene.islandX(x), Math.round(y))
      .setTint(this.fits(this.selected, x, y) ? 0xffffff : 0xff6060);
  }

  // A tap at (x, y) on the current island. Returns true when building used it.
  tap(x, y) {
    if (!this.active) return false;
    if (y > BAR_TOP) return true;
    const island = this.scene.theme();
    x = Math.round(x);
    y = Math.round(y);
    if (this.selected) {
      const item = this.selected;
      if (!this.fits(item, x, y)) {
        play(this.scene, 'nope');
        return true;
      }
      const thing = { key: item.key, island, x, y };
      this.save.placed.push(thing);
      this.save.bag[item.key] -= 1;
      this.scene.addDeco(thing, true);
      if (item.home) this.scene.moveIn();
      play(this.scene, 'wear');
      if (!this.save.bag[item.key]) this.select(null);
      else this.drawBar();
    } else {
      // The frontmost thing under the finger goes back into the bag.
      const hit = this.save.placed
        .filter((t) => t.island === island)
        .sort((a, b) => b.y - a.y)
        .find((t) => {
          const [w, h] = DECO.find((d) => d.key === t.key).size;
          return Math.abs(x - t.x) <= w / 2 && y <= t.y + 2 && y >= t.y - h;
        });
      if (!hit) return true;
      this.save.placed.splice(this.save.placed.indexOf(hit), 1);
      this.save.bag[hit.key] = (this.save.bag[hit.key] ?? 0) + 1;
      this.scene.removeDeco(hit);
      if (DECO.find((d) => d.key === hit.key).home) this.scene.moveIn();
      play(this.scene, 'click');
      this.drawBar();
    }
    writeSave(this.save);
    return true;
  }
}
