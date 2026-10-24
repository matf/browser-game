import Phaser from 'phaser';
import { Dragon } from '../objects/Dragon.js';
import { Bee } from '../objects/Bee.js';

const SCROLL_SPEED = 70; // how fast the world moves past, in pixels per second
const HEARTS = 3; // lives at the start
const START_CALM_MS = 2000; // quiet time at the start before obstacles come
const PILLAR_EVERY_MS = 3500; // a new pair of rock pillars this often
const PILLAR_GAP = 100; // height of the hole between the two pillars, in pixels
const BEE_EVERY_MS = 2800; // a new bee this often
const DROP_EVERY_MS = 1000; // a new raindrop this often
const DROP_SPEED = 110; // how fast raindrops fall, in pixels per second
const GROUND_HEIGHT = 36; // height of the grass and dirt at the bottom

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    const { width, height } = this.scale;
    this.groundY = height - GROUND_HEIGHT;
    this.finished = false;

    this.hills = this.add.tileSprite(0, height - 30, width, 48, 'hills').setOrigin(0, 1);
    this.ground = this.add.tileSprite(0, height, width, 54, 'ground').setOrigin(0, 1).setDepth(2);

    this.physics.world.setBounds(0, 0, width, this.groundY);
    this.player = new Dragon(this, 100, height / 2, 'marshmallow').setDepth(3);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.obstacles, this.onHit, null, this);

    this.splash = this.add.particles(0, 0, 'pixel', {
      lifespan: 400,
      speed: { min: 30, max: 80 },
      angle: { min: 200, max: 340 },
      gravityY: 300,
      tint: [0x7ec8f5, 0xd6f1ff],
      emitting: false,
    }).setDepth(4);

    this.registry.set('hearts', HEARTS);

    const every = (delay, callback) =>
      this.time.addEvent({ delay, callback, callbackScope: this, loop: true, startAt: -START_CALM_MS });
    every(PILLAR_EVERY_MS, this.spawnPillars);
    every(BEE_EVERY_MS, this.spawnBee);
    every(DROP_EVERY_MS, this.spawnDrop);

    this.scene.launch('ui');
  }

  spawnPillars() {
    const x = this.scale.width + 10;
    const gapTop = Phaser.Math.Between(40, this.groundY - PILLAR_GAP - 30);
    const top = this.obstacles.create(x, gapTop, 'pillar-top').setOrigin(0, 1).setDepth(1);
    const bottom = this.obstacles
      .create(x, gapTop + PILLAR_GAP, 'pillar-bottom')
      .setOrigin(0, 0)
      .setDepth(1);
    for (const pillar of [top, bottom]) {
      pillar.body.setSize(30, pillar.height).setOffset(3, 0);
      pillar.body.velocity.x = -SCROLL_SPEED;
    }
  }

  spawnBee() {
    const bee = new Bee(this, this.scale.width + 20, Phaser.Math.Between(40, this.groundY - 40));
    bee.setDepth(3);
    this.obstacles.add(bee);
  }

  spawnDrop() {
    const drop = this.obstacles.create(Phaser.Math.Between(60, this.scale.width + 60), -10, 'drop');
    drop.isDrop = true;
    drop.setDepth(3);
    drop.body.setSize(8, 10).setOffset(2, 5);
    drop.body.setVelocity(-SCROLL_SPEED * 0.3, DROP_SPEED);
  }

  onHit(player, obstacle) {
    if (this.finished || player.invulnerable) return;
    if (obstacle.isDrop) this.popDrop(obstacle);

    const hearts = this.registry.get('hearts') - 1;
    this.registry.set('hearts', hearts);
    this.cameras.main.shake(150, 0.01);
    if (hearts > 0) {
      player.hurt();
    } else {
      this.finished = true;
      this.physics.pause();
      this.time.paused = true;
      this.player.anims.pause();
      this.events.emit('gameover');
      const restart = () => {
        this.time.paused = false;
        this.scene.restart();
      };
      this.input.keyboard.once('keydown-SPACE', restart);
      this.input.keyboard.once('keydown-ENTER', restart);
    }
  }

  popDrop(drop) {
    this.splash.explode(8, drop.x, drop.y);
    drop.destroy();
  }

  update(time, delta) {
    if (this.finished) return;

    const dx = (SCROLL_SPEED * delta) / 1000;
    this.ground.tilePositionX += dx;
    this.hills.tilePositionX += dx * 0.3;
    this.player.update(time);

    for (const obstacle of this.obstacles.getChildren().slice()) {
      if (obstacle.isDrop && obstacle.y > this.groundY - 4) this.popDrop(obstacle);
      else if (obstacle.x < -60) obstacle.destroy();
    }
  }
}
