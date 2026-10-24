import Phaser from 'phaser';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { STICK_HOME } from '../objects/TouchStick.js';
import { TILE } from './PreloadScene.js';
import { writeSave } from '../save.js';

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// "So geht's!": shown over the paused game the very first time someone plays.
export class HelpScene extends Phaser.Scene {
  constructor() {
    super('help');
  }

  create() {
    setupCamera(this);
    this.started = false;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b1630, 0.94).setOrigin(0);

    // On phones the text sits on the right, so the joystick on the left stays visible.
    const left = IS_TOUCH ? 165 : 95;
    const centre = IS_TOUCH ? 310 : WIDTH / 2;
    this.add.text(centre, 26, "So geht's!", { ...TEXT, fontSize: '24px' }).setOrigin(0.5).setResolution(4);

    const rows = [
      [this.add.sprite(0, 0, 'dragons', 0).setScale(0.5), IS_TOUCH ? 'Flieg mit dem Joystick.' : 'Flieg mit den Pfeiltasten\n(oder W A S D).'],
      [this.add.image(0, 0, 'tiles', TILE.coin), 'Sammle Münzen für den Shop.'],
      [this.add.image(0, 0, 'bee', 0), 'Weiche Säulen, Bienen\nund Regentropfen aus.'],
      [this.add.image(0, 0, 'rainbow').setScale(0.13), 'Flieg durch den Regenbogen!'],
    ];
    rows.forEach(([icon, text], i) => {
      const y = 70 + i * 40;
      icon.setPosition(left + 18, y);
      this.add.text(left + 44, y, text, { ...TEXT, fontSize: '12px' }).setOrigin(0, 0.5).setResolution(4);
    });

    if (IS_TOUCH) {
      // A copy of the joystick on top of the dark layer, with a pulsing ring around it.
      this.add.circle(STICK_HOME.x, STICK_HOME.y, 38, 0xffffff, 0.15).setStrokeStyle(3, 0xffffff, 0.8);
      this.add.circle(STICK_HOME.x, STICK_HOME.y, 16, 0xffffff, 0.7);
      const ring = this.add.circle(STICK_HOME.x, STICK_HOME.y, 44).setStrokeStyle(3, 0xffe066);
      this.tweens.add({ targets: ring, scale: 1.2, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
      this.add
        .text(STICK_HOME.x, STICK_HOME.y - 64, 'Daumen hier\nhin und schieben!', {
          ...TEXT,
          fontSize: '11px',
          color: '#ffe066',
          align: 'center',
        })
        .setOrigin(0.5)
        .setResolution(4);
    }

    const go = this.add
      .text(centre, 246, IS_TOUCH ? 'Tippe, um loszufliegen!' : 'Leertaste: loslegen!', {
        ...TEXT,
        fontSize: '14px',
        color: '#ffe066',
      })
      .setOrigin(0.5)
      .setResolution(4);
    this.tweens.add({ targets: go, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    // A short wait, so a tap that was meant for something else doesn't skip the help.
    this.time.delayedCall(400, () => {
      this.input.once('pointerdown', this.start, this);
      this.input.keyboard.once('keydown-SPACE', this.start, this);
      this.input.keyboard.once('keydown-ENTER', this.start, this);
    });
  }

  start() {
    if (this.started) return;
    this.started = true;
    // The game scene keeps its own copy of the save and writes it later, so mark it there too.
    const game = this.scene.get('game');
    game.save.seenHelp = true;
    writeSave(game.save);
    this.scene.stop();
    this.scene.resume('game');
  }
}
