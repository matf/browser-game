import Phaser from 'phaser';
import { WIDTH } from '../view.js';
import { play } from '../sound.js';

const SCALE = 1.5; // size of the fire dragon (1 = as big as the picture)
const HOME_X = 405; // where it hovers, in pixels from the left
const FOLLOW = 0.015; // how quickly it follows your dragon up and down (0 = never, 1 = at once)
const BOB = 6; // how far it bobs up and down, in pixels
const MOUTH = { x: -48, y: -6 }; // where the fireballs come out, from the middle of the fire dragon
const WARN_MS = 500; // its mouth glows this long before it breathes fire, so you can get ready
const SPREAD = 0.32; // with several fireballs: the angle between them (radians; 0.32 is about 18°)
const START_MS = 2500; // after flying in, it waits this long before the first fire breath

// The fire dragon at the end of the game. It hovers on the right and breathes fireballs at your
// dragon; how often and how many is in BOSS_FIGHT in src/levels.js. Every hit with a shot takes
// away some of its health; when none is left, it gives up.
export class FireDragon extends Phaser.Physics.Arcade.Sprite {
  // obstacles: the group the fireballs go into (touching them hurts). target: your dragon.
  // minY/maxY: how far up and down it may go.
  constructor(scene, fight, obstacles, target, minY, maxY) {
    super(scene, WIDTH + 90, (minY + maxY) / 2, 'boss-dragon');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.play('boss-fly').setScale(SCALE).setFlipX(true);
    // Only its body counts, not the wings and tail (the picture is mirrored: it looks left).
    this.body.setSize(36, 24).setOffset(12, 20);
    this.fight = fight;
    this.obstacles = obstacles;
    this.target = target;
    this.minY = minY;
    this.maxY = maxY;
    this.baseY = this.y;
    this.nextBreathAt = START_MS;
    this.gaveUp = false;
    this.balls = [];
    this.maxHealth = fight.health;
    this.health = fight.health;

    scene.tweens.add({ targets: this, x: HOME_X, duration: 1800, ease: 'Sine.Out' });
    // The glow in its mouth before a fire breath.
    this.glow = scene.add.circle(0, 0, 5, 0xffd84a).setVisible(false);
    this.trail = scene.add.particles(0, 0, 'pixel', {
      lifespan: 350,
      speed: { min: 5, max: 25 },
      scale: { start: 1.8, end: 0 },
      tint: [0xff7a2a, 0xffd84a, 0xff4a1a],
      emitting: false,
    });
  }

  setDepth(depth) {
    super.setDepth(depth);
    this.glow?.setDepth(depth + 0.1);
    this.trail?.setDepth(depth - 0.1);
    return this;
  }

  get mouth() {
    return { x: this.x + MOUTH.x, y: this.y + MOUTH.y };
  }

  // Called by the game every frame with the time since the fight started (milliseconds).
  update(elapsed) {
    this.balls = this.balls.filter((ball) => ball.active);
    for (const ball of this.balls) this.trail.emitParticleAt(ball.x, ball.y, 1);
    if (this.gaveUp) return;

    const wantY = Phaser.Math.Clamp(this.target.y, this.minY, this.maxY);
    this.baseY = Phaser.Math.Linear(this.baseY, wantY, FOLLOW);
    this.y = this.baseY + Math.sin(elapsed / 300) * BOB;
    this.glow.setPosition(this.mouth.x, this.mouth.y);

    if (elapsed >= this.nextBreathAt) {
      const phase = this.fight.phases.filter((p) => elapsed >= p.from * 1000).at(-1);
      this.nextBreathAt = elapsed + phase.every;
      this.breathe(phase);
    }
  }

  // The mouth glows, then the fireballs fly toward your dragon.
  breathe(phase) {
    this.glow.setVisible(true).setScale(0.4);
    this.scene.tweens.add({
      targets: this.glow,
      scale: 1.6,
      duration: WARN_MS,
      ease: 'Sine.In',
      onComplete: () => {
        this.glow.setVisible(false);
        if (!this.gaveUp) this.fire(phase);
      },
    });
  }

  fire({ shots, speed }) {
    play(this.scene, 'fireball');
    const { x, y } = this.mouth;
    const aim = Phaser.Math.Angle.Between(x, y, this.target.x, this.target.y);
    for (let i = 0; i < shots; i++) {
      const angle = aim + (i - (shots - 1) / 2) * SPREAD;
      const ball = this.obstacles.create(x, y, 'fireball').setDepth(this.depth);
      ball.pops = true; // goes puff when it hits something, like a raindrop
      ball.body.setCircle(4, 2, 2);
      ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.scene.tweens.add({ targets: ball, angle: 360, duration: 600, repeat: -1 });
      this.balls.push(ball);
    }
  }

  // A shot hit it: it flashes white and loses one health.
  hit() {
    if (this.gaveUp || this.health <= 0) return;
    this.health -= 1;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(80, () => this.clearTint());
    play(this.scene, 'wear');
  }

  // No health left: it stops breathing fire, gets dizzy and flies away.
  giveUp() {
    this.gaveUp = true;
    this.glow.setVisible(false);
    this.obstacles.remove(this);
    this.body.enable = false;
    this.scene.tweens.add({ targets: this, angle: { from: -10, to: 10 }, duration: 150, yoyo: true, repeat: 5 });
    this.scene.tweens.add({
      targets: this,
      x: WIDTH + 140,
      y: -60,
      delay: 1400,
      duration: 1800,
      ease: 'Sine.In',
      onComplete: () => this.setVisible(false),
    });
  }

  destroy(fromScene) {
    this.glow?.destroy();
    this.trail?.destroy();
    super.destroy(fromScene);
  }
}
