import Phaser from 'phaser';
import { Accessories } from '../objects/Accessories.js';
import { loadSave, writeSave } from '../save.js';
import { FONT, WIDTH, HEIGHT, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play, startMusic } from '../sound.js';
import { addCoins, addHearts } from '../hud.js';
import {
  ISLANDS,
  LEVELS_PER_ISLAND,
  LEVEL_COUNT,
  SHOP,
  SHOP_SPOT,
  isOpen,
  islandOf,
  spotPosition,
} from '../world.js';

const FLY_SPEED = 160; // how fast the dragon flies over the map, in pixels per second
const DRAGON_SCALE = 0.4; // size of the dragon on the map (1 = as big as in the levels)
const HOVER = 14; // how high above a station the dragon hovers, in pixels
const REVEAL_DELAY_MS = 700; // after a level, wait this long before showing what it opened
const DOT_SPACING = 6; // pixels between the dots of a path

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// Where to put the clouds that hide an island you can't visit yet (around the island's middle).
const CLOUD_SPOTS = [[-38, -16], [0, -24], [38, -14], [-26, 8], [24, 10], [0, -2]];

// The world map: fly the dragon to a level (or the shop) and go in.
export class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
  }

  // data.firstWin: a level that was just finished for the first time. What it opens (the next
  // station, or a whole new island) is shown with a little show after the map appears.
  create(data) {
    setupCamera(this);
    startMusic(this);
    this.save = loadSave();
    this.leaving = false;
    this.flight = null; // the flying tween while the dragon is on its way
    this.target = null; // where it's flying to

    const fresh = data?.firstWin ?? null;
    // What the map shows right now: before the show, the fresh level isn't done yet.
    this.shown = { done: this.save.done.filter((l) => l !== fresh) };

    this.add.image(0, 0, 'map').setOrigin(0);
    this.addSeaSparkles();
    this.drawPaths();
    this.addShop();
    this.addStations();
    this.addDriftingClouds();
    this.addIslandClouds();
    this.addTwinkles();
    for (const island of ISLANDS) {
      this.add.text(island.label[0], island.label[1], island.name, { ...TEXT, fontSize: '10px' })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(7);
    }

    const [x, y] = spotPosition(this.save.at);
    this.pos = { x, y: y - HOVER };
    this.dragon = this.add.sprite(x, y, 'dragons').play(`${this.save.dragon}-fly`).setScale(DRAGON_SCALE).setDepth(6);
    this.accessories = new Accessories(this, this.dragon, this.save.wear);

    addHearts(this)(this.save.hearts);
    addCoins(this)(this.save.coins);
    addMuteButton(this, 466, 14);
    this.add
      .image(372, 14, 'menu-icon')
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toMenu());
    const hint = IS_TOUCH ? 'Tippe auf ein Level!' : 'Pfeiltasten: wählen   Leertaste: los!';
    this.add.text(WIDTH / 2, 14, hint, { ...TEXT, fontSize: '10px' }).setOrigin(0.5).setResolution(4).setDepth(10);

    // Key events instead of checking keys every frame, so even a very short tap counts.
    const onKeys = (names, action) =>
      names.forEach((name) => this.input.keyboard.on(`keydown-${name}`, () => !this.leaving && action()));
    onKeys(['LEFT', 'UP', 'A', 'W'], () => this.step(-1));
    onKeys(['RIGHT', 'DOWN', 'D', 'S'], () => this.step(1));
    onKeys(['SPACE', 'ENTER'], () => !this.flight && this.enter(this.save.at));
    onKeys(['ESC'], () => this.toMenu());

    this.refresh();
    if (fresh !== null) this.time.delayedCall(REVEAL_DELAY_MS, () => this.reveal(fresh));
    this.cameras.main.fadeIn(250);
  }

  update(time) {
    this.dragon.setPosition(this.pos.x, this.pos.y + Math.sin(time / 260) * 1.5);
    this.accessories.update();
  }

  // --- Building the map ---------------------------------------------------------------------

  addStations() {
    this.stations = [];
    for (let level = 0; level < LEVEL_COUNT; level++) {
      const [x, y] = spotPosition(level);
      const pad = this.add.image(x, y, 'station-locked').setDepth(3);
      const number = this.add
        .text(x, y - 1, String((level % LEVELS_PER_ISLAND) + 1), { ...TEXT, fontSize: '8px', strokeThickness: 2 })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(3);
      const star = this.add.image(x, y - 11, 'map-star').setDepth(4);
      // Bigger than the stone, so it's easy to hit with a finger.
      this.add
        .zone(x, y - 4, 30, 30)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.tapSpot(level));
      this.stations.push({ pad, number, star });
    }
  }

  addShop() {
    this.add
      .image(SHOP.x, SHOP.y, 'shop-house')
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.tapSpot(SHOP_SPOT));
    const sign = this.add
      .text(SHOP.x, SHOP.y - 54, 'Shop', { ...TEXT, fontSize: '9px', color: '#ffe066' })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(7);
    this.tweens.add({ targets: sign, y: sign.y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  // Dotted paths between the stations of each island, and over the water to the next island.
  drawPaths() {
    const g = this.add.graphics().setDepth(1);
    this.bridges = [];
    for (let level = 0; level < LEVEL_COUNT - 1; level++) {
      const dots = this.dotsBetween(spotPosition(level), spotPosition(level + 1));
      if ((level + 1) % LEVELS_PER_ISLAND) {
        for (const [x, y] of dots) {
          g.fillStyle(0x1b1630, 0.3).fillRect(x - 1, y, 2, 2);
          g.fillStyle(0xffffff, 0.9).fillRect(x - 1, y - 1, 2, 2);
        }
      } else {
        // Over the water: only there once the next island is open.
        this.bridges[level + 1] = dots.map(([x, y]) => this.add.rectangle(x, y, 2, 2, 0xffffff).setDepth(1));
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
    this.islandClouds = ISLANDS.map((island) => {
      const cx = island.stations.reduce((sum, [x]) => sum + x, 0) / LEVELS_PER_ISLAND;
      const cy = island.stations.reduce((sum, [, y]) => sum + y, 0) / LEVELS_PER_ISLAND - 6;
      return CLOUD_SPOTS.map(([dx, dy], i) => {
        const cloud = this.add.image(cx + dx, cy + dy, 'map-cloud').setScale(1.1).setDepth(5);
        this.tweens.add({ targets: cloud, x: cloud.x + 3, duration: 1400 + i * 230, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        return cloud;
      });
    });
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

  // Little stars blinking over the star island.
  addTwinkles() {
    const island = ISLANDS.find((i) => i.theme === 'stars');
    for (let i = 0; i < 8; i++) {
      const [x, y] = island.stations[i % LEVELS_PER_ISLAND];
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
    ISLANDS.forEach((_, i) => {
      const open = isOpen(shown, i * LEVELS_PER_ISLAND);
      for (const cloud of this.islandClouds[i]) cloud.setVisible(!open);
      for (const dot of this.bridges[i * LEVELS_PER_ISLAND] ?? []) dot.setVisible(open);
    });

    this.pulse?.stop();
    this.stations.forEach(({ pad }) => pad.setScale(1));
    if (next !== null) {
      this.pulse = this.tweens.add({ targets: this.stations[next].pad, scale: 1.25, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  // --- After a level ------------------------------------------------------------------------

  // `level` was just finished for the first time: star on it, then open what comes next.
  reveal(level) {
    this.shown = { done: this.save.done };
    this.refresh();
    const { star } = this.stations[level];
    star.setScale(0);
    this.tweens.add({ targets: star, scale: 1, duration: 400, ease: 'Back.Out' });

    const next = level + 1;
    if (next === LEVEL_COUNT) {
      play(this, 'win');
      this.sparkle(WIDTH / 2, HEIGHT / 2, 60);
      this.banner('Alle Inseln geschafft!', 'Du bist ein Drachen-Profi!');
    } else if (next % LEVELS_PER_ISLAND === 0) {
      this.openIsland(next / LEVELS_PER_ISLAND);
    } else {
      play(this, 'coin');
      const { pad } = this.stations[next];
      this.sparkle(pad.x, pad.y, 16);
    }
  }

  // A new island: the clouds blow away and dots appear over the water.
  openIsland(index) {
    const island = ISLANDS[index];
    for (const cloud of this.islandClouds[index]) {
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
    this.bridges[index * LEVELS_PER_ISLAND].forEach((dot, i) => {
      dot.setScale(0);
      this.tweens.add({ targets: dot, scale: 1, duration: 200, delay: 300 + i * 60 });
    });
    play(this, 'newdragon');
    const [x, y] = spotPosition(index * LEVELS_PER_ISLAND);
    this.sparkle(x, y, 40);
    this.banner('Neue Insel!', `Flieg zur ${island.name}!`);
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
    if (this.leaving) return;
    if (spot !== SHOP_SPOT && !isOpen(this.save, spot)) return this.locked(spot);
    this.flyTo(spot, true);
  }

  // Arrow keys: fly to the previous or next spot (the shop comes before level 1).
  step(dir) {
    const from = this.target ?? this.save.at;
    const to = from + dir;
    if (to < SHOP_SPOT || to >= LEVEL_COUNT) return;
    if (to !== SHOP_SPOT && !isOpen(this.save, to)) return this.locked(to);
    this.flyTo(to, false);
  }

  // Fly there; with `enter`, go into the level or shop on arrival.
  flyTo(spot, enter) {
    if (spot === this.save.at && !this.flight) {
      if (enter) this.enter(spot);
      return;
    }
    this.flight?.stop();
    const [x, y] = spotPosition(spot);
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
        this.save.at = spot;
        writeSave(this.save);
        if (enter) this.enter(spot);
      },
    });
  }

  enter(spot) {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'start');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      spot === SHOP_SPOT ? this.scene.start('shop') : this.scene.start('game', { level: spot }),
    );
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
    const { pad } = this.stations[level];
    this.tweens.add({ targets: pad, x: pad.x + 2, duration: 50, yoyo: true, repeat: 3 });
    const first = level % LEVELS_PER_ISLAND === 0;
    const text = first
      ? `Schaff zuerst alle Level\nder ${islandOf(level - 1).name}!`
      : `Schaff zuerst Level ${level % LEVELS_PER_ISLAND}!`;
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
