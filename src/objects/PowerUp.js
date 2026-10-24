import Phaser from 'phaser';
import { TILE } from '../scenes/PreloadScene.js';

const BOB_HEIGHT = 8; // how far a power-up floats up and down, in pixels
const BOB_SPEED = 0.005; // how quickly it floats up and down

// The power-ups. texture/frame: its picture, glow: the colour of the shine around it.
export const POWERUPS = {
  star: { texture: 'powerup-star', frame: undefined, scale: 1, glow: 0xffe066 },
  heart: { texture: 'tiles', frame: TILE.heartFull, scale: 1.2, glow: 0xff9fc8 },
};

// A rare shiny thing that floats along with the coins. Touch it to get its power.
export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind, speed) {
    const look = POWERUPS[kind];
    super(scene, x, y, look.texture, look.frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.speed = speed; // how fast it moves to the left, in pixels per second
    this.setScale(look.scale);
    this.body.setSize(14, 14);
    // A soft, pulsing shine behind it, so you notice it's something special.
    this.glow = scene.add.circle(x, y, 13, look.glow, 0.45);
    scene.tweens.add({ targets: this.glow, scale: 1.4, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: this, angle: { from: -12, to: 12 }, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  setDepth(depth) {
    super.setDepth(depth);
    this.glow?.setDepth(depth - 0.1);
    return this;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.body.velocity.x = -this.speed;
    this.body.velocity.y = BOB_HEIGHT * BOB_SPEED * 1000 * Math.cos(time * BOB_SPEED);
    this.glow.setPosition(this.x, this.y);
  }

  destroy(fromScene) {
    this.glow?.destroy();
    super.destroy(fromScene);
  }
}
