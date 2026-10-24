import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('ui');
  }

  create() {
    const hint = this.add
      .text(240, 16, 'Pfeiltasten: fliegen', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1b1630',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setResolution(4);
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 1000 });
  }
}
