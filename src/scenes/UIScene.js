import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('ui');
  }

  create() {
    this.add
      .text(240, 135, 'Hallo!', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1b1630',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setResolution(4);
  }
}
