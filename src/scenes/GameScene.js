import Phaser from 'phaser';
import { Dragon } from '../objects/Dragon.js';
import { Critter } from '../objects/Critter.js';
import { Accessories } from '../objects/Accessories.js';
import { PowerUp } from '../objects/PowerUp.js';
import { BOSSES, Boss } from '../objects/Boss.js';
import { Shooter } from '../objects/Shooter.js';
import { MAX_HEARTS } from '../shop.js';
import { TILE } from './PreloadScene.js';
import { LEVELS } from '../levels.js';
import { DROPS } from '../obstacles.js';
import { LEVEL_SPOTS, THEMES, isBossLevel, islandOf, lastOnIsland } from '../world.js';
import { loadSave, writeSave } from '../save.js';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { play, startMusic } from '../sound.js';
import { dragonLook } from '../dragons.js';

// The numbers that change from level to level are in src/levels.js.
const START_CALM_MS = 2000; // quiet time at the start before obstacles come
const ARC_GRAVITY = 200; // how strongly thrown things (like cannonballs) fall back down
const BOUNCE = 0.5; // how much of its speed a bouncing thing keeps when it hits the ground
const SWAY = 40; // how far swaying things swing left and right (pixels per second)
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
const RAINBOW_AFTER_BOSS_MS = 2500; // after a boss gives up, the rainbow comes this much later

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
    // The world map says which level to fly. The last one of each island group is a boss fight.
    this.levelIndex = Phaser.Math.Clamp(data?.level ?? 0, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
    this.isBoss = Boolean(this.level.boss);
    this.island = islandOf(this.levelIndex);
    this.theme = this.island.theme;
    this.cameras.main.setBackgroundColor(THEMES[this.theme].sky);
    this.groundY = height - GROUND_HEIGHT;
    this.finished = false;
    this.napping = false;
    this.elapsed = 0;
    this.rainbow = null;
    this.ending = false; // the time is up: the rainbow (or the fire dragon giving up) is on its way
    // Some levels hide one power-up: when it comes, it takes the place of a row of coins.
    // A boss fight always has one.
    const seconds = this.level.seconds * 1000;
    if (this.isBoss) this.powerUpAt = this.level.powerUpAt * 1000;
    else this.powerUpAt = Math.random() < POWERUP_CHANCE ? Phaser.Math.FloatBetween(POWERUP_FROM, POWERUP_TO) * seconds : Infinity;

    if (THEMES[this.theme].twinkle) this.addNightStars();
    if (THEMES[this.theme].embers) this.addEmbers();
    if (THEMES[this.theme].bubbles) this.addBubbles();
    this.hills = this.add.tileSprite(0, height - 30, width, 48, `hills-${this.theme}`).setOrigin(0, 1);
    this.ground = this.add.tileSprite(0, height, width, 54, `ground-${this.theme}`).setOrigin(0, 1).setDepth(2);

    this.physics.world.setBounds(0, 0, width, this.groundY);
    this.look = dragonLook(this.save);
    this.player = new Dragon(this, 100, height / 2, this.look).setDepth(3);
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
    this.shots = this.physics.add.group({ allowGravity: false });
    this.shooter = new Shooter(this, this.player, this.look.shot, this.shots);
    this.physics.add.overlap(this.shots, this.obstacles, this.onShotHit, null, this);

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

    const number = LEVEL_SPOTS[this.levelIndex].station + 1;
    this.registry.set('levelName', this.isBoss ? `${BOSSES[this.level.boss].name}!` : `${this.island.name} ${number}`);
    this.registry.set('levelHint', this.isBoss ? 'Triff ihn mit deinen Schüssen,\nbis sein Balken leer ist!' : null);
    this.registry.set('firstLevel', this.levelIndex === 0);
    this.registry.set('hearts', this.save.hearts);
    this.registry.set('coins', this.save.coins);
    this.registry.set('dragonName', this.look.name);

    const every = (delay, callback) =>
      this.time.addEvent({ delay, callback, callbackScope: this, loop: true, startAt: -START_CALM_MS });
    if (this.isBoss) {
      this.boss = new Boss(this, this.level.boss, this.level, this.obstacles, this.player, 50, this.groundY - 40, this.groundY).setDepth(3);
      this.obstacles.add(this.boss); // flying into it hurts too
    } else {
      every(this.level.pillarEvery, this.spawnPillars);
      every(this.level.critterEvery, this.spawnCritter);
      every(this.level.dropEvery, this.spawnDrop);
    }

    this.scene.launch('ui');
    startMusic(this);
    this.input.keyboard.on('keydown-ESC', () => this.toMap());

    // The very first time: explain how to play before anything moves.
    if (!this.save.seenHelp) {
      this.scene.launch('help', { from: 'game' });
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

  // Glowing sparks floating up from the ground on the volcano island.
  addEmbers() {
    this.add.particles(0, this.groundY, 'pixel', {
      x: { min: 0, max: WIDTH },
      lifespan: 4000,
      speedY: { min: -30, max: -12 },
      speedX: { min: -25, max: 5 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xff7a2a, 0xffd84a, 0xff4a1a],
      frequency: 120,
    });
  }

  // Little bubbles floating up in the background, under water.
  addBubbles() {
    this.add.particles(0, this.groundY, 'pixel', {
      x: { min: 0, max: WIDTH },
      lifespan: 6000,
      speedY: { min: -40, max: -20 },
      speedX: { min: -30, max: -10 },
      scale: { start: 1.4, end: 0.6 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xbff4ff, 0xffffff],
      frequency: 150,
    });
  }

  // Back to the world map (the map button in the HUD, or Esc). Coins collected so far are kept.
  // Always pass data: Phaser keeps the old data when a scene is started without any.
  toMap(data = {}) {
    this.scene.stop('ui');
    this.scene.stop('help');
    this.scene.start('map', data);
  }

  // True once the level's time is up (or the boss has no health left): no new obstacles, only the
  // rainbow.
  get atEnd() {
    if (this.isBoss) return this.boss.health <= 0;
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

  spawnCritter() {
    if (this.atEnd || this.napping) return;
    const y = Phaser.Math.Between(40, this.groundY - 40);
    const critter = new Critter(this, WIDTH + 20, y, THEMES[this.theme].critter, this.level.critterSpeed, this.player).setDepth(3);
    this.obstacles.add(critter);
  }

  // Something falls down (or comes up from the ground, or is thrown); how is in DROPS (src/obstacles.js).
  spawnDrop() {
    if (this.atEnd || this.napping) return;
    const look = DROPS[THEMES[this.theme].drop];
    const { motion, speed } = look;
    const scroll = this.level.scroll;
    let x = Phaser.Math.Between(60, WIDTH + 60);
    let y = -10;
    let vx = -scroll * 0.3;
    let vy = speed;
    if (motion === 'rise') {
      x = Phaser.Math.Between(120, WIDTH + 20);
      y = this.groundY - 2;
      vx = -scroll * 0.5;
      vy = -speed;
    } else if (motion === 'streak') {
      x = Phaser.Math.Between(180, WIDTH + 160);
      vx = -speed * 0.8;
    } else if (motion === 'arc') {
      // From the bottom right, up in a high arc and down again.
      const high = Phaser.Math.Between(110, this.groundY - 40);
      x = WIDTH + 10;
      y = this.groundY - 8;
      vx = -speed;
      vy = -Math.sqrt(2 * ARC_GRAVITY * high);
    }
    const drop = this.obstacles.create(x, y, look.texture).setDepth(3);
    drop.pops = true;
    drop.motion = motion;
    drop.bounces = motion === 'bounce' ? 1 : 0;
    const [w, h, ox, oy] = look.body;
    drop.body.setSize(w, h).setOffset(ox, oy);
    drop.body.setVelocity(vx, vy);
    if (motion === 'arc') drop.body.setAccelerationY(ARC_GRAVITY);
    if (look.spin) drop.body.setAngularVelocity(look.spin);
  }

  // A falling thing reached the ground: it bounces (when it can) or goes puff. Things coming up
  // go puff at the top.
  moveDrop(drop) {
    if (drop.motion === 'sway') drop.body.velocity.x = -this.level.scroll * 0.3 + Math.cos(drop.y / 18) * SWAY;
    if (drop.motion === 'rise') {
      if (drop.y < 14) this.popDrop(drop);
      return;
    }
    if (drop.y <= this.groundY - 4 || drop.body.velocity.y <= 0) return;
    if (drop.bounces > 0) {
      drop.bounces -= 1;
      drop.y = this.groundY - 5;
      drop.body.velocity.y *= -BOUNCE;
      this.splash.explode(4, drop.x, this.groundY);
    } else this.popDrop(drop);
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

  // A shot hit something: bees spin away, raindrops and fireballs go puff, pillars stop it, and
  // a boss loses some health. Shots fly through lightning.
  onShotHit(shot, obstacle) {
    if (!shot.active || !obstacle.active || obstacle.lightning) return;
    this.shooter.pop(shot);
    if (obstacle instanceof Critter || obstacle.pops) this.bonk(obstacle);
    else if (obstacle === this.boss) {
      this.boss.hit();
      this.sparkle.explode(8, shot.x, shot.y);
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

  // With star power (or a shot), bees, raindrops and fireballs just bounce off (pillars, lightning and bosses stay).
  bonk(obstacle) {
    if (obstacle.pops) return this.popDrop(obstacle);
    if (!(obstacle instanceof Critter)) return;
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
    if (obstacle.pops) this.popDrop(obstacle);

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
    this.shooter.enabled = false;
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

  // The boss has no health left: all its shots go puff, it flies away, then the rainbow comes.
  bossGivesUp() {
    this.boss.giveUp();
    for (const obstacle of this.obstacles.getChildren().slice()) {
      if (obstacle.pops) this.popDrop(obstacle);
      else if (obstacle.lightning) obstacle.destroy();
    }
    play(this, 'nope');
    const say = this.add
      .text(this.boss.x - 20, this.boss.y - 50, this.boss.look.giveUp, {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffe066',
        stroke: '#1b1630',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(6);
    this.tweens.add({ targets: say, alpha: 0, delay: 2000, duration: 500, onComplete: () => say.destroy() });
    this.time.delayedCall(RAINBOW_AFTER_BOSS_MS, () => this.spawnRainbow());
  }

  // The rainbow is reached: remember it, cheer, then back to the world map (or, after the fire
  // dragon, to the big fireworks).
  win() {
    this.finished = true;
    this.shooter.enabled = false;
    this.physics.pause();
    this.starTrail.stop();
    this.time.removeAllEvents(); // no more pillars, bees or raindrops
    this.player.anims.pause();
    const firstTime = !this.save.done.includes(this.levelIndex);
    if (firstTime) this.save.done.push(this.levelIndex);
    this.save.at = this.levelIndex;
    writeSave(this.save);
    play(this, 'win');
    this.events.emit('levelwon', {
      firstTime,
      islandDone: lastOnIsland(this.levelIndex),
      last: isBossLevel(this.levelIndex + 1),
      boss: this.isBoss && BOSSES[this.level.boss].name,
    });
    const data = firstTime ? { firstWin: this.levelIndex } : {};
    if (this.isBoss) this.time.delayedCall(MAP_DELAY_MS, () => this.toFinale({ level: this.levelIndex, ...data }));
    else this.time.delayedCall(MAP_DELAY_MS, () => this.toMap(data));
  }

  // After a boss: fireworks. data: { level (the boss level), firstWin } for the finale and the map.
  toFinale(data) {
    this.scene.stop('ui');
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('finale', data));
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
    this.shooter.update(time, delta);
    this.starTrail.emitting = this.player.starPower;

    if (this.isBoss) this.boss.update(this.elapsed, delta);
    if (this.isBoss && this.elapsed >= this.powerUpAt) {
      this.powerUpAt = Infinity;
      this.spawnPowerUp(Phaser.Math.Between(60, this.groundY - 50));
    }
    if (this.atEnd && !this.ending) {
      this.ending = true;
      if (this.isBoss) this.bossGivesUp();
      else this.spawnRainbow();
    }
    if (this.rainbow && this.player.x >= this.rainbow.x) {
      this.sparkle.explode(40, this.player.x, this.player.y);
      this.win();
      return;
    }

    for (const obstacle of this.obstacles.getChildren().slice()) {
      if (obstacle.x < -60 || obstacle.y < -60) obstacle.destroy();
      else if (obstacle.pops) this.moveDrop(obstacle);
    }
    for (const coin of this.coins.getChildren().slice()) if (coin.x < -20) coin.destroy();
    for (const powerUp of this.powerUps.getChildren().slice()) if (powerUp.x < -20) powerUp.destroy();
  }
}
