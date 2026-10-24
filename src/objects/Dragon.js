import Phaser from 'phaser';
import { TouchStick } from './TouchStick.js';

const SCALE = 0.75; // size of the dragon (1 = full picture size)
const FLY_SPEED = 170; // top speed in pixels per second
const ACCEL = 900; // how quickly the dragon speeds up
const DRAG = 700; // how quickly it slows down when you let go
const STICK_RESPONSE = 0.4; // with the joystick: how quickly the dragon follows your thumb (0-1)
const TILT = 0.15; // how far the dragon tips up/down when flying up/down (radians)
const INVULNERABLE_MS = 1200; // after a hit, how long nothing can hurt the dragon
const KNOCKBACK_MS = 300; // after a hit, how long you can't steer

export class Dragon extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dragonKey) {
    super(scene, x, y, 'dragons');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.play(`${dragonKey}-fly`);
    this.setScale(SCALE);
    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(FLY_SPEED * 1.5, FLY_SPEED * 1.5);
    this.body.setDrag(DRAG, DRAG);
    // Smaller than the picture, so only touching the body counts, not the tip of a wing or tail.
    this.body.setSize(36, 26).setOffset(24, 18);

    this.keys = scene.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S');
    this.stick = new TouchStick(scene);
    this.hurtUntil = 0;
    this.noControlUntil = 0;
  }

  get invulnerable() {
    return this.scene.time.now < this.hurtUntil;
  }

  hurt() {
    const now = this.scene.time.now;
    this.hurtUntil = now + INVULNERABLE_MS;
    this.noControlUntil = now + KNOCKBACK_MS;
    this.setAcceleration(0, 0);
    this.setVelocity(-220, 0);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.2,
      duration: 100,
      yoyo: true,
      repeat: Math.floor(INVULNERABLE_MS / 200) - 1,
      onComplete: () => this.setAlpha(1),
    });
  }

  update(time) {
    if (time < this.noControlUntil) return;
    if (this.stick.active) {
      // Joystick: fly almost straight away at the speed the thumb asks for, no slow speeding up.
      this.setAcceleration(0, 0);
      const v = this.body.velocity;
      v.x = Phaser.Math.Linear(v.x, this.stick.x * FLY_SPEED, STICK_RESPONSE);
      v.y = Phaser.Math.Linear(v.y, this.stick.y * FLY_SPEED, STICK_RESPONSE);
    } else {
      const k = this.keys;
      const dirX = (k.RIGHT.isDown || k.D.isDown) - (k.LEFT.isDown || k.A.isDown);
      const dirY = (k.DOWN.isDown || k.S.isDown) - (k.UP.isDown || k.W.isDown);
      this.setAcceleration(dirX * ACCEL, dirY * ACCEL);
    }
    // Keep normal flying at FLY_SPEED; only a knockback may go faster.
    this.body.velocity.x = Phaser.Math.Clamp(this.body.velocity.x, -FLY_SPEED, FLY_SPEED);
    this.body.velocity.y = Phaser.Math.Clamp(this.body.velocity.y, -FLY_SPEED, FLY_SPEED);

    const targetTilt = (this.body.velocity.y / FLY_SPEED) * TILT;
    this.rotation = Phaser.Math.Linear(this.rotation, targetTilt, 0.2);
  }
}
