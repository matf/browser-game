import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    this.load.setPath('assets');
  }

  create() {
    this.scene.start('game');
  }
}
