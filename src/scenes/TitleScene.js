import Phaser from 'phaser';
import { Accessories } from '../objects/Accessories.js';
import { hasProgress, loadSave, resetSave, writeSave } from '../save.js';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play, startMusic } from '../sound.js';
import { THEMES } from '../world.js';
import { shouldShowHomeHint } from '../install.js';
import { dragonLook, showDragon } from '../dragons.js';

const SCROLL_SPEED = 30; // how fast the ground moves past behind the menu, in pixels per second
const BUTTON = { x: 340, y: 92, width: 150, height: 23, gap: 5 }; // the menu buttons, top one at y
const DIALOG_BUTTON_HEIGHT = 28;
const COLORS = { button: 0x4a3a6e, main: 0x5fd068, danger: 0xff7a7a, selected: 0xffd84a };

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 4 };

// The main menu: Weiterspielen, Neues Spiel, Drachen-Galerie, Einstellungen, Hilfe, Mitwirkende.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    setupCamera(this);
    startMusic(this);
    this.save = loadSave();
    this.leaving = false;
    this.buttons = [];
    this.selected = 0;

    // The flower island's sky, hills and ground, slowly moving past.
    this.cameras.main.setBackgroundColor(THEMES.flowers.sky);
    this.hills = this.add.tileSprite(0, HEIGHT - 30, WIDTH, 48, 'hills-flowers').setOrigin(0, 1);
    this.ground = this.add.tileSprite(0, HEIGHT, WIDTH, 54, 'ground-flowers').setOrigin(0, 1);

    this.dragon = showDragon(this.add.sprite(130, 140, 'dragons'), dragonLook(this.save)).setScale(1.3);
    this.accessories = new Accessories(this, this.dragon, this.save.wear);

    const title = this.add
      .text(WIDTH / 2, 42, 'Dragon Flight', { ...TEXT, fontSize: '40px', color: '#ffe066', strokeThickness: 6 })
      .setOrigin(0.5)
      .setResolution(4)
      .setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Back.Out' });
    this.tweens.add({ targets: title, angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    addMuteButton(this, 466, 14);
    if (!IS_TOUCH) {
      this.add
        .text(WIDTH / 2, HEIGHT - 10, 'Pfeiltasten: wählen   Enter: los!', { ...TEXT, fontSize: '9px', strokeThickness: 3 })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(5);
    }

    // Keys work on whatever buttons are showing (the menu, or the "really?" question).
    const onKeys = (names, action) =>
      names.forEach((name) => this.input.keyboard.on(`keydown-${name}`, () => this.canAct() && action()));
    onKeys(['UP', 'W', 'LEFT', 'A'], () => this.select(this.selected - 1));
    onKeys(['DOWN', 'S', 'RIGHT', 'D'], () => this.select(this.selected + 1));
    onKeys(['ENTER', 'SPACE'], () => this.buttons[this.selected]?.action());

    this.showMenu();
    this.cameras.main.fadeIn(300);
    // The very first time on a phone: how to put the game on the home screen.
    if (shouldShowHomeHint()) this.time.delayedCall(700, () => this.openPage('homescreen'));
  }

  update(time, delta) {
    const dx = (SCROLL_SPEED * delta) / 1000;
    this.ground.tilePositionX += dx;
    this.hills.tilePositionX += dx * 0.3;
    this.dragon.y = 140 + Math.sin(time / 400) * 6;
    this.accessories.update();
  }

  // Not while leaving, and not while the help screen is on top.
  canAct() {
    return !this.leaving && this.scene.isActive();
  }

  showMenu() {
    const items = [];
    if (hasProgress(this.save)) {
      items.push({ label: 'Weiterspielen', color: COLORS.main, action: () => this.go('map') });
      items.push({ label: 'Neues Spiel', action: () => this.askNewGame() });
    } else {
      items.push({ label: 'Neues Spiel', color: COLORS.main, action: () => this.startNewGame() });
    }
    items.push({ label: 'Drachen-Galerie', action: () => this.openPage('gallery') });
    items.push({ label: 'Einstellungen', action: () => this.openPage('settings') });
    items.push({ label: 'Hilfe', action: () => this.openPage('help', { from: 'title' }) });
    items.push({ label: 'Mitwirkende', action: () => this.openPage('credits') });
    this.setButtons(items.map((item, i) => ({ ...item, x: BUTTON.x, y: BUTTON.y + i * (BUTTON.height + BUTTON.gap) })));
  }

  // Replace the buttons on screen. Each button: { label, x, y, color, action }.
  setButtons(list) {
    for (const b of this.buttons) b.box.destroy();
    this.buttons = list.map((b, i) => {
      const bg = this.add
        .rectangle(0, 0, b.width ?? BUTTON.width, b.height ?? BUTTON.height, b.color ?? COLORS.button)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(i))
        .on('pointerdown', () => this.canAct() && b.action());
      const dark = b.color === COLORS.main || b.color === COLORS.danger;
      const label = this.add
        .text(0, 0, b.label, { ...TEXT, fontSize: '14px', color: dark ? '#1b1630' : '#ffffff', strokeThickness: dark ? 0 : 3 })
        .setOrigin(0.5)
        .setResolution(4);
      const box = this.add.container(b.x, b.y, [bg, label]).setDepth(b.depth ?? 5);
      return { ...b, box, bg };
    });
    this.selected = -1;
    this.select(0);
  }

  select(index) {
    if (index < 0 || index >= this.buttons.length || index === this.selected) return;
    if (this.selected !== -1) play(this, 'click');
    this.selected = index;
    this.buttons.forEach(({ box, bg }, i) => {
      this.tweens.killTweensOf(box);
      box.setScale(1);
      bg.setStrokeStyle(i === index ? 3 : 2, i === index ? COLORS.selected : 0xffffff);
    });
    const { box } = this.buttons[index];
    this.tweens.add({ targets: box, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  // Starting over loses everything, so ask first.
  askNewGame() {
    play(this, 'nope');
    const panel = this.add.rectangle(WIDTH / 2, 140, 300, 150, 0x1b1630, 0.92).setStrokeStyle(3, 0xff9fc8);
    const question = this.add
      .text(WIDTH / 2, 100, 'Wirklich neu anfangen?', { ...TEXT, fontSize: '18px' })
      .setOrigin(0.5)
      .setResolution(4);
    const info = this.add
      .text(WIDTH / 2, 132, 'Deine Münzen, Drachen und Inseln\nsind dann weg!', {
        ...TEXT,
        fontSize: '11px',
        align: 'center',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setResolution(4);
    this.dialog = this.add.container(0, 0, [panel, question, info]).setDepth(10);
    this.setButtons([
      { label: 'Nein', x: WIDTH / 2 - 66, y: 180, width: 110, height: DIALOG_BUTTON_HEIGHT, color: COLORS.main, depth: 11, action: () => this.closeDialog() },
      { label: 'Ja, neu!', x: WIDTH / 2 + 66, y: 180, width: 110, height: DIALOG_BUTTON_HEIGHT, color: COLORS.danger, depth: 11, action: () => this.startNewGame() },
    ]);
  }

  closeDialog() {
    play(this, 'click');
    this.dialog.destroy();
    this.dialog = null;
    this.showMenu();
  }

  startNewGame() {
    this.save = resetSave();
    this.go('map');
  }

  // Hilfe, Einstellungen, Drachen-Galerie, Mitwirkende: shown on top while the menu waits.
  openPage(key, data) {
    play(this, 'click');
    this.scene.pause();
    this.scene.launch(key, data ?? {});
  }

  go(scene) {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'start');
    writeSave(this.save);
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, {}));
  }
}
