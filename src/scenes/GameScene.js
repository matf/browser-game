import Phaser from 'phaser';
import { Dragon } from '../objects/Dragon.js';
import { Bee } from '../objects/Bee.js';
import { Accessories } from '../objects/Accessories.js';
import { PowerUp } from '../objects/PowerUp.js';
import { MAX_HEARTS } from '../shop.js';
import { DRAGONS, TILE } from './PreloadScene.js';
import { LEVELS } from '../levels.js';
import { LEVELS_PER_ISLAND, LEVEL_COUNT, THEMES, islandOf } from '../world.js';
import { loadSave, writeSave } from '../save.js';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { play, startMusic } from '../sound.js';

// The numbers that change from level to level are in src/levels.js.
const START_CALM_MS = 2000; // quiet time at the start before obstacles come
const DROP_SPEED = 110; // how fast raindrops fall, in pixels per second
const COINS_PER_ROW = 4; // coins in each row between the pillars
const COIN_SPACING = 18; // pixels between coins in a row
const GROUND_HEIGHT = 36; // height of the grass and dirt at the bottom
const MAP_DELAY_MS = 2000; // after a level is won, how long until the world map comes back
const NAP_MS = 5000; // how long the dragon sleeps when it runs out of hearts
const WAKE_HEARTS = 3; // hearts after the nap
const POWERUP_CHANCE = 0.5; // how likely a level has a power-up (0 = never, 1 = always)
const POWERUP_FROM = 0.25; // the power-up comes somewhere between this part of the level...
const POWERUP_TO = 0.75; // ...and this part (0 = start, 1 = end)
const HEART_POWERUP_CHANCE = 0.5; // when a heart is missing, how likely the power-up is a heart instead of a star

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
    // The world map says which level to fly.
    this.levelIndex = Phaser.Math.Clamp(data?.level ?? 0, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
    this.island = islandOf(this.levelIndex);
    this.theme = this.island.theme;
    this.cameras.main.setBackgroundColor(THEMES[this.theme].sky);
    this.groundY = height - GROUND_HEIGHT;
    this.finished = false;
    this.napping = false;
    this.elapsed = 0;
    this.rainbow = null;
    // Some levels hide one power-up: when it comes, it takes the place of a row of coins.
    const seconds = this.level.seconds * 1000;
    this.powerUpAt = Math.random() < POWERUP_CHANCE ? Phaser.Math.FloatBetween(POWERUP_FROM, POWERUP_TO) * seconds : Infinity;

    if (THEMES[this.theme].twinkle) this.addNightStars();
    this.hills = this.add.tileSprite(0, height - 30, width, 48, `hills-${this.theme}`).setOrigin(0, 1);
    this.ground = this.add.tileSprite(0, height, width, 54, `ground-${this.theme}`).setOrigin(0, 1).setDepth(2);

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
    this.powerUps = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.powerUps, this.onPowerUp, null, this);

    this.splash = this.add.particles(0, 0, 'pixel', {
      lifespan: 400,
      speed: { min: 30, max: 80 },
      angle: { min: 200, max: 340 },
      gravityY: 300,
      tint: THEMES[this.theme].splash,
      emitting: false,
    }).setDepth(4);
    // Little hearts that fly off the dragon when it loses one.
    this.lostHearts = this.add.particles(0, 0, 'tiles', {
      frame: TILE.heartFull,
      lifespan: 900,
      speed: { min: 50, max: 110 },
      angle: { min: 200, max: 340 },
      gravityY: 160,
      rotate: { min: -40, max: 40 },
      scale: { start: 0.9, end: 0.4 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(5);
    this.sparkle = this.add.particles(0, 0, 'pixel', {
      lifespan: 350,
      speed: { min: 40, max: 110 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd84a, 0xffffff, 0xffb52e],
      emitting: false,
    }).setDepth(4);
    // Rainbow sparkles behind the dragon while the star power lasts.
    this.starTrail = this.add.particles(0, 0, 'pixel', {
      follow: this.player,
      lifespan: 500,
      speedX: { min: -90, max: -40 },
      speedY: { min: -25, max: 25 },
      scale: { start: 1.6, end: 0 },
      tint: [0xff9fc8, 0xffe066, 0x9ff0a8, 0x8fd3f4, 0xc9a7ff],
      frequency: 25,
      emitting: false,
    }).setDepth(2.9);

    this.registry.set('levelName', `${this.island.name} ${(this.levelIndex % LEVELS_PER_ISLAND) + 1}`);
    this.registry.set('firstLevel', this.levelIndex === 0);
    this.registry.set('hearts', this.save.hearts);
    this.registry.set('coins', this.save.coins);
    this.registry.set('dragonName', DRAGONS.find((d) => d.key === this.save.dragon).name);

    const every = (delay, callback) =>
      this.time.addEvent({ delay, callback, callbackScope: this, loop: true, startAt: -START_CALM_MS });
    every(this.level.pillarEvery, this.spawnPillars);
    every(this.level.beeEvery, this.spawnBee);
    every(this.level.dropEvery, this.spawnDrop);

    this.scene.launch('ui');
    startMusic(this);
    this.input.keyboard.on('keydown-ESC', () => this.toMap());

    // The very first time: explain how to play before anything moves.
    if (!this.save.seenHelp) {
      this.scene.launch('help');
      this.scene.pause();
    }
  }

  // Tiny blinking stars in the night sky of the star island.
  addNightStars() {
    for (let i = 0; i < 40; i++) {
      const star = this.add
        .image(Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(4, HEIGHT - 70), 'pixel')
        .setTint(0xfff3b0)
        .setAlpha(Phaser.Math.FloatBetween(0.2, 0.9));
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(600, 1400),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  // Back to the world map (the map button in the HUD, or Esc). Coins collected so far are kept.
  toMap(data) {
    this.scene.stop('ui');
    this.scene.stop('help');
    this.scene.start('map', data);
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
    const top = this.obstacles.create(x, gapTop, `pillar-top-${this.theme}`).setOrigin(0, 1).setDepth(1);
    const bottom = this.obstacles.create(x, gapTop + gap, `pillar-bottom-${this.theme}`).setOrigin(0, 0).setDepth(1);
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
    if (this.elapsed >= this.powerUpAt) {
      this.powerUpAt = Infinity;
      this.spawnPowerUp(y);
      return;
    }
    for (let i = 0; i < COINS_PER_ROW; i++) this.spawnCoin(WIDTH + 10 + i * COIN_SPACING, y);
  }

  spawnCoin(x, y) {
    const coin = this.coins.create(x, y, 'tiles').play('coin-spin').setDepth(3);
    coin.body.setSize(12, 12).setOffset(3, 3);
    this.moveLeft(coin);
  }

  // A heart only when one is missing, otherwise a star.
  spawnPowerUp(y) {
    const heartMissing = this.save.hearts < MAX_HEARTS;
    const kind = heartMissing && Math.random() < HEART_POWERUP_CHANCE ? 'heart' : 'star';
    this.powerUps.add(new PowerUp(this, WIDTH + 20, y, kind, this.level.scroll).setDepth(3));
  }

  spawnBee() {
    if (this.atEnd || this.napping) return;
    const y = Phaser.Math.Between(40, this.groundY - 40);
    const bee = new Bee(this, WIDTH + 20, y, this.level.beeSpeed).setDepth(3);
    this.obstacles.add(bee);
  }

  spawnDrop() {
    if (this.atEnd || this.napping) return;
    const drop = this.obstacles.create(Phaser.Math.Between(60, WIDTH + 60), -10, `drop-${this.theme}`);
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
    play(this, 'coin');
    this.sparkle.explode(10, coin.x, coin.y);
    coin.destroy();
    this.save.coins += 1;
    writeSave(this.save);
    this.registry.set('coins', this.save.coins);
  }

  onPowerUp(player, powerUp) {
    this.sparkle.explode(20, powerUp.x, powerUp.y);
    powerUp.destroy();
    if (powerUp.kind === 'star') {
      player.startStar();
      play(this, 'newdragon');
      this.cheer('Sternenkraft!', '#ffe066');
    } else {
      this.save.hearts = Math.min(MAX_HEARTS, this.save.hearts + 1);
      writeSave(this.save);
      this.registry.set('hearts', this.save.hearts);
      play(this, 'eat');
      this.cheer('+1 Herz!', '#ff9fc8');
    }
  }

  // A short word that floats up from the dragon.
  cheer(words, color) {
    const text = this.add
      .text(this.player.x, this.player.y - 24, words, {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color,
        stroke: '#1b1630',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(6);
    this.tweens.add({ targets: text, y: text.y - 26, alpha: 0, duration: 1400, ease: 'Sine.In', onComplete: () => text.destroy() });
  }

  // With star power, bees and raindrops just bounce off (pillars stay where they are).
  bonk(obstacle) {
    if (obstacle.isDrop) return this.popDrop(obstacle);
    if (!(obstacle instanceof Bee)) return;
    play(this, 'wear');
    this.sparkle.explode(12, obstacle.x, obstacle.y);
    this.obstacles.remove(obstacle);
    obstacle.body.enable = false;
    this.tweens.add({
      targets: obstacle,
      x: obstacle.x + 60,
      y: obstacle.y - 80,
      angle: 720,
      alpha: 0,
      duration: 700,
      onComplete: () => obstacle.destroy(),
    });
  }

  onHit(player, obstacle) {
    if (player.starPower && !this.finished && !this.napping) return this.bonk(obstacle);
    if (this.finished || this.napping || player.invulnerable) return;
    if (obstacle.isDrop) this.popDrop(obstacle);

    const hearts = this.save.hearts - 1;
    this.registry.set('hearts', hearts);
    this.lostHearts.explode(6, player.x, player.y - 6);
    play(this, hearts > 0 ? 'hit' : 'nap');
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
    this.starTrail.stop();
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

  // The rainbow is reached: remember it, cheer, then back to the world map.
  win() {
    this.finished = true;
    this.physics.pause();
    this.starTrail.stop();
    this.time.removeAllEvents(); // no more pillars, bees or raindrops
    this.player.anims.pause();
    const firstTime = !this.save.done.includes(this.levelIndex);
    if (firstTime) this.save.done.push(this.levelIndex);
    this.save.at = this.levelIndex;
    writeSave(this.save);
    play(this, 'win');
    const islandDone = (this.levelIndex + 1) % LEVELS_PER_ISLAND === 0;
    this.events.emit('levelwon', {
      firstTime,
      islandDone,
      last: this.levelIndex === LEVEL_COUNT - 1,
    });
    this.time.delayedCall(MAP_DELAY_MS, () => this.toMap(firstTime ? { firstWin: this.levelIndex } : {}));
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
    this.starTrail.emitting = this.player.starPower;

    if (this.atEnd && !this.rainbow) this.spawnRainbow();
    if (this.rainbow && this.player.x >= this.rainbow.x) {
      this.sparkle.explode(40, this.player.x, this.player.y);
      this.win();
      return;
    }

    for (const obstacle of this.obstacles.getChildren().slice()) {
      if (obstacle.isDrop && obstacle.y > this.groundY - 4) this.popDrop(obstacle);
      else if (obstacle.x < -60) obstacle.destroy();
    }
    for (const coin of this.coins.getChildren().slice()) if (coin.x < -20) coin.destroy();
    for (const powerUp of this.powerUps.getChildren().slice()) if (powerUp.x < -20) powerUp.destroy();
  }
}
