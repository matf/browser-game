import Phaser from 'phaser';
import { FONT, HEIGHT, WIDTH, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { play } from '../sound.js';

export const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };
export const COLORS = { background: 0x2b2140, card: 0x4a3a6e, back: 0x5fd068, selected: 0xffd84a };

const BACK_BUTTON = { y: 250, width: 120, height: 24 };

// A button: a box with a label. Tapping it calls onPress. Returns the container; its box is `.bg`.
export function addButton(scene, x, y, label, onPress, { width = 120, height = 24, color = COLORS.card, dark = false } = {}) {
  const bg = scene.add
    .rectangle(0, 0, width, height, color)
    .setStrokeStyle(2, 0xffffff)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', onPress);
  const text = scene.add
    .text(0, 0, label, { ...TEXT, fontSize: '13px', color: dark ? '#1b1630' : '#ffffff', strokeThickness: dark ? 0 : 3 })
    .setOrigin(0.5)
    .setResolution(4);
  const button = scene.add.container(x, y, [bg, text]);
  button.bg = bg;
  return button;
}

// A page of the main menu (Einstellungen, Drachen-Galerie, Mitwirkende). It shows over the paused
// title screen and goes back to it with the "Zurück" button, Esc or Enter.
export class MenuPage extends Phaser.Scene {
  // Draw the background, the page title and the back button. Call first in create().
  openPage(title, backLabel = '◀ Zurück') {
    setupCamera(this);
    this.closing = false;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.background).setOrigin(0);
    this.add.text(WIDTH / 2, 22, title, { ...TEXT, fontSize: '22px', color: '#ffe066', strokeThickness: 4 }).setOrigin(0.5).setResolution(4);

    const back = addButton(this, WIDTH / 2, BACK_BUTTON.y, backLabel, () => this.close(), {
      width: BACK_BUTTON.width,
      height: BACK_BUTTON.height,
      color: COLORS.back,
      dark: true,
    });
    this.tweens.add({ targets: back, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (!IS_TOUCH) {
      this.add.text(WIDTH - 8, BACK_BUTTON.y, 'Esc oder Enter: zurück', { ...TEXT, fontSize: '9px' }).setOrigin(1, 0.5).setResolution(4);
    }
    // A short wait, so the Enter that opened the page doesn't close it right away.
    this.time.delayedCall(200, () => {
      for (const key of ['ESC', 'BACKSPACE', 'ENTER', 'SPACE']) this.input.keyboard.on(`keydown-${key}`, () => this.close());
    });
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    play(this, 'click');
    this.scene.stop();
    this.scene.resume('title');
  }
}
