import Phaser from 'phaser';
import { Accessories } from '../objects/Accessories.js';
import { loadSave } from '../save.js';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play } from '../sound.js';
import { addButton } from './MenuPage.js';

const ROCKET_EVERY = [350, 750]; // a new rocket after this many milliseconds (shortest, longest)
const ROCKET_RISE_MS = [700, 1100]; // how long a rocket flies up before it bursts
const SPARKS = 70; // sparks in one burst
const BUTTON_AFTER_MS = 4000; // the "Zur Weltkarte" button shows up after this long
const COLORS = [0xff5f9f, 0xffd84a, 0x5fe3ff, 0x9ff0a8, 0xc9a7ff, 0xff8a2a, 0xffffff];

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 4 };

// The end of the game: the fire dragon is gone, and the sky is full of fireworks.
export class FinaleScene extends Phaser.Scene {
  constructor() {
    super('finale');
  }

  create() {
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

    // Your dragon, happily flying in the middle.
    this.dragon = this.add.sprite(WIDTH / 2, 170, 'dragons').play(`${this.save.dragon}-fly`).setDepth(5);
    this.accessories = new Accessories(this, this.dragon, this.save.wear);

    const title = this.add
      .text(WIDTH / 2, 46, 'Hurra! Du hast es geschafft!', { ...TEXT, fontSize: '26px', color: '#ffe066', strokeThickness: 6 })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(10)
      .setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 700, ease: 'Back.Out', delay: 300 });
    this.tweens.add({ targets: title, angle: { from: -2, to: 2 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const subtitle = this.add
      .text(WIDTH / 2, 80, 'Alle Inseln gerettet, der Feuerdrache ist weg.\nDanke fürs Spielen!', {
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
    this.time.delayedCall(BUTTON_AFTER_MS, () => this.showButton());
    this.cameras.main.fadeIn(600);
  }

  update(time) {
    this.dragon.y = 170 + Math.sin(time / 350) * 6;
    this.accessories.update();
  }

  // A rocket flies up with a little trail and bursts into colourful sparks. Then the next one.
  launchRocket() {
    const x = Phaser.Math.Between(40, WIDTH - 40);
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
      y: Phaser.Math.Between(40, 130),
      duration: Phaser.Math.Between(...ROCKET_RISE_MS),
      ease: 'Quad.Out',
      onComplete: () => {
        this.burst(rocket.x, rocket.y);
        rocket.destroy();
        trail.stop();
        this.time.delayedCall(400, () => trail.destroy());
      },
    });
    this.time.delayedCall(Phaser.Math.Between(...ROCKET_EVERY), () => this.launchRocket());
  }

  burst(x, y) {
    play(this, 'firework');
    const color = Phaser.Utils.Array.GetRandom(COLORS);
    const second = Phaser.Utils.Array.GetRandom(COLORS);
    const sparks = this.add
      .particles(0, 0, 'pixel', {
        lifespan: { min: 900, max: 1500 },
        speed: { min: 20, max: 110 },
        gravityY: 45,
        scale: { start: 1.8, end: 0 },
        alpha: { start: 1, end: 0.2 },
        tint: [color, color, second],
        emitting: false,
      })
      .setDepth(4);
    sparks.explode(SPARKS, x, y);
    this.time.delayedCall(1600, () => sparks.destroy());
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
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', {}));
  }
}
