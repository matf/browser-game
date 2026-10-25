import Phaser from 'phaser';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { STICK_HOME } from '../objects/TouchStick.js';
import { TILE } from './PreloadScene.js';
import { SHOTS } from '../objects/Shooter.js';
import { loadSave, writeSave } from '../save.js';
import { play } from '../sound.js';
import { dragonLook } from '../dragons.js';

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// "So geht's!": shown over the paused game the very first time someone plays, and from the main
// menu's "Hilfe" button.
export class HelpScene extends Phaser.Scene {
  constructor() {
    super('help');
  }

  // data.from: the scene underneath, which is paused while the help shows ('game' or 'title').
  create(data) {
    setupCamera(this);
    this.started = false;
    this.from = data?.from ?? 'game';
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b1630, 0.94).setOrigin(0);

    // On phones the text sits on the right, so the joystick on the left stays visible.
    const left = IS_TOUCH ? 165 : 95;
    const centre = IS_TOUCH ? 310 : WIDTH / 2;
    this.add.text(centre, 26, "So geht's!", { ...TEXT, fontSize: '24px' }).setOrigin(0.5).setResolution(4);

    const shot = SHOTS[dragonLook(loadSave()).shot] ?? SHOTS.marshmallow;
    const rows = [
      [this.add.sprite(0, 0, 'dragons', 0).setScale(0.5), IS_TOUCH ? 'Flieg mit dem Joystick.' : 'Flieg mit den Pfeiltasten\n(oder W A S D).'],
      [this.add.image(0, 0, 'tiles', TILE.coin), 'Sammle Münzen für den Shop.'],
      [this.add.image(0, 0, 'bee', 0), 'Weiche Säulen, Bienen\nund Regentropfen aus.'],
      [
        this.add.image(0, 0, shot.texture, shot.frame).setScale(shot.scale * 1.6),
        `${IS_TOUCH ? 'Knopf rechts' : 'Leertaste'}: spucken! Der Balken unter\nden Herzen zeigt, wie viel Puste du hast.`,
      ],
      [this.add.image(0, 0, 'rainbow').setScale(0.13), 'Flieg durch den Regenbogen!'],
      [this.add.image(0, 0, 'station-done').setScale(1.5), 'Schaff alle 3 Level einer Insel,\ndann geht die nächste auf.'],
    ];
    rows.forEach(([icon, text], i) => {
      const y = 56 + i * 32;
      icon.setPosition(left + 18, y);
      this.add.text(left + 44, y, text, { ...TEXT, fontSize: '11px', lineSpacing: -3 }).setOrigin(0, 0.5).setResolution(4);
    });

    if (IS_TOUCH) {
      // A copy of the joystick on top of the dark layer, with a pulsing ring around it.
      this.add.circle(STICK_HOME.x, STICK_HOME.y, 46, 0xffffff, 0.15).setStrokeStyle(3, 0xffffff, 0.8);
      this.add.circle(STICK_HOME.x, STICK_HOME.y, 19, 0xffffff, 0.7);
      const ring = this.add.circle(STICK_HOME.x, STICK_HOME.y, 52).setStrokeStyle(3, 0xffe066);
      this.tweens.add({ targets: ring, scale: 1.2, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
      this.add
        .text(STICK_HOME.x, STICK_HOME.y - 72, 'Daumen hier\nhin und schieben!', {
          ...TEXT,
          fontSize: '11px',
          color: '#ffe066',
          align: 'center',
        })
        .setOrigin(0.5)
        .setResolution(4);
    }

    const go = this.add
      .text(centre, 250, this.goText(), {
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

  goText() {
    if (this.from === 'title') return IS_TOUCH ? 'Tippe, um zurückzugehen' : 'Leertaste: zurück';
    return IS_TOUCH ? 'Tippe, um loszufliegen!' : 'Leertaste: loslegen!';
  }

  start() {
    if (this.started) return;
    this.started = true;
    play(this, this.from === 'title' ? 'click' : 'start');
    // The scene underneath keeps its own copy of the save and writes it later, so mark it there too.
    const below = this.scene.get(this.from);
    below.save.seenHelp = true;
    writeSave(below.save);
    this.scene.stop();
    this.scene.resume(this.from);
  }
}
