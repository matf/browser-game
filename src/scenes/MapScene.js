import Phaser from 'phaser';
import { Accessories } from '../objects/Accessories.js';
import { loadSave, writeSave } from '../save.js';
import { FONT, WIDTH, HEIGHT, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play, startMusic } from '../sound.js';
import { addCoins, addHearts } from '../hud.js';
import { FOODS } from '../shop.js';
import { TILE } from './PreloadScene.js';
import { addButton } from './MenuPage.js';
import { dragonLook, showDragon } from '../dragons.js';
import { BOSSES, nameInSentence } from '../objects/Boss.js';
import { LEVELS } from '../levels.js';
import {
  HOME_ISLANDS,
  ISLANDS,
  SHOP_SPOT,
  WORLDS,
  isBossLevel,
  isOpen,
  islandOf,
  lastOnIsland,
  spotPosition,
  worldOf,
} from '../world.js';

const FLY_SPEED = 160; // how fast the dragon flies over the map, in pixels per second
const DRAGON_SCALE = 0.4; // size of the dragon on the map (1 = as big as in the levels)
const HOVER = 14; // how high above a station the dragon hovers, in pixels
const REVEAL_DELAY_MS = 700; // after a level, wait this long before showing what it opened
const DOT_SPACING = 6; // pixels between the dots of a path
const LOW_HEARTS = 2; // with this many hearts or fewer, the map asks whether to go to the shop first
const GATE_NEXT = 'gate-next'; // the glittering gate to the next island group, as a spot to fly to
const GATE_BACK = 'gate-back'; // the gate back to the group before

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// Where to put the clouds that hide an island you can't visit yet (around the island's middle).
const CLOUD_SPOTS = [[-38, -16], [0, -24], [38, -14], [-26, 8], [24, 10], [0, -2]];
const THEMES_WITH_TWINKLES = ['stars']; // islands where little stars blink over the map

// The world map of one island group: fly the dragon to a level (or the shop) and go in. A
// glittering gate leads to the next group once its boss is beaten, and another one leads back.
export class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
  }

  // data.firstWin: a level that was just finished for the first time. What it opens (the next
  // station, or a whole new island) is shown with a little show after the map appears.
  // data.fromShop: just back from the shop, so don't ask about the shop again.
  // data.arrived: just came through a gate (1 = forward, -1 = back).
  create(data) {
    setupCamera(this);
    startMusic(this);
    this.save = loadSave();
    this.worldIndex = Phaser.Math.Clamp(this.save.world, 0, WORLDS.length - 1);
    this.world = WORLDS[this.worldIndex];
    // The dragon is always somewhere on this group's map.
    if (this.save.at !== SHOP_SPOT && worldOf(this.save.at) !== this.worldIndex) this.save.at = this.world.first;
    this.leaving = false;
    this.flight = null; // the flying tween while the dragon is on its way
    this.target = null; // where it's flying to
    this.question = null; // the "go to the shop first?" box, while it shows
    this.askedShop = Boolean(data?.fromShop); // ask only once per visit to the map

    const fresh = data?.firstWin ?? null;
    // What the map shows right now: before the show, the fresh level isn't done yet.
    this.shown = { done: this.save.done.filter((l) => l !== fresh) };

    this.add.image(0, 0, this.world.map).setOrigin(0);
    this.addSeaSparkles();
    this.drawPaths();
    this.addIslandTaps();
    this.addShop();
    this.addStations();
    this.addGates();
    this.addDriftingClouds();
    this.addIslandClouds();
    this.addTwinkles();
    this.addVolcanoSmoke();
    const homes = this.worldIndex === 0 ? HOME_ISLANDS : [];
    for (const island of [...this.world.islands, this.world.boss, ...homes]) {
      this.add.text(island.label[0], island.label[1], island.name, { ...TEXT, fontSize: '10px' })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(7);
    }

    const [x, y] = this.spotPos(data?.arrived ? (data.arrived > 0 ? GATE_BACK : GATE_NEXT) : this.save.at);
    this.pos = { x, y: y - HOVER };
    this.dragon = showDragon(this.add.sprite(x, y, 'dragons'), dragonLook(this.save)).setScale(DRAGON_SCALE).setDepth(6);
    this.accessories = new Accessories(this, this.dragon, this.save.wear);

    addHearts(this)(this.save.hearts);
    addCoins(this)(this.save.coins);
    addMuteButton(this, 466, 14);
    this.add
      .image(372, 14, 'menu-icon')
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toMenu());
    const views = this.worldIndex === 0; // only the first group's islands can be visited
    const hint = IS_TOUCH
      ? `Tippe auf ein Level${views ? ' oder eine Insel' : ''}!`
      : `Pfeiltasten: wählen   Leertaste: los!${views ? '   I: Insel' : ''}`;
    this.add.text(WIDTH / 2, 14, hint, { ...TEXT, fontSize: '10px' }).setOrigin(0.5).setResolution(4).setDepth(10);

    // Key events instead of checking keys every frame, so even a very short tap counts.
    // While the shop question shows, the keys answer it instead.
    const onKeys = (names, action) =>
      names.forEach((name) =>
        this.input.keyboard.on(`keydown-${name}`, () => {
          if (this.leaving) return;
          if (this.question) this.question.key(name);
          else action();
        }),
      );
    onKeys(['LEFT', 'UP', 'A', 'W'], () => this.step(-1));
    onKeys(['RIGHT', 'DOWN', 'D', 'S'], () => this.step(1));
    onKeys(['SPACE', 'ENTER'], () => !this.flight && this.enter(this.save.at));
    onKeys(['ESC'], () => this.toMenu());
    onKeys(['I'], () => this.visitIsland(this.save.at === SHOP_SPOT ? this.world.islands[0] : islandOf(this.save.at)));

    this.refresh();
    if (fresh !== null) this.time.delayedCall(REVEAL_DELAY_MS, () => this.reveal(fresh));
    if (data?.arrived) this.arrive();
    this.cameras.main.fadeIn(250);
  }

  // Levels of this island group, in order.
  get levels() {
    return Array.from({ length: this.world.bossLevel - this.world.first + 1 }, (_, i) => this.world.first + i);
  }

  // Where a spot is on this map: a level, the shop or a gate.
  spotPos(spot) {
    if (spot === GATE_NEXT) return this.world.boss.gate;
    if (spot === GATE_BACK) return this.world.back;
    return spotPosition(spot, this.worldIndex);
  }

  update(time) {
    this.dragon.setPosition(this.pos.x, this.pos.y + Math.sin(time / 260) * 1.5);
    this.accessories.update();
  }

  // --- Building the map ---------------------------------------------------------------------

  addStations() {
    this.stations = new Map(); // level -> { pad, number, star }
    for (const level of this.levels) {
      const [x, y] = spotPosition(level);
      const pad = this.add.image(x, y, 'station-locked').setDepth(3);
      // A boss station has a little picture (like a flame) instead of a number.
      const number = isBossLevel(level)
        ? this.add.image(x, y - 1, this.world.boss.icon).setDepth(3)
        : this.add
            .text(x, y - 1, String(level - islandOf(level).firstLevel + 1), {
              ...TEXT,
              fontSize: '8px',
              strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setResolution(4)
            .setDepth(3);
      const star = this.add.image(x, y - 11, 'map-star').setDepth(4);
      // Bigger than the stone, so it's easy to hit with a finger.
      this.add
        .zone(x, y - 4, 30, 30)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.tapSpot(level));
      this.stations.set(level, { pad, number, star });
    }
  }

  // Tapping an island (not one of its stations) opens the island view (only islands that have one).
  addIslandTaps() {
    if (this.worldIndex !== 0) return;
    for (const island of [...ISLANDS, ...HOME_ISLANDS]) {
      const [x, y, rx, ry] = island.area;
      this.add
        .zone(x, y, rx * 2, ry * 2)
        .setInteractive(new Phaser.Geom.Ellipse(rx, ry, rx * 2, ry * 2), Phaser.Geom.Ellipse.Contains)
        .on('pointerdown', () => this.visitIsland(island));
    }
  }

  // The glittering gates: to the next island group (on the boss island, once the boss is beaten)
  // and back to the group before.
  addGates() {
    const gate = (spot, [x, y]) => {
      const ring = this.add.image(x, y, 'gate').setDepth(4);
      this.tweens.add({ targets: ring, scaleX: 1.12, scaleY: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const glitter = this.add
        .particles(x, y, 'pixel', {
          x: { min: -6, max: 6 },
          y: { min: -9, max: 9 },
          lifespan: 900,
          speed: { min: 4, max: 16 },
          scale: { start: 1, end: 0 },
          tint: [0xffffff, 0xffd84a, 0xff9fd0, 0xb8e8ff, 0xc9a7ff],
          frequency: 90,
        })
        .setDepth(4);
      const zone = this.add
        .zone(x, y, 30, 34)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.tapSpot(spot));
      return { parts: [ring, glitter, zone], ring };
    };
    this.gateNext = this.world.boss.gate && this.worldIndex < WORLDS.length - 1 ? gate(GATE_NEXT, this.world.boss.gate) : null;
    this.gateBack = this.world.back ? gate(GATE_BACK, this.world.back) : null;
  }

  // The gate to the next group is open once the boss is beaten.
  get gateOpen() {
    return Boolean(this.gateNext) && this.shown.done.includes(this.world.bossLevel);
  }

  addShop() {
    const shop = this.world.shop;
    this.add
      .image(shop.x, shop.y, 'shop-house')
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tapSpot(SHOP_SPOT));
    const sign = this.add
      .text(shop.x, shop.y - 54, 'Shop', { ...TEXT, fontSize: '9px', color: '#ffe066' })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(7);
    this.tweens.add({ targets: sign, y: sign.y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  // Dotted paths between the stations of each island, and over the water to the next island.
  drawPaths() {
    const g = this.add.graphics().setDepth(1);
    this.bridges = new Map(); // first level of an island -> the dots leading to it
    for (const level of this.levels.slice(0, -1)) {
      const dots = this.dotsBetween(spotPosition(level), spotPosition(level + 1));
      if (!lastOnIsland(level)) {
        for (const [x, y] of dots) {
          g.fillStyle(0x1b1630, 0.3).fillRect(x - 1, y, 2, 2);
          g.fillStyle(0xffffff, 0.9).fillRect(x - 1, y - 1, 2, 2);
        }
      } else {
        // Over the water: only there once the next island is open.
        this.bridges.set(level + 1, dots.map(([x, y]) => this.add.rectangle(x, y, 2, 2, 0xffffff).setDepth(1)));
      }
    }
  }

  // Points every DOT_SPACING pixels from a to b, leaving out the bits on top of the stations.
  dotsBetween([ax, ay], [bx, by]) {
    const length = Phaser.Math.Distance.Between(ax, ay, bx, by);
    const dots = [];
    for (let d = 10; d < length - 8; d += DOT_SPACING) {
      dots.push([Math.round(ax + ((bx - ax) * d) / length), Math.round(ay + ((by - ay) * d) / length)]);
    }
    return dots;
  }

  addIslandClouds() {
    this.islandClouds = new Map(); // island -> its clouds
    for (const island of [...this.world.islands, this.world.boss]) {
      const n = island.stations.length;
      const cx = island.stations.reduce((sum, [x]) => sum + x, 0) / n;
      const cy = island.stations.reduce((sum, [, y]) => sum + y, 0) / n - (island === this.world.boss ? 18 : 6);
      const clouds = CLOUD_SPOTS.map(([dx, dy], i) => {
        const cloud = this.add.image(cx + dx, cy + dy, 'map-cloud').setScale(1.1).setDepth(5);
        this.tweens.add({ targets: cloud, x: cloud.x + 3, duration: 1400 + i * 230, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        return cloud;
      });
      this.islandClouds.set(island, clouds);
    }
  }

  addDriftingClouds() {
    for (let i = 0; i < 3; i++) {
      const cloud = this.add
        .image(Phaser.Math.Between(0, WIDTH), 40 + i * 85, 'map-cloud')
        .setAlpha(0.45)
        .setScale(0.7)
        .setDepth(2);
      const drift = () => {
        const duration = ((WIDTH + 80 - cloud.x) / 6) * 1000; // 6 pixels per second
        this.tweens.add({
          targets: cloud,
          x: WIDTH + 40,
          duration,
          onComplete: () => {
            cloud.x = -40;
            drift();
          },
        });
      };
      drift();
    }
  }

  // Glints on the water.
  addSeaSparkles() {
    for (let i = 0; i < 14; i++) {
      const glint = this.add
        .image(Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(30, HEIGHT), 'pixel')
        .setAlpha(0)
        .setDepth(1);
      this.tweens.add({ targets: glint, alpha: 0.9, duration: 500, yoyo: true, repeat: -1, delay: i * 400, repeatDelay: 3000 });
    }
  }

  // Smoke puffs and a few sparks rising from the volcano.
  addVolcanoSmoke() {
    if (!this.world.boss.volcano) return;
    const [x, y] = this.world.boss.volcano;
    this.add
      .particles(x, y, 'map-cloud', {
        lifespan: 2600,
        speedY: { min: -12, max: -7 },
        speedX: { min: 1, max: 5 },
        scale: { start: 0.06, end: 0.22 },
        alpha: { start: 0.7, end: 0 },
        tint: 0x8a7a8a,
        frequency: 500,
      })
      .setDepth(6);
    this.add
      .particles(x, y, 'pixel', {
        lifespan: 900,
        speedY: { min: -30, max: -14 },
        speedX: { min: -10, max: 10 },
        scale: { start: 1, end: 0 },
        tint: [0xff7a2a, 0xffd84a],
        frequency: 300,
      })
      .setDepth(6);
  }

  // Little stars blinking over the star island.
  addTwinkles() {
    const island = this.world.islands.find((i) => THEMES_WITH_TWINKLES.includes(i.theme));
    if (!island) return;
    for (let i = 0; i < 8; i++) {
      const [x, y] = island.stations[i % island.stations.length];
      const star = this.add
        .image(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-50, -10), 'pixel')
        .setTint(0xfff3b0)
        .setDepth(4)
        .setAlpha(0);
      this.tweens.add({ targets: star, alpha: 1, duration: 600, yoyo: true, repeat: -1, delay: i * 350, repeatDelay: 1200 });
    }
  }

  // Show stations, stars, clouds and bridges for `this.shown`.
  refresh() {
    const shown = this.shown;
    let next = null; // the next level to play, which gently pulses
    this.stations.forEach(({ pad, number, star }, level) => {
      const done = shown.done.includes(level);
      const open = isOpen(shown, level);
      pad.setTexture(done ? 'station-done' : open ? 'station-open' : 'station-locked');
      number.setAlpha(open ? 1 : 0.5);
      star.setVisible(done);
      if (open && !done && next === null) next = level;
    });
    for (const [island, clouds] of this.islandClouds) {
      const open = isOpen(shown, island.firstLevel);
      for (const cloud of clouds) cloud.setVisible(!open);
      for (const dot of this.bridges.get(island.firstLevel) ?? []) dot.setVisible(open);
    }
    for (const part of this.gateNext?.parts ?? []) part.setVisible(this.gateOpen);
    this.gateNext?.parts[2].input && (this.gateNext.parts[2].input.enabled = this.gateOpen);

    this.pulse?.stop();
    this.stations.forEach(({ pad }) => pad.setScale(1));
    if (next !== null) {
      this.pulse = this.tweens.add({ targets: this.stations.get(next).pad, scale: 1.25, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  // --- After a level ------------------------------------------------------------------------

  // `level` was just finished for the first time: star on it, then open what comes next.
  reveal(level) {
    this.shown = { done: this.save.done };
    this.refresh();
    const station = this.stations.get(level);
    if (!station) return;
    station.star.setScale(0);
    this.tweens.add({ targets: station.star, scale: 1, duration: 400, ease: 'Back.Out' });

    const next = level + 1;
    if (isBossLevel(level)) {
      if (this.gateNext) this.openGate();
      return;
    }
    const boss = this.world.boss;
    if (next === this.world.bossLevel) {
      play(this, 'win');
      this.sparkle(WIDTH / 2, HEIGHT / 2, 60);
      const kind = LEVELS[next].boss;
      this.banner('Alle Inseln geschafft!', `Doch auf der ${boss.name} wartet ${nameInSentence(kind)}...`);
      // The boss island stays hidden until the first banner is gone.
      for (const cloud of this.islandClouds.get(boss)) cloud.setVisible(true);
      for (const dot of this.bridges.get(next)) dot.setVisible(false);
      this.time.delayedCall(3300, () => this.openIsland(boss, `${BOSSES[kind].name}!`, 'Traust du dich?'));
    } else if (lastOnIsland(level)) {
      this.openIsland(islandOf(next));
    } else {
      play(this, 'coin');
      const { pad } = this.stations.get(next);
      this.sparkle(pad.x, pad.y, 16);
    }
  }

  // The boss is beaten: the glittering gate to the next island group appears.
  openGate() {
    const { ring } = this.gateNext;
    ring.setScale(0);
    this.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, duration: 900, ease: 'Back.Out' });
    play(this, 'newdragon');
    this.sparkle(ring.x, ring.y, 60);
    this.banner('Ein glitzerndes Tor!', 'Flieg hinein, dahinter warten neue Inseln!');
  }

  // Just came through a gate: the dragon flies out of it, and the group's name shows.
  arrive() {
    this.flyTo(this.save.at, false, true);
    play(this, 'newdragon');
    this.sparkle(this.pos.x, this.pos.y, 40);
    this.banner(this.world.name, this.worldIndex > 0 && !this.save.done.includes(this.world.first) ? 'Neue Inseln!' : 'Willkommen zurück!');
  }

  // A new island: the clouds blow away and dots appear over the water.
  openIsland(island, title = 'Neue Insel!', subtitle = `Flieg zur ${island.name}!`) {
    for (const cloud of this.islandClouds.get(island)) {
      cloud.setVisible(true);
      const [cx] = island.label;
      this.tweens.killTweensOf(cloud);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + (cloud.x < cx ? -50 : 50),
        alpha: 0,
        scale: 1.6,
        duration: 1200,
        ease: 'Sine.In',
        onComplete: () => cloud.setVisible(false),
      });
    }
    (this.bridges.get(island.firstLevel) ?? []).forEach((dot, i) => {
      dot.setVisible(true).setScale(0);
      this.tweens.add({ targets: dot, scale: 1, duration: 200, delay: 300 + i * 60 });
    });
    play(this, 'newdragon');
    const [x, y] = spotPosition(island.firstLevel);
    this.sparkle(x, y, 40);
    this.banner(title, subtitle);
  }

  sparkle(x, y, count) {
    const emitter = this.add.particles(0, 0, 'pixel', {
      lifespan: 700,
      speed: { min: 30, max: 120 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd84a, 0xffffff, 0xff9fd0, 0xb8e8ff],
      emitting: false,
    }).setDepth(8);
    emitter.explode(count, x, y);
    this.time.delayedCall(800, () => emitter.destroy());
  }

  banner(title, subtitle) {
    const big = this.add.text(0, 0, title, { ...TEXT, fontSize: '24px', strokeThickness: 4 }).setOrigin(0.5).setResolution(4);
    const small = this.add.text(0, 20, subtitle, { ...TEXT, fontSize: '12px' }).setOrigin(0.5, 0).setResolution(4);
    const w = Math.max(big.width, small.width) + 24;
    const top = -big.height / 2 - 6;
    const panel = this.add.rectangle(0, top, w, small.y + small.height + 6 - top, 0x1b1630, 0.6).setOrigin(0.5, 0);
    const box = this.add.container(WIDTH / 2, 150, [panel, big, small]).setDepth(11).setScale(0);
    this.tweens.add({ targets: box, scale: 1, duration: 400, ease: 'Back.Out' });
    this.tweens.add({ targets: box, alpha: 0, delay: 2800, duration: 500, onComplete: () => box.destroy() });
  }

  // --- Moving around ------------------------------------------------------------------------

  tapSpot(spot) {
    if (this.leaving || this.question) return;
    if (typeof spot === 'number' && spot !== SHOP_SPOT && !isOpen(this.save, spot)) return this.locked(spot);
    this.flyTo(spot, true);
  }

  // Arrow keys: fly to the previous or next spot. The order is: the gate back, the shop, the
  // levels, the gate to the next group. Going on from a gate goes through it.
  step(dir) {
    const order = [...(this.gateBack ? [GATE_BACK] : []), SHOP_SPOT, ...this.levels, ...(this.gateOpen ? [GATE_NEXT] : [])];
    const from = this.target ?? this.save.at;
    const to = order[order.indexOf(from) + dir];
    if (to === undefined) {
      if (typeof from === 'string' && !this.flight) this.enter(from);
      return;
    }
    if (typeof to === 'number' && to !== SHOP_SPOT && !isOpen(this.save, to)) return this.locked(to);
    this.flyTo(to, typeof to === 'string');
  }

  // Fly there; with `enter`, go into the level or shop on arrival. With `always`, fly even when the
  // save already says the dragon is there (after coming through a gate).
  flyTo(spot, enter, always = false) {
    if (spot === this.save.at && !this.flight && !always) {
      if (enter) this.enter(spot);
      return;
    }
    this.flight?.stop();
    const [x, y] = this.spotPos(spot);
    const dx = x - this.pos.x;
    if (Math.abs(dx) > 2) this.dragon.setFlipX(dx < 0);
    const distance = Phaser.Math.Distance.Between(this.pos.x, this.pos.y, x, y - HOVER);
    this.target = spot;
    this.flight = this.tweens.add({
      targets: this.pos,
      x,
      y: y - HOVER,
      duration: Math.max(200, (distance / FLY_SPEED) * 1000),
      ease: 'Sine.InOut',
      onComplete: () => {
        this.flight = null;
        this.target = null;
        if (typeof spot === 'number') {
          this.save.at = spot;
          writeSave(this.save);
        }
        if (enter) this.enter(spot);
      },
    });
  }

  enter(spot) {
    if (this.leaving) return;
    if (spot === GATE_NEXT || spot === GATE_BACK) return this.throughGate(spot === GATE_NEXT ? 1 : -1);
    if (spot !== SHOP_SPOT && this.shouldAskShop()) return this.askShop(spot);
    this.leaving = true;
    play(this, 'start');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      spot === SHOP_SPOT ? this.scene.start('shop') : this.scene.start('game', { level: spot }),
    );
  }

  // Few hearts left but enough coins for food: a good moment to visit the shop.
  shouldAskShop() {
    const cheapest = Math.min(...FOODS.map((f) => f.price));
    return !this.askedShop && this.save.hearts <= LOW_HEARTS && this.save.coins >= cheapest;
  }

  // "Nur noch 1 Herz! Zuerst in den Shop?" with the buttons Zum Shop and Trotzdem los.
  askShop(level) {
    this.askedShop = true;
    play(this, 'nope');
    const hearts = this.save.hearts;
    // Covers the map, so taps only reach the box.
    const blocker = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b1630, 0.5).setOrigin(0).setInteractive();
    const panel = this.add.rectangle(WIDTH / 2, 132, 280, 140, 0x2b2140, 0.96).setStrokeStyle(3, 0xff9fc8);
    const heartIcons = Array.from({ length: hearts }, (_, i) =>
      this.add.image(WIDTH / 2 + (i - (hearts - 1) / 2) * 20, 82, 'tiles', TILE.heartFull),
    );
    const title = this.add
      .text(WIDTH / 2, 104, hearts === 1 ? 'Nur noch 1 Herz!' : `Nur noch ${hearts} Herzen!`, { ...TEXT, fontSize: '16px', strokeThickness: 4 })
      .setOrigin(0.5)
      .setResolution(4);
    const info = this.add
      .text(WIDTH / 2, 132, 'Willst du zuerst im Shop\nFutter für deinen Drachen kaufen?', { ...TEXT, fontSize: '11px', align: 'center' })
      .setOrigin(0.5)
      .setResolution(4);
    const close = () => {
      for (const part of parts) part.destroy();
      this.question = null;
    };
    const answers = [
      { label: 'Zum Shop', color: 0x5fd068, dark: true, x: WIDTH / 2 - 64, go: () => this.flyTo(SHOP_SPOT, true) },
      { label: 'Trotzdem los!', color: 0x4a3a6e, dark: false, x: WIDTH / 2 + 64, go: () => this.enter(level) },
    ];
    for (const a of answers) {
      a.action = () => {
        close();
        a.go();
      };
    }
    const buttons = answers.map((a) =>
      addButton(this, a.x, 178, a.label, () => a.action(), { width: 112, height: 26, color: a.color, dark: a.dark }),
    );
    const parts = [blocker, panel, ...heartIcons, title, info, ...buttons];
    parts.forEach((part) => part.setDepth(20));
    for (const heart of heartIcons) this.tweens.add({ targets: heart, scale: 1.25, duration: 400, yoyo: true, repeat: -1 });

    let selected = 0;
    const select = (i) => {
      selected = i;
      buttons.forEach((b, j) => b.bg.setStrokeStyle(j === i ? 3 : 2, j === i ? 0xffd84a : 0xffffff));
    };
    buttons.forEach((b, i) => b.bg.on('pointerover', () => select(i)));
    select(0);
    this.question = {
      key: (name) => {
        if (['LEFT', 'A', 'UP', 'W'].includes(name)) select(0);
        else if (['RIGHT', 'D', 'DOWN', 'S'].includes(name)) select(1);
        else if (name === 'ESC') close();
        else answers[selected].action();
      },
    };
  }

  // Through a gate to the next island group (dir 1) or back to the one before (dir -1).
  throughGate(dir) {
    this.leaving = true;
    play(this, 'newdragon');
    this.sparkle(this.pos.x, this.pos.y, 50);
    this.tweens.add({ targets: this.dragon, scale: 0, angle: 360, duration: 500, ease: 'Sine.In' });
    const world = WORLDS[this.worldIndex + dir];
    this.save.world = this.worldIndex + dir;
    this.save.at = dir > 0 ? world.first : world.bossLevel;
    writeSave(this.save);
    this.cameras.main.flash(500, 255, 255, 255);
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(250, 255, 255, 255);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', { arrived: dir }));
    });
  }

  // Go walking on an island: a level island that is open, or an island without levels. Only the
  // islands of the first group have an island view.
  visitIsland(island) {
    if (this.leaving || this.question) return;
    if (!ISLANDS.includes(island) && !HOME_ISLANDS.includes(island)) return;
    if (ISLANDS.includes(island) && !isOpen(this.save, island.firstLevel)) return play(this, 'nope');
    this.leaving = true;
    play(this, 'click');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('island', { island: island.theme }));
  }

  toMenu() {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'click');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('title'));
  }

  // Tapped a level that isn't open yet: the stone wiggles and says why.
  locked(level) {
    play(this, 'nope');
    const { pad } = this.stations.get(level);
    this.tweens.add({ targets: pad, x: pad.x + 2, duration: 50, yoyo: true, repeat: 3 });
    const island = islandOf(level);
    const text = isBossLevel(level)
      ? 'Schaff zuerst\nalle Inseln!'
      : level === island.firstLevel
      ? `Schaff zuerst alle Level\nder ${islandOf(level - 1).name}!`
      : `Schaff zuerst Level ${level - island.firstLevel}!`;
    this.say?.destroy();
    const [x, y] = spotPosition(level);
    this.say = this.add
      .text(Phaser.Math.Clamp(x, 70, WIDTH - 70), Math.max(y - 30, 40), text, { ...TEXT, fontSize: '10px', align: 'center' })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(11);
    const say = this.say;
    this.tweens.add({ targets: say, y: say.y - 8, alpha: 0, delay: 1400, duration: 500, onComplete: () => say.destroy() });
  }
}
