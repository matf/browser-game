import Phaser from 'phaser';
import { Dragon } from '../objects/Dragon.js';
import { Bee } from '../objects/Bee.js';
import { Accessories } from '../objects/Accessories.js';
import { DRAGONS } from './PreloadScene.js';
import { LEVELS } from '../levels.js';
import { loadSave, writeSave } from '../save.js';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';

// The numbers that change from level to level are in src/levels.js.
const START_CALM_MS = 2000; // quiet time at the start before obstacles come
const DROP_SPEED = 110; // how fast raindrops fall, in pixels per second
const COINS_PER_ROW = 4; // coins in each row between the pillars
const COIN_SPACING = 18; // pixels between coins in a row
const GROUND_HEIGHT = 36; // height of the grass and dirt at the bottom
const SHOP_DELAY_MS = 2000; // after a level ends, how long until the shop opens
const NAP_MS = 5000; // how long the dragon sleeps when it runs out of hearts
const WAKE_HEARTS = 3; // hearts after the nap

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create(data) {
    setupCamera(this);
    const width = WIDTH;
    const height = HEIGHT;
    this.save = loadSave();
    this.coinsAtStart = this.save.coins; // a nap takes away the coins collected in this level
    // Without a level from a restart (after loading the page), continue where you left off.
    this.levelIndex = Phaser.Math.Clamp(data?.level ?? this.save.level, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
    this.groundY = height - GROUND_HEIGHT;
    this.finished = false;
    this.napping = false;
    this.elapsed = 0;
    this.rainbow = null;

    this.hills = this.add.tileSprite(0, height - 30, width, 48, 'hills').setOrigin(0, 1);
    this.ground = this.add.tileSprite(0, height, width, 54, 'ground').setOrigin(0, 1).setDepth(2);

    this.physics.world.setBounds(0, 0, width, this.groundY);
    this.player = new Dragon(this, 100, height / 2, this.save.dragon).setDepth(3);
    this.accessories = new Accessories(this, this.player, this.save.wear);
    // After the physics step, so the accessories sit exactly on the dragon.
    const follow = () => this.accessories.update();
    this.events.on('postupdate', follow);
    this.events.once('shutdown', () => this.events.off('postupdate', follow));

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.coins = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.obstacles, this.onHit, null, this);
    this.physics.add.overlap(this.player, this.coins, this.onCoin, null, this);

    this.splash = this.add.particles(0, 0, 'pixel', {
      lifespan: 400,
      speed: { min: 30, max: 80 },
      angle: { min: 200, max: 340 },
      gravityY: 300,
      tint: [0x7ec8f5, 0xd6f1ff],
      emitting: false,
    }).setDepth(4);
    this.sparkle = this.add.particles(0, 0, 'pixel', {
      lifespan: 350,
      speed: { min: 40, max: 110 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd84a, 0xffffff, 0xffb52e],
      emitting: false,
    }).setDepth(4);

    this.registry.set('level', this.levelIndex + 1);
    this.registry.set('hearts', this.save.hearts);
    this.registry.set('coins', this.save.coins);
    this.registry.set('dragonName', DRAGONS.find((d) => d.key === this.save.dragon).name);

    const every = (delay, callback) =>
      this.time.addEvent({ delay, callback, callbackScope: this, loop: true, startAt: -START_CALM_MS });
    every(this.level.pillarEvery, this.spawnPillars);
    every(this.level.beeEvery, this.spawnBee);
    every(this.level.dropEvery, this.spawnDrop);

    this.scene.launch('ui');
  }

  // True once the level's time is up: no new obstacles, only the rainbow.
  get atEnd() {
    return this.elapsed >= this.level.seconds * 1000;
  }

  moveLeft(sprite) {
    sprite.body.velocity.x = -this.level.scroll;
    return sprite;
  }

  spawnPillars() {
    if (this.atEnd || this.napping) return;
    const x = WIDTH + 10;
    const gap = this.level.gap;
    const gapTop = Phaser.Math.Between(40, this.groundY - gap - 30);
    const top = this.obstacles.create(x, gapTop, 'pillar-top').setOrigin(0, 1).setDepth(1);
    const bottom = this.obstacles.create(x, gapTop + gap, 'pillar-bottom').setOrigin(0, 0).setDepth(1);
    for (const pillar of [top, bottom]) {
      pillar.body.setSize(30, pillar.height).setOffset(3, 0);
      this.moveLeft(pillar);
    }
    // A coin in the hole, and a row of coins halfway to the next pillars.
    this.spawnCoin(x + 18, gapTop + gap / 2);
    this.time.delayedCall(this.level.pillarEvery / 2, this.spawnCoinRow, null, this);
  }

  spawnCoinRow() {
    if (this.atEnd || this.napping) return;
    const y = Phaser.Math.Between(40, this.groundY - 30);
    for (let i = 0; i < COINS_PER_ROW; i++) this.spawnCoin(WIDTH + 10 + i * COIN_SPACING, y);
  }

  spawnCoin(x, y) {
    const coin = this.coins.create(x, y, 'tiles').play('coin-spin').setDepth(3);
    coin.body.setSize(12, 12).setOffset(3, 3);
    this.moveLeft(coin);
  }

  spawnBee() {
    if (this.atEnd || this.napping) return;
    const y = Phaser.Math.Between(40, this.groundY - 40);
    const bee = new Bee(this, WIDTH + 20, y, this.level.beeSpeed).setDepth(3);
    this.obstacles.add(bee);
  }

  spawnDrop() {
    if (this.atEnd || this.napping) return;
    const drop = this.obstacles.create(Phaser.Math.Between(60, WIDTH + 60), -10, 'drop');
    drop.isDrop = true;
    drop.setDepth(3);
    drop.body.setSize(8, 10).setOffset(2, 5);
    drop.body.setVelocity(-this.level.scroll * 0.3, DROP_SPEED);
  }

  spawnRainbow() {
    this.rainbow = this.physics.add
      .image(WIDTH + 80, this.groundY + 4, 'rainbow')
      .setOrigin(0.5, 1)
      .setDepth(1);
    this.moveLeft(this.rainbow);
  }

  onCoin(player, coin) {
    this.sparkle.explode(10, coin.x, coin.y);
    coin.destroy();
    this.save.coins += 1;
    writeSave(this.save);
    this.registry.set('coins', this.save.coins);
  }

  onHit(player, obstacle) {
    if (this.finished || this.napping || player.invulnerable) return;
    if (obstacle.isDrop) this.popDrop(obstacle);

    const hearts = this.save.hearts - 1;
    this.registry.set('hearts', hearts);
    this.cameras.main.shake(150, 0.01);
    if (hearts > 0) {
      this.save.hearts = hearts;
      writeSave(this.save);
      player.hurt();
    } else {
      this.nap();
    }
  }

  // Out of hearts: the dragon falls asleep, loses the coins from this level, and wakes up with WAKE_HEARTS
  // hearts at the start of the same level (no shop).
  nap() {
    this.napping = true;
    this.physics.pause();
    this.player.anims.pause();
    this.save.hearts = WAKE_HEARTS;
    this.save.coins = this.coinsAtStart;
    writeSave(this.save);
    this.registry.set('coins', this.coinsAtStart);
    this.events.emit('nap');

    const zzz = this.add
      .text(this.player.x + 10, this.player.y - 20, 'Zzz', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1b1630',
        strokeThickness: 4,
      })
      .setResolution(4)
      .setDepth(5);
    this.tweens.add({ targets: zzz, y: zzz.y - 12, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    this.time.delayedCall(NAP_MS, () => this.scene.restart({ level: this.levelIndex }));
  }

  // Stop the level, tell the UI, then open the shop. The shop starts `nextLevel` when you leave it.
  finish(event, nextLevel) {
    this.finished = true;
    this.physics.pause();
    this.time.removeAllEvents(); // no more pillars, bees or raindrops
    this.player.anims.pause();
    this.events.emit(event, { level: this.levelIndex + 1, last: this.levelIndex === LEVELS.length - 1 });
    this.time.delayedCall(SHOP_DELAY_MS, () => {
      this.scene.pause();
      this.scene.launch('shop', { nextLevel });
    });
  }

  popDrop(drop) {
    this.splash.explode(8, drop.x, drop.y);
    drop.destroy();
  }

  update(time, delta) {
    if (this.finished || this.napping) return;

    this.elapsed += delta;
    const dx = (this.level.scroll * delta) / 1000;
    this.ground.tilePositionX += dx;
    this.hills.tilePositionX += dx * 0.3;
    this.player.update(time);

    if (this.atEnd && !this.rainbow) this.spawnRainbow();
    if (this.rainbow && this.player.x >= this.rainbow.x) {
      this.sparkle.explode(40, this.player.x, this.player.y);
      // After the last level, start again at level 1.
      const next = (this.levelIndex + 1) % LEVELS.length;
      this.save.level = next;
      writeSave(this.save);
      this.finish('levelwon', next);
      return;
    }

    for (const obstacle of this.obstacles.getChildren().slice()) {
      if (obstacle.isDrop && obstacle.y > this.groundY - 4) this.popDrop(obstacle);
      else if (obstacle.x < -60) obstacle.destroy();
    }
    for (const coin of this.coins.getChildren().slice()) if (coin.x < -20) coin.destroy();
  }
}
