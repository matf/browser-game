import Phaser from 'phaser';
import { FONT, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play } from '../sound.js';
import { addCoins, addHearts } from '../hud.js';

const TEXT_STYLE = {
  fontFamily: FONT,
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
    setupCamera(this);
    this.gameScene = this.scene.get('game');

    const showHearts = addHearts(this);
    const showCoins = addCoins(this);
    showHearts(this.registry.get('hearts'));
    showCoins(this.registry.get('coins'));
    addMuteButton(this, 466, 14);

    // Back to the world map.
    this.add
      .image(362, 14, 'map-icon')
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        play(this, 'click');
        this.gameScene.toMap();
      });

    this.add
      .rectangle(BAR.x - 1, BAR.y - 1, BAR.width + 2, BAR.height + 2, 0x1b1630)
      .setOrigin(0, 0);
    this.barFill = this.add.rectangle(BAR.x, BAR.y, 0, BAR.height, 0xff7eb6).setOrigin(0, 0);
    this.add.image(BAR.x + BAR.width + 8, BAR.y + BAR.height / 2, 'rainbow').setScale(0.08);

    const onChange = (parent, key) => {
      if (key === 'hearts') showHearts(this.registry.get('hearts'));
      if (key === 'coins') showCoins(this.registry.get('coins'));
    };
    this.registry.events.on('changedata', onChange);

    const intro = this.showMessage(
      this.registry.get('levelName'),
      this.registry.get('levelHint') ??
        (!this.registry.get('firstLevel') ? "Los geht's!" : IS_TOUCH ? 'Joystick: fliegen' : 'Pfeiltasten: fliegen'),
    );
    this.time.delayedCall(this.registry.get('levelHint') ? 3000 : 2000, () =>
      this.tweens.add({ targets: intro, alpha: 0, duration: 500, onComplete: () => intro.destroy() }),
    );

    const onNap = () =>
      this.showMessage(
        'Oh nein!',
        `${this.registry.get('dragonName')} macht ein Nickerchen...\nDie Münzen aus diesem Level sind weg!`,
      );
    const onLevelWon = ({ firstTime, islandDone, last, boss }) => {
      if (boss) this.showMessage('Du hast es geschafft!', 'Der Feuerdrache ist weg!');
      else if (firstTime && last) this.showMessage('Alle Inseln geschafft!', 'Doch jemand wartet noch auf dich...');
      else if (firstTime && islandDone) this.showMessage('Insel geschafft!', 'Eine neue Insel wartet auf dich!');
      else this.showMessage('Level geschafft!', 'Zurück zur Weltkarte...');
    };
    this.gameScene.events.on('nap', onNap);
    this.gameScene.events.on('levelwon', onLevelWon);

    this.events.once('shutdown', () => {
      this.registry.events.off('changedata', onChange);
      this.gameScene.events.off('nap', onNap);
      this.gameScene.events.off('levelwon', onLevelWon);
    });
  }

  update() {
    const g = this.gameScene;
    const progress = Math.min(1, g.elapsed / (g.level.seconds * 1000));
    this.barFill.width = BAR.width * progress;
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
