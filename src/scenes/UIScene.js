import Phaser from 'phaser';
import { FONT, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play } from '../sound.js';
import { addCoins, addHearts } from '../hud.js';
import { ENERGY_MAX } from '../objects/Shooter.js';

const TEXT_STYLE = {
  fontFamily: FONT,
  fontStyle: 'bold',
  color: '#ffffff',
  stroke: '#1b1630',
  strokeThickness: 4,
};
const BAR = { x: 180, y: 9, width: 120, height: 8 }; // progress bar to the rainbow
const ENERGY_BAR = { x: 22, y: 27, width: 72, height: 5 }; // the energy for shooting, under the hearts
const ENERGY_COLOR = 0x7fe0ff;
const TIRED_COLOR = 0xff5a5f; // the bar blinks in this colour when there's too little energy for a shot
const TIRED_BLINK_MS = 400;

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

    const shot = this.gameScene.shooter.shot;
    this.add.image(ENERGY_BAR.x - 9, ENERGY_BAR.y + ENERGY_BAR.height / 2, shot.texture, shot.frame).setScale(shot.scale * 0.9);
    this.add
      .rectangle(ENERGY_BAR.x - 1, ENERGY_BAR.y - 1, ENERGY_BAR.width + 2, ENERGY_BAR.height + 2, 0x1b1630)
      .setOrigin(0, 0);
    this.energyFill = this.add.rectangle(ENERGY_BAR.x, ENERGY_BAR.y, 0, ENERGY_BAR.height, ENERGY_COLOR).setOrigin(0, 0);

    const onChange = (parent, key) => {
      if (key === 'hearts') showHearts(this.registry.get('hearts'));
      if (key === 'coins') showCoins(this.registry.get('coins'));
    };
    this.registry.events.on('changedata', onChange);

    const intro = this.showMessage(
      this.registry.get('levelName'),
      this.registry.get('levelHint') ??
        (!this.registry.get('firstLevel')
          ? "Los geht's!"
          : IS_TOUCH
            ? 'Joystick: fliegen\nKnopf rechts: spucken'
            : 'Pfeiltasten: fliegen\nLeertaste: spucken'),
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
    const shooter = g.shooter;
    this.energyFill.width = (ENERGY_BAR.width * shooter.energy) / ENERGY_MAX;
    const tired = g.time.now - shooter.tiredAt < TIRED_BLINK_MS && g.time.now % 160 < 80;
    this.energyFill.fillColor = tired ? TIRED_COLOR : ENERGY_COLOR;
    this.energyFill.fillAlpha = shooter.ready ? 1 : 0.55;
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
