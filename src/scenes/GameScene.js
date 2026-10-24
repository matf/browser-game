import Phaser from 'phaser';
import { Dragon } from '../objects/Dragon.js';

const SCROLL_SPEED = 60; // how fast the world moves past, in pixels per second

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    const { width, height } = this.scale;

    this.hills = this.add
      .tileSprite(0, height, width, 48, 'backgrounds', 'hills')
      .setOrigin(0, 1);

    this.player = new Dragon(this, 100, height / 2, 'marshmallow');

    this.scene.launch('ui');
  }

  update(time, delta) {
    this.hills.tilePositionX += (SCROLL_SPEED * delta) / 1000;
    this.player.update(time);
  }
}
