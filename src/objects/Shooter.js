import Phaser from 'phaser';
import { HEIGHT, WIDTH } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { play } from '../sound.js';

export const ENERGY_MAX = 100; // a full energy bar
const SHOTS_IN_FULL_BAR = 8; // how many shots a full energy bar is good for
const SHOT_COST = ENERGY_MAX / SHOTS_IN_FULL_BAR; // energy for one shot
const ENERGY_REFILL = 18; // energy that comes back every second
const SHOT_GAP_MS = 220; // at least this long between two shots, even when holding the button
const SHOT_SPEED = 280; // how fast a shot flies, in pixels per second
const SHOT_SIZE = 6; // how big a shot is when it hits something (radius in pixels; a bit bigger than the picture)
const MOUTH = { x: 23, y: -5 }; // where shots come out, from the middle of the dragon
export const SHOOT_HOME = { x: 402, y: 176 }; // the shoot button on phones (bottom right)
const BUTTON_RADIUS = 36; // size of the shoot button
const BUTTON_ICON_SCALE = 1.3; // size of the shot picture on the button (bigger looks blocky)

// What each dragon spits. texture/frame: the picture, scale: its size, spin: how fast it turns
// (degrees per second), colors: the little trail behind it and the puff when it hits something.
export const SHOTS = {
  marshmallow: { name: 'Marshmallows', texture: 'food', frame: 3, scale: 0.75, spin: 360, colors: [0xffffff, 0xffd1e6, 0xff9fc8] },
  chili: { name: 'Feuer', texture: 'shot-fire', scale: 1.3, spin: 0, colors: [0xff4a1a, 0xff9a2a, 0xffd84a] },
  blubb: { name: 'Wasser', texture: 'shot-water', scale: 1.3, spin: 0, colors: [0x3da5ff, 0x8fd3f4, 0xffffff] },
  wolke: { name: 'Blitze', texture: 'shot-bolt', scale: 1.3, spin: 0, colors: [0xffe066, 0xffffff, 0xfff3b0] },
  kiesel: { name: 'Blumen', texture: 'shot-flower', scale: 1.3, spin: 200, colors: [0xff9fc8, 0xffe066, 0x9ff0a8] },
};

// Lets your dragon spit things at bees, raindrops and fireballs. Every shot uses some energy from
// the bar; the bar slowly fills up again by itself. Space shoots; on phones, the button on the right.
export class Shooter {
  // group: the physics group the shots go into (the game checks what they hit).
  constructor(scene, dragon, dragonKey, group) {
    this.scene = scene;
    this.dragon = dragon;
    this.group = group;
    this.shot = SHOTS[dragonKey] ?? SHOTS.marshmallow;
    this.energy = ENERGY_MAX;
    this.lastShotAt = -Infinity;
    this.tiredAt = -Infinity; // when you last tried to shoot with too little energy (the bar blinks)
    this.enabled = true;

    this.trail = scene.add.particles(0, 0, 'pixel', {
      lifespan: 250,
      speed: { min: 5, max: 20 },
      scale: { start: 1.3, end: 0 },
      tint: this.shot.colors,
      emitting: false,
    }).setDepth(2.9);
    this.puff = scene.add.particles(0, 0, 'pixel', {
      lifespan: 350,
      speed: { min: 30, max: 90 },
      scale: { start: 1.5, end: 0 },
      tint: this.shot.colors,
      emitting: false,
    }).setDepth(4);

    this.key = scene.input.keyboard.addKey('SPACE');
    // A quick tap (the key event never misses it), and holding it down in update().
    scene.input.keyboard.on('keydown-SPACE', () => this.shoot());
    if (IS_TOUCH) this.addButton();
  }

  // True while there is enough energy for a shot.
  get ready() {
    return this.energy >= SHOT_COST;
  }

  update(time, delta) {
    this.energy = Math.min(ENERGY_MAX, this.energy + (ENERGY_REFILL * delta) / 1000);
    if (this.key.isDown || this.touchId != null) this.shoot();
    for (const shot of this.group.getChildren()) this.trail.emitParticleAt(shot.x - 3, shot.y, 1);
    for (const shot of this.group.getChildren().slice()) if (shot.x > WIDTH + 20) shot.destroy();
    if (this.button) this.button.setAlpha(this.ready ? 1 : 0.45);
  }

  shoot() {
    const now = this.scene.time.now;
    if (!this.enabled || now - this.lastShotAt < SHOT_GAP_MS) return;
    this.lastShotAt = now;
    if (!this.ready) {
      this.tiredAt = now;
      return;
    }
    this.energy -= SHOT_COST;
    const d = this.dragon;
    // The mouth moves a little when the dragon tips up or down.
    const cos = Math.cos(d.rotation);
    const sin = Math.sin(d.rotation);
    const x = d.x + MOUTH.x * cos - MOUTH.y * sin;
    const y = d.y + MOUTH.x * sin + MOUTH.y * cos;
    const shot = this.group.create(x, y, this.shot.texture, this.shot.frame).setScale(this.shot.scale).setDepth(3);
    const r = SHOT_SIZE / this.shot.scale; // the body grows with the picture's scale, so undo that
    shot.body.setCircle(r, shot.width / 2 - r, shot.height / 2 - r);
    shot.body.setVelocity(SHOT_SPEED * cos, SHOT_SPEED * sin);
    shot.body.setAngularVelocity(this.shot.spin);
    play(this.scene, 'spit');
  }

  // The shot hit something: it goes puff.
  pop(shot) {
    this.puff.explode(8, shot.x, shot.y);
    shot.destroy();
  }

  // The shoot button for phones, bottom right, looking like the joystick on the left. A thumb
  // anywhere on the right half (below the buttons at the top) presses it; holding keeps shooting.
  addButton() {
    const { x, y } = SHOOT_HOME;
    const ring = this.scene.add.circle(0, 0, BUTTON_RADIUS, 0xffffff, 0.15).setStrokeStyle(3, 0xffffff, 0.6);
    const icon = this.scene.add.image(0, 0, this.shot.texture, this.shot.frame).setScale(this.shot.scale * BUTTON_ICON_SCALE);
    this.button = this.scene.add.container(x, y, [ring, icon]).setDepth(20).setScrollFactor(0);
    this.touchId = null;

    const page = document.getElementById('game');
    const toGame = (touch) => {
      const r = this.scene.game.canvas.getBoundingClientRect();
      return { x: ((touch.clientX - r.left) / r.width) * WIDTH, y: ((touch.clientY - r.top) / r.height) * HEIGHT };
    };
    const handlers = {
      touchstart: (e) => {
        if (this.touchId !== null || !this.scene.sys.isActive()) return;
        for (const touch of e.changedTouches) {
          const p = toGame(touch);
          if (p.x <= WIDTH / 2 || p.y < 40) continue;
          this.touchId = touch.identifier;
          this.button.setScale(0.88);
          this.shoot();
          return;
        }
      },
      touchend: (e) => this.release(e),
      touchcancel: (e) => this.release(e),
    };
    for (const [type, fn] of Object.entries(handlers)) page.addEventListener(type, fn);
    this.scene.events.once('shutdown', () => {
      for (const [type, fn] of Object.entries(handlers)) page.removeEventListener(type, fn);
    });
  }

  release(e) {
    if (![...e.changedTouches].some((t) => t.identifier === this.touchId)) return;
    this.touchId = null;
    this.button.setScale(1);
  }
}
