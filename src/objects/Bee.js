import Phaser from 'phaser';

const SPEED = 110; // how fast bees fly to the left, in pixels per second
const BOB_HEIGHT = 25; // how far they buzz up and down, in pixels
const BOB_SPEED = 0.004; // how quickly they buzz up and down

export class Bee extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bee');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.play('bee-fly');
    this.body.setSize(16, 12).setOffset(3, 7);
    this.phase = Math.random() * Math.PI * 2;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.body.velocity.x = -SPEED;
    // Up-and-down wiggle: the speed that makes y follow a sine wave.
    this.body.velocity.y = BOB_HEIGHT * BOB_SPEED * 1000 * Math.cos(time * BOB_SPEED + this.phase);
  }
}
