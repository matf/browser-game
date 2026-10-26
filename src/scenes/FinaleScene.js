import Phaser from 'phaser';
import { Accessories } from '../objects/Accessories.js';
import { loadSave } from '../save.js';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play } from '../sound.js';
import { addButton } from './MenuPage.js';
import { BOSSES, nameInSentence } from '../objects/Boss.js';
import { SHOTS } from '../objects/Shooter.js';
import { DRAGONS } from './PreloadScene.js';
import { LEVELS } from '../levels.js';
import { WORLDS, worldOf } from '../world.js';
import { dragonLook, showDragon } from '../dragons.js';
import { GROWN_SCALE } from '../hatchery.js';

const ROCKET_EVERY = [350, 750]; // a new rocket after this many milliseconds (shortest, longest)
const ROCKET_EVERY_AT_THE_END = [220, 500]; // the same after the very last boss: even more rockets
const ROCKET_RISE_MS = [700, 1100]; // how long a rocket flies up before it bursts
const BIG_SHOW_EVERY_MS = 7000; // after the very last boss: this often lots of rockets at once
const BIG_SHOW_ROCKETS = 6; // how many rockets go up together then
const SPARKS = 70; // sparks in one burst
const BURST_SIZE = [45, 68]; // how big a burst gets (radius in pixels, smallest, biggest)
const SPIT_EVERY = [1800, 4000]; // the dragons spit a firework this often (milliseconds)
const PARADE_SCALE = 0.6; // size of the dragons flying around after the very last boss
const PARADE_SPEED = [45, 85]; // how fast they fly, in pixels per second
const LOOP_CHANCE = 0.25; // how often a dragon flies a loop-the-loop when it comes back
const BUTTON_AFTER_MS = 4000; // the "Zur Weltkarte" button shows up after this long
const COLORS = [0xff5f9f, 0xffd84a, 0x5fe3ff, 0x9ff0a8, 0xc9a7ff, 0xff8a2a, 0xffffff];
// Kinds of bursts: ball (round), ring, heart, star, smiley, double (two rings), willow (golden,
// drooping down slowly), crackle (each spark crackles at the end).
const BURSTS = ['ball', 'ball', 'ring', 'heart', 'star', 'smiley', 'double', 'willow', 'crackle'];

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 4 };

// After a boss: it is gone, and the sky is full of fireworks. After the very last boss, the game
// ends: then all the dragons fly around too.
export class FinaleScene extends Phaser.Scene {
  constructor() {
    super('finale');
  }

  // data.level: the boss level that was won. data.firstWin: passed on to the map, so it shows what opened.
  create(data) {
    this.mapData = data?.firstWin !== undefined ? { firstWin: data.firstWin } : {};
    const level = data?.level ?? WORLDS[0].bossLevel;
    const world = WORLDS[worldOf(level)];
    this.last = world === WORLDS.at(-1);
    const bossName = BOSSES[LEVELS[level].boss].name;
    setupCamera(this);
    this.save = loadSave();
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#1b1640');
    for (let i = 0; i < 50; i++) {
      const star = this.add
        .image(Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(0, HEIGHT - 60), 'pixel')
        .setTint(0xfff3b0)
        .setAlpha(Phaser.Math.FloatBetween(0.2, 0.8));
      this.tweens.add({ targets: star, alpha: 0.1, duration: Phaser.Math.Between(600, 1400), yoyo: true, repeat: -1 });
    }
    this.add.tileSprite(0, HEIGHT - 30, WIDTH, 48, 'hills-stars').setOrigin(0, 1);
    this.add.tileSprite(0, HEIGHT, WIDTH, 54, 'ground-stars').setOrigin(0, 1).setDepth(2);

    // All sparks are drawn on one picture that is redrawn every frame. (Not with the glowing ADD
    // blend mode: with it, the title sometimes got cut off.)
    this.sparks = [];
    this.sky = this.add.graphics().setDepth(4);

    // Your dragon, happily flying in the middle.
    const look = dragonLook(this.save);
    this.dragon = showDragon(this.add.sprite(WIDTH / 2, 170, 'dragons'), look).setDepth(7);
    this.dragon.shot = look.shot;
    this.accessories = new Accessories(this, this.dragon, this.save.wear);
    this.flyers = this.last ? this.addParade(look.key) : [];
    this.time.delayedCall(Phaser.Math.Between(...SPIT_EVERY), () => this.spitNext());

    const title = this.add
      .text(WIDTH / 2, 46, 'Hurra! Du hast es geschafft!', { ...TEXT, fontSize: '26px', color: '#ffe066', strokeThickness: 6 })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(10)
      .setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 700, ease: 'Back.Out', delay: 300 });
    this.tweens.add({ targets: title, angle: { from: -2, to: 2 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const subtitle = this.add
      .text(WIDTH / 2, 80, this.last ? `Alle Inseln gerettet, ${nameInSentence(LEVELS[level].boss)} ist weg.\nDanke fürs Spielen!` : `${bossName} ist weg!\n${world.boss.gateHint}`, {
        ...TEXT,
        fontSize: '12px',
        align: 'center',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(10)
      .setAlpha(0);
    this.tweens.add({ targets: subtitle, alpha: 1, delay: 1500, duration: 800 });

    addMuteButton(this, 466, 14);
    play(this, 'win');
    this.launchRocket();
    if (this.last) this.time.addEvent({ delay: BIG_SHOW_EVERY_MS, loop: true, callback: () => this.bigShow() });
    this.time.delayedCall(BUTTON_AFTER_MS, () => this.showButton());
    this.cameras.main.fadeIn(600);
  }

  update(time, delta) {
    this.dragon.y = 170 + Math.sin(time / 350) * 6;
    this.accessories.update();
    for (const flyer of this.flyers) this.fly(flyer, delta / 1000);
    this.updateSparks(delta / 1000);
  }

  // --- Dragons ------------------------------------------------------------------------------

  // All the dragons from the shop and the ones that hatched on the Brutinsel, flying back and forth.
  addParade(yours) {
    const looks = [
      ...DRAGONS.map((dragon) => dragonLook(this.save, dragon.key)),
      ...this.save.hatchlings.map((h) => dragonLook(this.save, `hatchling-${h.id}`)),
    ].filter((look) => look.key !== yours);
    return Phaser.Utils.Array.Shuffle(looks).map((look, i) => {
      const dir = i % 2 ? -1 : 1;
      const size = look.scale ? look.scale / GROWN_SCALE : 1; // babies are smaller
      const sprite = showDragon(this.add.sprite(0, 0, 'dragons'), look).setScale(PARADE_SCALE * size).setDepth(6);
      sprite.shot = look.shot;
      const flyer = { sprite, loop: null };
      this.turnAround(flyer, dir);
      // Start one after the other, further and further out.
      sprite.x = dir > 0 ? -40 - i * 45 : WIDTH + 40 + i * 45;
      return flyer;
    });
  }

  // A dragon flies across (with a wave up and down) and turns around off the screen.
  fly(flyer, dt) {
    const { sprite } = flyer;
    if (flyer.loop) {
      // Loop-the-loop: once round a circle, nose first.
      const loop = flyer.loop;
      loop.turn += dt * Math.PI * 1.6;
      if (loop.turn >= Math.PI * 2) {
        flyer.loop = null;
        sprite.angle = 0;
        flyer.base = sprite.y - Math.sin(flyer.phase) * flyer.wave;
        return;
      }
      sprite.x = loop.x + flyer.dir * loop.radius * Math.sin(loop.turn);
      sprite.y = loop.y - loop.radius + loop.radius * Math.cos(loop.turn);
      sprite.angle = (-flyer.dir * loop.turn * 180) / Math.PI;
      return;
    }
    sprite.x += flyer.dir * flyer.speed * dt;
    flyer.phase += dt * 2;
    sprite.y = flyer.base + Math.sin(flyer.phase) * flyer.wave;
    if (flyer.wantsLoop && Math.abs(sprite.x - flyer.wantsLoop) < 2) {
      flyer.wantsLoop = null;
      flyer.loop = { x: sprite.x, y: sprite.y, radius: 26, turn: 0 };
    }
    if ((flyer.dir > 0 && sprite.x > WIDTH + 50) || (flyer.dir < 0 && sprite.x < -50)) this.turnAround(flyer, -flyer.dir);
  }

  turnAround(flyer, dir) {
    flyer.dir = dir;
    flyer.speed = Phaser.Math.Between(...PARADE_SPEED);
    flyer.base = Phaser.Math.Between(118, 205);
    flyer.wave = Phaser.Math.Between(4, 14);
    flyer.phase = Math.random() * Math.PI * 2;
    flyer.wantsLoop = Math.random() < LOOP_CHANCE ? Phaser.Math.Between(80, WIDTH - 80) : null;
    flyer.sprite.setFlipX(dir < 0);
  }

  // Now and then a dragon on the screen spits what it spits up into the sky, and it bursts into a
  // little firework in its colours.
  spitNext() {
    const dragons = [this.dragon, ...this.flyers.filter((f) => !f.loop && f.sprite.x > 30 && f.sprite.x < WIDTH - 30).map((f) => f.sprite)];
    this.spit(Phaser.Utils.Array.GetRandom(dragons));
    this.time.delayedCall(Phaser.Math.Between(...SPIT_EVERY) / (this.last ? 2 : 1), () => this.spitNext());
  }

  spit(dragon) {
    const shot = SHOTS[dragon.shot] ?? SHOTS.marshmallow;
    const dir = dragon.flipX ? -1 : 1;
    const size = dragon.scaleX;
    const ball = this.add
      .image(dragon.x + dir * 22 * size, dragon.y - 5 * size, shot.texture, shot.frame)
      .setScale(shot.scale)
      .setDepth(8);
    play(this, 'spit');
    this.tweens.add({
      targets: ball,
      x: ball.x + dir * Phaser.Math.Between(30, 70),
      y: Phaser.Math.Between(40, 110),
      angle: (shot.spin * 700) / 1000,
      duration: 700,
      ease: 'Quad.Out',
      onComplete: () => {
        this.burst(ball.x, ball.y, Phaser.Utils.Array.GetRandom(['ball', 'ring', 'heart', 'star']), shot.colors, 0.55);
        ball.destroy();
      },
    });
  }

  // --- Fireworks ----------------------------------------------------------------------------

  // A rocket flies up with a little trail and bursts. Then the next one.
  launchRocket() {
    this.rocket(Phaser.Math.Between(40, WIDTH - 40));
    this.time.delayedCall(Phaser.Math.Between(...(this.last ? ROCKET_EVERY_AT_THE_END : ROCKET_EVERY)), () => this.launchRocket());
  }

  rocket(x, kind = Phaser.Utils.Array.GetRandom(BURSTS)) {
    const rocket = this.add.image(x, HEIGHT - 20, 'pixel').setScale(1.5).setDepth(3);
    const trail = this.add
      .particles(0, 0, 'pixel', {
        follow: rocket,
        lifespan: 300,
        speedY: { min: 10, max: 30 },
        speedX: { min: -8, max: 8 },
        scale: { start: 1, end: 0 },
        tint: [0xffd84a, 0xffffff],
        frequency: 20,
      })
      .setDepth(3);
    this.tweens.add({
      targets: rocket,
      x: x + Phaser.Math.Between(-30, 30),
      y: Phaser.Math.Between(45, 125),
      duration: Phaser.Math.Between(...ROCKET_RISE_MS),
      ease: 'Quad.Out',
      onComplete: () => {
        const color = Phaser.Utils.Array.GetRandom(COLORS);
        this.burst(rocket.x, rocket.y, kind, [color, color, Phaser.Utils.Array.GetRandom(COLORS)]);
        rocket.destroy();
        trail.stop();
        this.time.delayedCall(400, () => trail.destroy());
      },
    });
  }

  // Lots of rockets at once, side by side, all the same kind.
  bigShow() {
    const kind = Phaser.Utils.Array.GetRandom(BURSTS);
    for (let i = 0; i < BIG_SHOW_ROCKETS; i++) {
      const x = ((i + 0.5) * WIDTH) / BIG_SHOW_ROCKETS;
      this.time.delayedCall(i * 120, () => this.rocket(x, kind));
    }
  }

  // Where the sparks of a burst fly to, as points around (0, 0) about 1 apart: the shape it makes.
  shape(kind) {
    const round = (n, r = 1) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r]);
    if (kind === 'ring') return round(SPARKS / 2);
    if (kind === 'double') return [...round(SPARKS / 2), ...round(SPARKS / 4, 0.5)];
    if (kind === 'heart') {
      return Array.from({ length: SPARKS / 2 }, (_, i) => {
        const t = (i / (SPARKS / 2)) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return [x / 16, -y / 16];
      });
    }
    if (kind === 'star') {
      const corners = Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? 0.42 : 1;
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
      const points = [];
      corners.forEach(([x, y], i) => {
        const [nx, ny] = corners[(i + 1) % 10];
        for (let k = 0; k < 4; k++) points.push([x + ((nx - x) * k) / 4, y + ((ny - y) * k) / 4]);
      });
      return points;
    }
    if (kind === 'smiley') {
      const mouth = Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * (0.15 + (i / 8) * 0.7);
        return [Math.cos(a) * 0.55, Math.sin(a) * 0.55];
      });
      const eye = (x) => [[x, -0.35], [x, -0.25], [x + 0.06, -0.3], [x - 0.06, -0.3]];
      return [...round(SPARKS / 2), ...mouth, ...eye(-0.33), ...eye(0.33)];
    }
    // A full ball: random directions, more sparks further out so it looks evenly filled.
    return Array.from({ length: SPARKS }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * Phaser.Math.FloatBetween(0.85, 1);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
  }

  // A burst of sparks in the shape `kind`. size: 1 = normal, smaller for the dragons' spit fireworks.
  burst(x, y, kind, colors, size = 1) {
    play(this, 'firework');
    const willow = kind === 'willow';
    const radius = Phaser.Math.Between(...BURST_SIZE) * size;
    const drag = willow ? 1.3 : 2.4; // how quickly sparks slow down
    const speed = radius * drag; // so the shape gets about `radius` big before it slows down
    const life = willow ? 2600 : Phaser.Math.Between(1300, 1700);
    const gold = [0xffd84a, 0xffb13b, 0xfff3b0];
    for (const [px, py] of this.shape(kind)) {
      this.sparks.push({
        x,
        y,
        vx: px * speed,
        vy: py * speed,
        color: Phaser.Utils.Array.GetRandom(willow ? gold : colors),
        age: 0,
        life: life * Phaser.Math.FloatBetween(0.85, 1.1),
        drag,
        gravity: willow ? 34 : 22,
        tail: willow ? 9 : 4,
        trail: [],
        crackle: kind === 'crackle',
        glitter: kind === 'crackle' || Math.random() < 0.3,
      });
    }
    // A soft glow where it bursts.
    const glow = this.add.circle(x, y, radius * 0.25, colors[0], 0.25).setDepth(3);
    this.tweens.add({ targets: glow, scale: 2, alpha: 0, duration: 300, onComplete: () => glow.destroy() });
  }

  // Move every spark (slowing down, falling a little) and draw it with a fading tail.
  updateSparks(dt) {
    const g = this.sky.clear();
    const crackles = [];
    this.sparks = this.sparks.filter((s) => {
      s.age += dt * 1000;
      if (s.age >= s.life) {
        if (s.crackle) crackles.push(s);
        return false;
      }
      s.trail.push(s.x, s.y);
      if (s.trail.length > s.tail * 2) s.trail.splice(0, 2);
      const slow = Math.exp(-s.drag * dt);
      s.vx *= slow;
      s.vy = s.vy * slow + s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const fade = 1 - s.age / s.life;
      for (let i = 0; i < s.trail.length; i += 2) {
        g.fillStyle(s.color, fade * 0.5 * ((i + 2) / s.trail.length));
        g.fillRect(Math.round(s.trail[i]), Math.round(s.trail[i + 1]), 1, 1);
      }
      if (s.glitter && Math.random() < 0.35) return true; // glittering sparks blink
      const young = s.age < 150;
      g.fillStyle(young ? 0xffffff : s.color, Math.min(1, fade * 1.5));
      const size = young || fade > 0.45 ? 2 : 1;
      g.fillRect(Math.round(s.x - (size - 1) / 2), Math.round(s.y - (size - 1) / 2), size, size);
      return true;
    });
    // Crackling sparks end in a tiny white flash.
    for (const s of crackles) {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.sparks.push({
          x: s.x, y: s.y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, color: 0xffffff,
          age: 0, life: 250, drag: 4, gravity: 0, tail: 1, trail: [], crackle: false, glitter: false,
        });
      }
    }
  }

  showButton() {
    const button = addButton(this, WIDTH / 2, 236, 'Zur Weltkarte  ▶', () => this.toMap(), {
      width: 150,
      height: 26,
      color: 0x5fd068,
      dark: true,
    }).setDepth(10);
    this.tweens.add({ targets: button, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (!IS_TOUCH) {
      this.add.text(WIDTH - 8, 262, 'Enter: zur Karte', { ...TEXT, fontSize: '9px', strokeThickness: 3 }).setOrigin(1, 0.5).setResolution(4).setDepth(10);
    }
    for (const key of ['ENTER', 'SPACE', 'ESC']) this.input.keyboard.on(`keydown-${key}`, () => this.toMap());
  }

  toMap() {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'click');
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', this.mapData));
  }
}
