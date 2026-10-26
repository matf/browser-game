import Phaser from 'phaser';
import { Accessories } from '../objects/Accessories.js';
import { BuildMode } from '../objects/BuildMode.js';
import { Resident } from '../objects/Resident.js';
import { DRAGONS } from './PreloadScene.js';
import { loadSave, writeSave } from '../save.js';
import { hatchlingLook, growth, visitNest } from '../hatchery.js';
import { FONT, WIDTH, HEIGHT, ZOOM, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play, startMusic } from '../sound.js';
import { addCoins } from '../hud.js';
import { DECO } from '../shop.js';
import { SHOTS } from '../objects/Shooter.js';
import { HOME_ISLANDS, ISLANDS, isOpen, onIslandGround } from '../world.js';
import { dragonLook, showDragon } from '../dragons.js';

const WALK_SPEED = 80; // how fast your dragon walks on the island, in pixels per second
const DRAGON_SCALE = 0.5; // size of the dragon on the island (1 = as big as in the levels)
const EDGE = 12; // the dragon stays this many pixels away from the beach edge
const SWIPE = 50; // how far a finger has to swipe to get to the next island, in pixels
const DRAG_START = 8; // a finger that moves less than this is a tap, not a swipe
const SWITCH_MS = 500; // how long the trip to the next island takes

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// The island view: one big island at a time, side by side. Swipe (or the arrows) to get to the next
// island; tap somewhere and your dragon walks there.
export class IslandScene extends Phaser.Scene {
  constructor() {
    super('island');
  }

  // data.island: the theme of the island to show first.
  create(data) {
    setupCamera(this);
    startMusic(this);
    this.save = loadSave();
    this.leaving = false;
    // The islands without levels first, then the level islands that are open on the map.
    this.islands = [...HOME_ISLANDS, ...ISLANDS.filter((island) => isOpen(this.save, island.firstLevel))];
    this.index = Math.max(0, this.islands.findIndex((island) => island.theme === data?.island));
    this.islands.forEach((island, i) => this.add.image(i * WIDTH, 0, `island-${island.theme}`).setOrigin(0));
    // No camera bounds: they don't work with the zoomed camera, so scrolling is clamped by hand.
    this.cameras.main.scrollX = this.index * WIDTH;

    // Houses, trees and everything else you put on the islands.
    this.decoSprites = new Map();
    const themes = this.islands.map((island) => island.theme);
    for (const thing of this.save.placed) if (themes.includes(thing.island)) this.addDeco(thing);
    this.addNest();
    this.residents = [];
    this.moveIn();

    // Your dragon, with a little shadow on the ground. pos is its spot on the current island.
    this.pos = { x: WIDTH / 2, y: 212 };
    this.target = null;
    this.shadow = this.add.ellipse(0, 0, 22, 6, 0x1b1630, 0.25);
    this.dragon = showDragon(this.add.sprite(0, 0, 'dragons'), dragonLook(this.save)).setScale(DRAGON_SCALE);
    this.accessories = new Accessories(this, this.dragon, this.save.wear);

    this.addHud();
    this.builder = new BuildMode(this);
    this.addInput();
    this.showIsland();
    this.cameras.main.fadeIn(250);
  }

  update(time, delta) {
    this.walk(delta / 1000);
    for (const resident of this.residents) resident.update(time, delta);
    const x = this.index * WIDTH + this.pos.x + (this.trip?.offset ?? 0);
    const hover = 10 + Math.sin(time / 260) * 1.5;
    this.shadow.setPosition(x, this.pos.y).setDepth(this.pos.y - 1);
    this.dragon.setPosition(x, this.pos.y - hover).setDepth(this.pos.y);
    this.accessories.update();
  }

  // --- On screen ----------------------------------------------------------------------------

  addHud() {
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(1000);
    // The coins and the speaker don't know about scrolling, so pin everything they add.
    const before = this.children.list.length;
    addCoins(this)(this.save.coins);
    addMuteButton(this, 466, 14);
    this.children.list.slice(before).forEach(fixed);
    fixed(
      this.add
        .image(372, 14, 'map-icon')
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.toMap()),
    );
    this.title = fixed(this.add.text(WIDTH / 2, 16, '', { ...TEXT, fontSize: '16px', strokeThickness: 4 }).setOrigin(0.5).setResolution(4));
    const hint = IS_TOUCH ? 'Tippen: hinlaufen   Wischen: nächste Insel' : 'Pfeile: laufen   Q / E: andere Insel   B: bauen   Esc: Karte';
    this.hint = fixed(this.add.text(WIDTH / 2, HEIGHT - 8, hint, { ...TEXT, fontSize: '8px' }).setOrigin(0.5).setResolution(4));

    // Arrows to the islands left and right, and a dot for each island.
    this.arrows = [-1, 1].map((dir) => {
      const arrow = fixed(
        this.add
          .text(dir < 0 ? 14 : WIDTH - 14, HEIGHT / 2, dir < 0 ? '◀' : '▶', { ...TEXT, fontSize: '22px', strokeThickness: 4 })
          .setOrigin(0.5)
          .setResolution(4)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', (pointer, x, y, event) => {
            event.stopPropagation();
            this.go(this.index + dir);
          }),
      );
      this.tweens.add({ targets: arrow, x: arrow.x + dir * 3, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      return arrow;
    });
    this.dots = this.islands.map((_, i) =>
      fixed(this.add.circle(WIDTH / 2 + (i - (this.islands.length - 1) / 2) * 10, HEIGHT - 20, 3, 0xffffff)),
    );
  }

  // The hint and the dots at the bottom make room for the building bar.
  setHintVisible(visible) {
    this.hint.setVisible(visible);
    for (const dot of this.dots) dot.setVisible(visible);
  }

  // The theme of the island you're on; placed things remember their island by it.
  theme() {
    return this.islands[this.index].theme;
  }

  // x on the current island → x in the world (the islands sit side by side).
  islandX(x) {
    return this.index * WIDTH + x;
  }

  // Show a placed thing; `pop` makes it bounce in.
  addDeco(thing, pop = false) {
    const index = this.islands.findIndex((island) => island.theme === thing.island);
    const frame = DECO.find((d) => d.key === thing.key).frame;
    const sprite = this.add.image(index * WIDTH + thing.x, thing.y, 'deco', frame).setOrigin(0.5, 1).setDepth(thing.y);
    this.decoSprites.set(thing, sprite);
    if (pop) {
      sprite.setScale(0.3);
      this.tweens.add({ targets: sprite, scale: 1, duration: 300, ease: 'Back.Out' });
    }
  }

  removeDeco(thing) {
    this.decoSprites.get(thing)?.destroy();
    this.decoSprites.delete(thing);
  }

  // Your other dragons (not the one with you) each live in a house: the first dragon in the first
  // house you placed, and so on; grown-up hatchlings after them. Babies, and grown-ups without a
  // house, stay at the nest. Called again whenever a house is placed or put away.
  moveIn() {
    const before = new Set(this.residents.map((r) => r.look.key));
    for (const resident of this.residents) resident.destroy();
    const homes = this.save.placed.filter((t) => DECO.find((d) => d.key === t.key).home);
    const dragons = [
      ...this.save.dragons.map((key) => ({ key, name: DRAGONS.find((d) => d.key === key).name, anim: `${key}-fly` })),
      ...this.save.hatchlings.filter((h) => growth(h) >= 1).map((h) => hatchlingLook(h)),
    ].filter((look) => look.key !== this.save.dragon);
    this.residents = [];
    homes.forEach((home, i) => {
      const index = this.islands.findIndex((island) => island.theme === home.island);
      if (!dragons[i] || index < 0) return;
      const resident = new Resident(this, dragons[i], { x: home.x, y: home.y }, index * WIDTH);
      this.residents.push(resident);
      if (this.started && !before.has(dragons[i].key)) {
        this.sparkle(index * WIDTH + home.x, home.y - 10);
        resident.say(`${dragons[i].name} zieht ein!`);
        play(this, 'newdragon');
      }
    });
    // Dragons without a house fly around over the islands, one island after the other, starting with
    // the one you're on. Babies stay at the nest.
    dragons.slice(homes.length).forEach((look, i) => {
      const index = (this.index + i) % this.islands.length;
      this.residents.push(new Resident(this, look, { x: WIDTH / 2, y: 165 }, index * WIDTH, { flying: true }));
    });
    const babies = this.save.hatchlings.filter((h) => growth(h) < 1).map((h) => hatchlingLook(h));
    for (const look of babies) this.addNestDragon(look);
    this.started = true;
  }

  // --- The Brutinsel ------------------------------------------------------------------------

  // The nest, with today's egg in it.
  addNest() {
    this.nestIndex = this.islands.findIndex((island) => island.nest);
    const { x, y } = this.islands[this.nestIndex].nest;
    const left = this.nestIndex * WIDTH;
    this.add.image(left + x, y, 'nest').setDepth(y - 6);
    this.egg = this.add.image(left + x, y - 4, 'egg').setDepth(y - 5).setVisible(Boolean(this.save.egg));
    this.nestChecked = false;
  }

  // A hatchling strolling around the nest.
  addNestDragon(look) {
    const { nest } = this.islands[this.nestIndex];
    const resident = new Resident(this, look, { x: nest.x, y: nest.y + 14 }, this.nestIndex * WIDTH, { goesInside: false });
    this.residents.push(resident);
    return resident;
  }

  // On the Brutinsel (once per visit): yesterday's egg hatches, and today's egg appears.
  checkNest() {
    if (this.nestChecked) return;
    this.nestChecked = true;
    const { hatched, laid } = visitNest(this.save);
    writeSave(this.save);
    const { x, y } = this.islands[this.nestIndex].nest;
    const left = this.nestIndex * WIDTH;
    const layEgg = () => {
      if (!laid) return;
      this.egg.setVisible(true).setScale(0);
      this.tweens.add({ targets: this.egg, scale: 1, duration: 400, ease: 'Back.Out' });
      play(this, 'coin');
      this.banner('Ein Drachen-Ei!', 'Morgen schlüpft ein Baby.');
    };
    if (!hatched) return this.time.delayedCall(600, layEgg);
    // The egg wobbles, cracks open with sparkles, and the baby is there. Then you choose what it
    // will spit, and today's egg appears.
    this.tweens.add({ targets: this.egg, angle: { from: -15, to: 15 }, duration: 120, yoyo: true, repeat: 5, delay: 600 });
    this.time.delayedCall(2100, () => {
      this.egg.setVisible(false).setAngle(0);
      this.sparkle(left + x, y - 6);
      play(this, 'newdragon');
      const baby = this.addNestDragon(hatchlingLook(hatched));
      baby.pos.y = y + 2;
      this.banner('Ein Baby ist geschlüpft!', `Es heißt ${hatched.name}.`);
    });
    this.time.delayedCall(4600, () => this.chooseShot(hatched, () => this.time.delayedCall(3000, layEgg)));
  }

  // A dragon on the island was tapped: its name, and a button to fly with it from now on.
  tapResident(resident) {
    const { key, name } = resident.look;
    const hatchling = this.save.hatchlings.find((h) => `hatchling-${h.id}` === key);
    if (hatchling && growth(hatchling) < 1) return resident.say(`${name} ist noch ein Baby`);
    resident.say();
    this.flyButton?.destroy();
    const bg = this.add.rectangle(0, 0, 76, 18, 0x5fd068).setStrokeStyle(2, 0xffffff);
    const label = this.add.text(0, 0, 'Mitfliegen', { ...TEXT, fontSize: '10px', color: '#1b1630', strokeThickness: 0 }).setOrigin(0.5).setResolution(4);
    const button = this.add.container(resident.sprite.x, resident.sprite.y - 36, [bg, label]).setDepth(960);
    this.flyButton = button;
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', (p, x, y, event) => {
      event.stopPropagation();
      button.destroy();
      if (hatchling && !hatchling.shot) this.chooseShot(hatchling, () => this.flyWith(resident.look));
      else this.flyWith(resident.look);
    });
    this.time.delayedCall(2500, () => button.destroy());
  }

  // Swap: the tapped dragon flies with you now, and the one you had moves into its house.
  flyWith(look) {
    this.save.dragon = look.key;
    writeSave(this.save);
    showDragon(this.dragon, dragonLook(this.save));
    this.sparkle(this.dragon.x, this.dragon.y);
    play(this, 'newdragon');
    this.moveIn();
    this.banner(`${look.name} fliegt jetzt mit dir!`, 'In den Levels spuckt es sein eigenes Ding.');
  }

  // "Was soll Krümel spucken?": a box with every kind of shot. Saves the choice in the hatchling,
  // then calls done.
  chooseShot(hatchling, done) {
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(1010);
    const parts = [];
    const add = (obj) => {
      parts.push(fixed(obj));
      return obj;
    };
    // Covers the island, so taps only reach the box.
    add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b1630, 0.55).setOrigin(0).setInteractive().on('pointerdown', (p, x, y, event) => event.stopPropagation()));
    add(this.add.rectangle(WIDTH / 2, 140, 330, 214, 0x2b2140, 0.97).setStrokeStyle(3, 0xff9fc8));
    add(this.add.text(WIDTH / 2, 50, `Was soll ${hatchling.name} spucken?`, { ...TEXT, fontSize: '15px', strokeThickness: 4 }).setOrigin(0.5).setResolution(4));
    Object.entries(SHOTS).forEach(([key, shot], i) => {
      const x = WIDTH / 2 + ((i % 3) - 1) * 104;
      const y = 92 + Math.floor(i / 3) * 56;
      add(
        this.add
          .rectangle(x, y, 96, 48, 0x4a3a6e)
          .setStrokeStyle(2, 0xffffff)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', (p, px, py, event) => {
            event.stopPropagation();
            hatchling.shot = key;
            writeSave(this.save);
            play(this, 'wear');
            for (const part of parts) part.destroy();
            this.bannerBox?.destroy();
            this.banner(`${hatchling.name} spuckt ${shot.name}!`, 'Wenn es groß ist, kann es mitfliegen.');
            done?.();
          }),
      );
      add(this.add.image(x, y - 8, shot.texture, shot.frame).setScale(shot.scale * 1.5));
      add(this.add.text(x, y + 13, shot.name, { ...TEXT, fontSize: '10px' }).setOrigin(0.5).setResolution(4));
    });
  }

  banner(title, subtitle) {
    this.bannerBox?.destroy();
    const big = this.add.text(0, 0, title, { ...TEXT, fontSize: '20px', strokeThickness: 4 }).setOrigin(0.5).setResolution(4);
    const small = this.add.text(0, 16, subtitle, { ...TEXT, fontSize: '12px' }).setOrigin(0.5, 0).setResolution(4);
    const w = Math.max(big.width, small.width) + 24;
    const top = -big.height / 2 - 6;
    const panel = this.add.rectangle(0, top, w, small.y + small.height + 6 - top, 0x1b1630, 0.6).setOrigin(0.5, 0);
    const box = this.add.container(WIDTH / 2, 62, [panel, big, small]).setScrollFactor(0, 0, true).setDepth(1003).setScale(0);
    this.bannerBox = box;
    this.tweens.add({ targets: box, scale: 1, duration: 400, ease: 'Back.Out' });
    this.tweens.add({ targets: box, alpha: 0, delay: 3200, duration: 500, onComplete: () => box.destroy() });
  }

  sparkle(x, y) {
    const emitter = this.add.particles(0, 0, 'pixel', {
      lifespan: 700,
      speed: { min: 30, max: 100 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd84a, 0xffffff, 0xff9fd0, 0xb8e8ff],
      emitting: false,
    }).setDepth(950);
    emitter.explode(24, x, y);
    this.time.delayedCall(800, () => emitter.destroy());
  }

  // Name, arrows and dots for the island you're on.
  showIsland() {
    if (this.islands[this.index].nest) this.checkNest();
    this.title.setText(this.islands[this.index].name);
    this.arrows[0].setVisible(this.index > 0);
    this.arrows[1].setVisible(this.index < this.islands.length - 1);
    this.dots.forEach((dot, i) => dot.setFillStyle(i === this.index ? 0xffd84a : 0xffffff, i === this.index ? 1 : 0.6));
  }

  // --- Input ----------------------------------------------------------------------------------

  addInput() {
    const camera = this.cameras.main;
    // A finger (or the mouse) that moves sideways drags the islands; a short tap walks there.
    this.input.on('pointerdown', (pointer) => {
      if (this.trip) return;
      this.drag = { startX: pointer.x, scrollX: camera.scrollX, moving: false };
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.drag?.moving) this.builder.hover(pointer.x / ZOOM, pointer.y / ZOOM);
      if (!this.drag || !pointer.isDown) return;
      const dx = (pointer.x - this.drag.startX) / camera.zoom;
      if (Math.abs(dx) > DRAG_START) this.drag.moving = true;
      if (this.drag.moving) camera.scrollX = Phaser.Math.Clamp(this.drag.scrollX - dx, 0, (this.islands.length - 1) * WIDTH);
    });
    this.input.on('pointerup', (pointer) => {
      const drag = this.drag;
      this.drag = null;
      if (!drag || this.trip) return;
      if (!drag.moving) {
        if (this.builder.tap(pointer.x / ZOOM, pointer.y / ZOOM)) return;
        return this.walkTo(pointer.x / ZOOM, pointer.y / ZOOM);
      }
      const dx = (pointer.x - drag.startX) / camera.zoom;
      this.go(this.index + (dx < -SWIPE ? 1 : dx > SWIPE ? -1 : 0), true);
    });

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S');
    this.input.keyboard.on('keydown-Q', () => this.go(this.index - 1));
    this.input.keyboard.on('keydown-E', () => this.go(this.index + 1));
    this.input.keyboard.on('keydown-ESC', () => this.toMap());
    this.input.keyboard.on('keydown-B', () => this.builder.toggle());
  }

  // --- Moving around --------------------------------------------------------------------------

  walkTo(x, y) {
    if (!onIslandGround(x, y + 4, EDGE)) return; // in the water: stay
    this.target = { x, y: y + 4 };
  }

  // Arrow keys walk directly; otherwise walk towards the tapped spot. Never into the water.
  walk(seconds) {
    if (this.trip) return;
    const k = this.keys;
    let dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (dx || dy) {
      this.target = null;
    } else if (this.target) {
      dx = this.target.x - this.pos.x;
      dy = this.target.y - this.pos.y;
      if (Math.hypot(dx, dy) < 2) {
        this.target = null;
        return;
      }
    } else {
      return;
    }
    const length = Math.hypot(dx, dy);
    const step = Math.min(WALK_SPEED * seconds, this.target ? length : Infinity);
    const nx = this.pos.x + (dx / length) * step;
    const ny = this.pos.y + (dy / length) * step;
    // Slide along the beach instead of stopping when only one direction is blocked.
    if (onIslandGround(nx, ny, EDGE)) Object.assign(this.pos, { x: nx, y: ny });
    else if (onIslandGround(nx, this.pos.y, EDGE)) this.pos.x = nx;
    else if (onIslandGround(this.pos.x, ny, EDGE)) this.pos.y = ny;
    else this.target = null;
    if (Math.abs(dx) > 0.5) this.dragon.setFlipX(dx < 0);
  }

  // Go to another island (or, with `snap`, back to this one after a short swipe). The camera glides
  // over and your dragon flies along.
  go(index, snap = false) {
    if (this.trip || this.leaving) return;
    if (index < 0 || index >= this.islands.length) {
      if (!snap) return play(this, 'nope');
      index = this.index;
    }
    const camera = this.cameras.main;
    const dir = index - this.index;
    if (dir) {
      play(this, 'click');
      this.dragon.setFlipX(dir < 0);
    }
    this.target = null;
    // While travelling, the dragon is drawn `offset` pixels away from its island.
    this.trip = { offset: 0 };
    this.tweens.add({ targets: this.trip, offset: dir * WIDTH, duration: SWITCH_MS, ease: 'Sine.InOut' });
    this.tweens.add({
      targets: camera,
      scrollX: index * WIDTH,
      duration: dir ? SWITCH_MS : 200,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.index = index;
        this.trip = null;
        this.showIsland();
      },
    });
  }

  toMap() {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'click');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', {}));
  }
}
