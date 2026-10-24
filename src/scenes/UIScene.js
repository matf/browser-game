import Phaser from 'phaser';
import { TILE } from './PreloadScene.js';
import { MAX_HEARTS } from '../shop.js';

const TEXT_STYLE = {
  fontFamily: 'monospace',
  fontStyle: 'bold',
  color: '#ffffff',
  stroke: '#1b1630',
  strokeThickness: 4,
};
const BAR = { x: 180, y: 9, width: 120, height: 8 }; // progress bar to the rainbow

export class UIScene extends Phaser.Scene {
  constructor() {
    super('ui');
  }

  create() {
    this.gameScene = this.scene.get('game');

    this.hearts = [];
    this.drawHearts();

    this.add.image(400, 14, 'tiles', TILE.coin);
    this.coinDigits = [];
    this.drawCoins();
    this.add.text(412, 26, 'E: Shop', { ...TEXT_STYLE, fontSize: '8px', strokeThickness: 3 }).setResolution(4);

    this.add
      .rectangle(BAR.x - 1, BAR.y - 1, BAR.width + 2, BAR.height + 2, 0x1b1630)
      .setOrigin(0, 0);
    this.barFill = this.add.rectangle(BAR.x, BAR.y, 0, BAR.height, 0xff7eb6).setOrigin(0, 0);
    this.add.image(BAR.x + BAR.width + 8, BAR.y + BAR.height / 2, 'rainbow').setScale(0.08);

    const onChange = (parent, key) => {
      if (key === 'hearts') this.drawHearts();
      if (key === 'coins') this.drawCoins();
    };
    this.registry.events.on('changedata', onChange);

    const level = this.registry.get('level');
    const intro = this.showMessage(`Level ${level}`, level === 1 ? 'Pfeiltasten: fliegen' : 'Los geht\'s!');
    this.time.delayedCall(2000, () =>
      this.tweens.add({ targets: intro, alpha: 0, duration: 500, onComplete: () => intro.destroy() }),
    );

    const onGameOver = () =>
      this.showMessage(
        'Oh nein!',
        `${this.registry.get('dragonName')} macht ein Nickerchen\nund wacht mit 1 Herz auf.\n\nLeertaste: weiter   E: Shop`,
      );
    const onLevelWon = ({ last }) =>
      last
        ? this.showMessage('Alle Level geschafft!', 'Leertaste: von vorne anfangen   E: Shop')
        : this.showMessage('Level geschafft!', 'Leertaste: nächstes Level   E: Shop');
    this.gameScene.events.on('gameover', onGameOver);
    this.gameScene.events.on('levelwon', onLevelWon);

    this.events.once('shutdown', () => {
      this.registry.events.off('changedata', onChange);
      this.gameScene.events.off('gameover', onGameOver);
      this.gameScene.events.off('levelwon', onLevelWon);
    });
  }

  update() {
    const g = this.gameScene;
    const progress = Math.min(1, g.elapsed / (g.level.seconds * 1000));
    this.barFill.width = BAR.width * progress;
  }

  drawHearts() {
    const hearts = this.registry.get('hearts') ?? 0;
    for (let i = 0; i < MAX_HEARTS; i++) {
      this.hearts[i] ??= this.add.image(14 + i * 20, 14, 'tiles');
      this.hearts[i].setFrame(i < hearts ? TILE.heartFull : TILE.heartEmpty);
    }
  }

  // Coin count drawn with the pixel digits from the Kenney tilesheet.
  drawCoins() {
    for (const d of this.coinDigits) d.destroy();
    const text = String(this.registry.get('coins') ?? 0);
    this.coinDigits = [...text].map((ch, i) =>
      this.add.image(418 + i * 11, 14, 'tiles', TILE.digit0 + Number(ch)),
    );
  }

  showMessage(title, subtitle) {
    const big = this.add
      .text(0, 0, title, { ...TEXT_STYLE, fontSize: '28px' })
      .setOrigin(0.5)
      .setResolution(4);
    const small = this.add
      .text(0, 26, subtitle, { ...TEXT_STYLE, fontSize: '12px', align: 'center' })
      .setOrigin(0.5, 0)
      .setResolution(4);
    // Dark panel behind the text so it's readable over the busy background.
    const w = Math.max(big.width, small.width) + 24;
    const top = -big.height / 2 - 8;
    const panel = this.add
      .rectangle(0, top, w, small.y + small.height + 8 - top, 0x1b1630, 0.6)
      .setOrigin(0.5, 0);
    const box = this.add.container(240, 115, [panel, big, small]).setScale(0);
    this.tweens.add({ targets: box, scale: 1, duration: 400, ease: 'Back.Out' });
    return box;
  }
}
