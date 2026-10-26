import Phaser from 'phaser';
import { CRITTERS } from '../obstacles.js';

const SWOOP_FROM = 220; // a swooping critter starts diving when it is this close to your dragon (pixels)
const SWOOP_SPEED = 70; // how fast it dives up or down, in pixels per second

// Something that flies at you from the right: a bee, a seagull, a fish... (CRITTERS in src/obstacles.js).
export class Critter extends Phaser.Physics.Arcade.Sprite {
  // kind: a key of CRITTERS. speed: how fast it flies to the left, in pixels per second.
  // target: your dragon (swooping critters dive toward it).
  constructor(scene, x, y, kind, speed, target) {
    const look = CRITTERS[kind];
    super(scene, x, y, look.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.look = look;
    this.play(`${look.texture}-fly`);
    const [w, h, ox, oy] = look.body;
    this.body.setSize(w, h).setOffset(ox, oy);
    this.speed = speed;
    this.target = target;
    this.phase = Math.random() * Math.PI * 2;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const { motion, height, wiggle } = this.look;
    this.body.velocity.x = -this.speed;
    // Up-and-down wiggle: the speed that makes y follow a wave.
    const wave = Math.cos(time * wiggle + this.phase);
    if (motion === 'bob') this.body.velocity.y = height * wiggle * 1000 * wave;
    else if (motion === 'zigzag') this.body.velocity.y = height * wiggle * 1000 * Math.sign(wave) * (2 / Math.PI);
    else if (motion === 'swoop') {
      const close = this.x - this.target.x < SWOOP_FROM && this.x > this.target.x;
      this.body.velocity.y = close ? Phaser.Math.Clamp((this.target.y - this.y) * 2, -SWOOP_SPEED, SWOOP_SPEED) : 0;
    } else if (motion === 'spin') {
      this.body.velocity.y = 0;
      this.angle -= (delta / 1000) * 360;
    }
  }
}
