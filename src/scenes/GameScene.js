import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    this.scene.launch('ui');
  }
}
