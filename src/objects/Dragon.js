import Phaser from 'phaser';

const FLY_SPEED = 170; // top speed in pixels per second
const ACCEL = 900; // how quickly the dragon speeds up
const DRAG = 700; // how quickly it slows down when you let go
const TILT = 0.15; // how far the dragon tips up/down when flying up/down (radians)

export class Dragon extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dragonKey) {
    super(scene, x, y, 'dragons');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.play(`${dragonKey}-fly`);
    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(FLY_SPEED, FLY_SPEED);
    this.body.setDrag(DRAG, DRAG);
    // Smaller than the picture, so only touching the body counts, not the tip of a wing or tail.
    this.body.setSize(36, 26).setOffset(24, 18);

    this.keys = scene.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S');
  }

  update() {
    const k = this.keys;
    const dirX = (k.RIGHT.isDown || k.D.isDown) - (k.LEFT.isDown || k.A.isDown);
    const dirY = (k.DOWN.isDown || k.S.isDown) - (k.UP.isDown || k.W.isDown);
    this.setAcceleration(dirX * ACCEL, dirY * ACCEL);

    const targetTilt = (this.body.velocity.y / FLY_SPEED) * TILT;
    this.rotation = Phaser.Math.Linear(this.rotation, targetTilt, 0.2);
  }
}
