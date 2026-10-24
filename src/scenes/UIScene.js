import Phaser from 'phaser';
import { TILE } from './PreloadScene.js';

const TEXT_STYLE = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: '#ffffff',
  stroke: '#1b1630',
  strokeThickness: 4,
};

export class UIScene extends Phaser.Scene {
  constructor() {
    super('ui');
  }

  create() {
    this.hearts = [];
    this.drawHearts();
    const onChange = (parent, key) => key === 'hearts' && this.drawHearts();
    this.registry.events.on('changedata', onChange);

    const hint = this.add
      .text(240, 16, 'Pfeiltasten: fliegen', { ...TEXT_STYLE, fontSize: '12px' })
      .setOrigin(0.5, 0)
      .setResolution(4);
    this.tweens.add({ targets: hint, alpha: 0, delay: 4000, duration: 1000 });

    const game = this.scene.get('game');
    const onGameOver = () => this.showMessage('Oh nein!', 'Leertaste: nochmal fliegen');
    game.events.on('gameover', onGameOver);

    this.events.once('shutdown', () => {
      this.registry.events.off('changedata', onChange);
      game.events.off('gameover', onGameOver);
    });
  }

  drawHearts() {
    const hearts = this.registry.get('hearts') ?? 0;
    const max = Math.max(this.hearts.length, hearts);
    for (let i = 0; i < max; i++) {
      this.hearts[i] ??= this.add.image(14 + i * 20, 14, 'tiles');
      this.hearts[i].setFrame(i < hearts ? TILE.heartFull : TILE.heartEmpty);
    }
  }

  showMessage(title, subtitle) {
    const big = this.add
      .text(240, 115, title, { ...TEXT_STYLE, fontSize: '28px' })
      .setOrigin(0.5)
      .setResolution(4)
      .setScale(0);
    this.add
      .text(240, 150, subtitle, { ...TEXT_STYLE, fontSize: '12px' })
      .setOrigin(0.5)
      .setResolution(4);
    this.tweens.add({ targets: big, scale: 1, duration: 400, ease: 'Back.Out' });
  }
}
