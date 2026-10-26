import Phaser from 'phaser';
import { WIDTH } from '../view.js';
import { play } from '../sound.js';

const HOME_X = 405; // where a boss hovers, in pixels from the left
const FOLLOW = 0.015; // how quickly it follows your dragon up and down (0 = never, 1 = at once)
const BOB = 14; // how far it bobs up and down, in pixels
const ROAM = 45; // on top of that, it slowly floats this far up and down by itself (pixels)
const ROAM_MS = 2600; // how long one float up and down takes
const WARN_MS = 500; // its mouth glows this long before it attacks, so you can get ready
const SPREAD = 0.32; // with several shots: the angle between them (radians; 0.32 is about 18°)
const START_MS = 2500; // after flying in, it waits this long before the first attack
const LOB_GRAVITY = 260; // how strongly thrown blobs fall back down (pixels per second, per second)
const STRIKE_WARN_MS = 800; // a lightning strike blinks this long where it will hit
const STRIKE_MS = 260; // how long a lightning strike stays
const STRIKE_GAP = 80; // with several strikes: the distance between them (pixels)
const CHASE_MS = 3200; // little ghosts follow you this long, then they float away
const CHASE_TURN = 2.2; // how quickly little ghosts turn toward you

// What each boss looks like. texture: its picture (frame: the size of one of its 3 frames,
// flaps: frames per second), scale: its size, flipX: mirror it so it looks left, body: the part that
// counts for hits [width, height, x, y] (in the picture's own pixels), mouth: where its attacks come
// from (from its middle), glow: the colour of the warning glow, trail: colours behind its shots,
// shot: the picture of its shots, icon: the frame shown next to the health bar.
export const BOSSES = {
  fire: {
    name: 'Der Feuerdrache',
    texture: 'boss-dragon',
    frame: [67, 52],
    flaps: 7,
    scale: 1.5,
    flipX: true,
    body: [36, 24, 12, 20],
    mouth: { x: -48, y: -6 },
    glow: 0xffd84a,
    trail: [0xff7a2a, 0xffd84a, 0xff4a1a],
    shot: 'fireball',
    giveUp: 'Uff! Du bist zu stark\nfür mich!',
  },
  octopus: {
    name: 'Die Riesenkrake Tinti',
    texture: 'boss-octopus',
    frame: [66, 58],
    flaps: 5,
    scale: 1.4,
    body: [48, 32, 9, 4],
    mouth: { x: -11, y: 7 },
    glow: 0xc9a7ff,
    trail: [0x3a2560, 0x7a5ab0, 0xc9a7ff],
    shot: 'drop-deep',
    giveUp: 'Blubb! Du bist zu stark\nfür mich!',
  },
  storm: {
    name: 'Der Gewitterdrache',
    texture: 'boss-storm',
    frame: [67, 52],
    flaps: 8,
    scale: 1.5,
    flipX: true,
    body: [36, 24, 12, 20],
    mouth: { x: -48, y: -6 },
    glow: 0xffe066,
    trail: [0xffe066, 0xffffff, 0x9aa6d0],
    shot: 'drop-storm',
    giveUp: 'Grrr! Du bist zu stark\nfür mich!',
  },
  ghost: {
    name: 'Das Gespenst Buhu',
    texture: 'boss-ghost',
    frame: [62, 58],
    flaps: 4,
    scale: 1.4,
    body: [40, 40, 12, 8],
    mouth: { x: -8, y: 3 },
    glow: 0x9fffd0,
    trail: [0xf4f0ff, 0xc9bfe8, 0x9fffd0],
    shot: 'drop-ghost',
    giveUp: 'Buhuuu! Du bist zu stark\nfür mich!',
  },
};

// A boss's name inside a sentence: "der Feuerdrache" instead of "Der Feuerdrache".
export function nameInSentence(kind) {
  return BOSSES[kind].name.replace(/^\S+/, (word) => word.toLowerCase());
}

// The big enemy at the end of an island group. It hovers on the right, follows your dragon up and
// down and attacks; how is in its fight in src/levels.js (phases with attack, every, shots, speed).
// Every hit with a shot takes away one health; when none is left, it gives up and flies away.
//   aim:    shots fly straight at your dragon (fanned out when there are several)
//   lob:    blobs are thrown in a high arc and come down where your dragon is
//   strike: lightning blinks where your dragon is, then strikes from top to bottom
//   chase:  little ghosts follow your dragon for a while
// `attack` can also be a list, like ['aim', 'strike']: then the boss takes turns.
export class Boss extends Phaser.Physics.Arcade.Sprite {
  // kind: a key of BOSSES. obstacles: the group its shots go into (touching them hurts).
  // target: your dragon. minY/maxY: how far up and down it may go. groundY: where the ground is.
  constructor(scene, kind, fight, obstacles, target, minY, maxY, groundY) {
    const look = BOSSES[kind];
    super(scene, WIDTH + 90, (minY + maxY) / 2, look.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.look = look;
    this.play(`${look.texture}-fly`).setScale(look.scale).setFlipX(Boolean(look.flipX));
    const [w, h, ox, oy] = look.body;
    this.body.setSize(w, h).setOffset(ox, oy);
    this.fight = fight;
    this.obstacles = obstacles;
    this.target = target;
    this.minY = minY;
    this.maxY = maxY;
    this.groundY = groundY;
    this.baseY = this.y;
    this.nextAttackAt = START_MS;
    this.attacks = 0; // how many attacks so far (for taking turns)
    this.gaveUp = false;
    this.shots = [];
    this.maxHealth = fight.health;
    this.health = fight.health;

    scene.tweens.add({ targets: this, x: HOME_X, duration: 1800, ease: 'Sine.Out' });
    // The glow in its mouth before an attack.
    this.glow = scene.add.circle(0, 0, 5, look.glow).setVisible(false);
    this.trail = scene.add.particles(0, 0, 'pixel', {
      lifespan: 350,
      speed: { min: 5, max: 25 },
      scale: { start: 1.8, end: 0 },
      tint: look.trail,
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
    const { x, y } = this.look.mouth;
    return { x: this.x + x, y: this.y + y };
  }

  // Called by the game every frame with the time since the fight started (milliseconds).
  update(elapsed, delta) {
    this.shots = this.shots.filter((shot) => shot.active);
    for (const shot of this.shots) {
      if (shot.chaseUntil) this.chase(shot, elapsed, delta);
      if (!shot.strike) this.trail.emitParticleAt(shot.x, shot.y, 1);
    }
    if (this.gaveUp) return;

    const wantY = Phaser.Math.Clamp(this.target.y, this.minY, this.maxY);
    this.baseY = Phaser.Math.Linear(this.baseY, wantY, FOLLOW);
    const roam = Math.sin((elapsed / ROAM_MS) * Math.PI * 2) * ROAM;
    this.y = Phaser.Math.Clamp(this.baseY + roam, this.minY, this.maxY) + Math.sin(elapsed / 300) * BOB;
    this.glow.setPosition(this.mouth.x, this.mouth.y);

    if (elapsed >= this.nextAttackAt) {
      const phase = this.fight.phases.filter((p) => elapsed >= p.from * 1000).at(-1);
      this.nextAttackAt = elapsed + phase.every;
      this.warn(phase);
    }
  }

  // The mouth glows, then it attacks.
  warn(phase) {
    this.glow.setVisible(true).setScale(0.4);
    this.scene.tweens.add({
      targets: this.glow,
      scale: 1.6,
      duration: WARN_MS,
      ease: 'Sine.In',
      onComplete: () => {
        this.glow.setVisible(false);
        if (this.gaveUp) return;
        const kinds = [].concat(phase.attack ?? 'aim');
        const attack = kinds[this.attacks++ % kinds.length];
        if (attack === 'aim') this.aim(phase);
        else if (attack === 'lob') this.lob(phase);
        else if (attack === 'strike') this.strike(phase);
        else if (attack === 'chase') this.ghosts(phase);
      },
    });
  }

  // One shot that goes puff when it hits something, like a raindrop.
  addShot(x, y, vx, vy) {
    const shot = this.obstacles.create(x, y, this.look.shot).setDepth(this.depth);
    shot.pops = true;
    shot.body.setCircle(4, shot.width / 2 - 4, shot.height / 2 - 4);
    shot.body.setVelocity(vx, vy);
    this.shots.push(shot);
    return shot;
  }

  aim({ shots, speed }) {
    play(this.scene, 'fireball');
    const { x, y } = this.mouth;
    const aim = Phaser.Math.Angle.Between(x, y, this.target.x, this.target.y);
    for (let i = 0; i < shots; i++) {
      const angle = aim + (i - (shots - 1) / 2) * SPREAD;
      const shot = this.addShot(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.scene.tweens.add({ targets: shot, angle: 360, duration: 600, repeat: -1 });
    }
  }

  // Thrown high, landing around your dragon: speed is how fast they fly to the left.
  lob({ shots, speed }) {
    play(this.scene, 'fireball');
    const { x, y } = this.mouth;
    for (let i = 0; i < shots; i++) {
      const landX = this.target.x + (i - (shots - 1) / 2) * 50;
      const time = Math.max(0.6, (x - landX) / speed);
      const vy = (this.target.y - y - 0.5 * LOB_GRAVITY * time * time) / time;
      const shot = this.addShot(x, y, -speed, vy);
      shot.body.setAccelerationY(LOB_GRAVITY);
      this.scene.tweens.add({ targets: shot, angle: -360, duration: 900, repeat: -1 });
    }
  }

  // Lightning: a blinking line shows where it will hit, then it strikes from the top to the ground.
  strike({ shots }) {
    for (let i = 0; i < shots; i++) {
      const x = Phaser.Math.Clamp(this.target.x + (i - (shots - 1) / 2) * STRIKE_GAP, 20, HOME_X - 60);
      const line = this.scene.add.rectangle(x, 0, 2, this.groundY, 0xfff3b0, 0.8).setOrigin(0.5, 0).setDepth(this.depth);
      this.scene.tweens.add({ targets: line, alpha: 0.1, duration: 100, yoyo: true, repeat: -1 });
      this.scene.time.delayedCall(STRIKE_WARN_MS, () => {
        line.destroy();
        if (this.gaveUp) return;
        play(this.scene, 'fireball');
        const bolt = this.obstacles.create(x, 0, 'strike').setOrigin(0.5, 0).setDepth(this.depth);
        bolt.strike = true; // shots fly through it
        bolt.setDisplaySize(bolt.width, this.groundY);
        bolt.body.setSize(8, bolt.height).setOffset(bolt.width / 2 - 4, 0);
        this.shots.push(bolt);
        this.scene.cameras.main.shake(120, 0.006);
        this.scene.time.delayedCall(STRIKE_MS, () => bolt.destroy());
      });
    }
  }

  // Little ghosts that follow your dragon for a while, then float away.
  ghosts({ shots, speed }) {
    play(this.scene, 'fireball');
    const { x, y } = this.mouth;
    for (let i = 0; i < shots; i++) {
      const angle = Math.PI + (i - (shots - 1) / 2) * 0.6;
      const shot = this.addShot(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed);
      shot.speed = speed;
      shot.chaseUntil = this.scene.elapsed + CHASE_MS;
    }
  }

  chase(shot, elapsed, delta) {
    if (elapsed > shot.chaseUntil) {
      shot.chaseUntil = 0;
      shot.body.setVelocity(-shot.speed, -shot.speed * 0.3);
      return;
    }
    const want = Phaser.Math.Angle.Between(shot.x, shot.y, this.target.x, this.target.y);
    const now = Math.atan2(shot.body.velocity.y, shot.body.velocity.x);
    const angle = Phaser.Math.Angle.RotateTo(now, want, (CHASE_TURN * delta) / 1000);
    shot.body.setVelocity(Math.cos(angle) * shot.speed, Math.sin(angle) * shot.speed);
    shot.setFlipX(shot.body.velocity.x > 0);
  }

  // A shot hit it: it flashes white and loses one health.
  hit() {
    if (this.gaveUp || this.health <= 0) return;
    this.health -= 1;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(80, () => this.clearTint());
    play(this.scene, 'wear');
  }

  // No health left: it stops attacking, gets dizzy and flies away.
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

