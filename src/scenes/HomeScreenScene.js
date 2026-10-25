import { IS_IOS, canInstallNow, installNow, markHomeHintSeen } from '../install.js';
import { play } from '../sound.js';
import { WIDTH } from '../view.js';
import { MenuPage, TEXT, addButton } from './MenuPage.js';

const STEPS = { x: 112, y: 104, gap: 42 }; // the numbered steps: icon x, first row y, rows apart
const BLUE = 0x3a8cff; // the colour of the browser's buttons in the little pictures

// Shown once, the first time the game is opened on a phone or tablet in the browser: how to put it
// on the home screen, so it starts like an app, full screen.
export class HomeScreenScene extends MenuPage {
  constructor() {
    super('homescreen');
  }

  create() {
    markHomeHintSeen();
    this.openPage('Spiel wie eine App!', 'Alles klar!');
    this.add
      .text(WIDTH / 2, 56, 'Leg Dragon Flight auf deinen Home-Bildschirm.\nDann startet es wie eine App, im Vollbild!', {
        ...TEXT,
        fontSize: '12px',
        align: 'center',
        lineSpacing: -2,
      })
      .setOrigin(0.5)
      .setResolution(4);

    if (!IS_IOS && canInstallNow()) {
      // Android Chrome can do it with one tap.
      addButton(this, WIDTH / 2, 140, 'Jetzt installieren', () => this.install(), { width: 170, height: 32, color: 0xffd84a, dark: true });
      this.add.text(WIDTH / 2, 178, 'Oder später, im Browser-Menü (drei Punkte)', { ...TEXT, fontSize: '10px' }).setOrigin(0.5).setResolution(4);
      return;
    }
    const steps = IS_IOS
      ? [
          [this.shareIcon(), 'Tippe in Safari auf „Teilen“.\n(Manchmal ist es unter „…“ versteckt.)'],
          [this.plusIcon(), 'Wähle „Zum Home-Bildschirm“.'],
          [this.appIcon(), 'Starte das Spiel mit dem Drachen!'],
        ]
      : [
          [this.menuIcon(), 'Tippe oben rechts im Browser\nauf die drei Punkte.'],
          [this.plusIcon(), 'Wähle „Zum Startbildschirm hinzufügen“\noder „App installieren“.'],
          [this.appIcon(), 'Starte das Spiel mit dem Drachen!'],
        ];
    steps.forEach(([icon, words], i) => {
      const y = STEPS.y + i * STEPS.gap;
      this.add.text(STEPS.x - 30, y, `${i + 1}.`, { ...TEXT, fontSize: '14px', color: '#ffe066' }).setOrigin(0.5).setResolution(4);
      icon.setPosition(STEPS.x, y);
      this.add.text(STEPS.x + 24, y, words, { ...TEXT, fontSize: '11px', lineSpacing: -3 }).setOrigin(0, 0.5).setResolution(4);
    });
  }

  async install() {
    play(this, 'click');
    if (await installNow()) this.close();
  }

  // A white button like the browser's, with a little picture drawn on it.
  browserButton(paint) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff).fillRoundedRect(-11, -11, 22, 22, 5);
    g.lineStyle(2, BLUE);
    paint(g);
    return g;
  }

  // Safari's share button: a box with an arrow pointing up out of it.
  shareIcon() {
    return this.browserButton((g) => {
      g.strokeRect(-5, -2, 10, 9);
      g.fillStyle(0xffffff).fillRect(-2, -3, 4, 3);
      g.lineBetween(0, -8, 0, 3).lineBetween(-3, -5, 0, -8).lineBetween(3, -5, 0, -8);
    });
  }

  // "Zum Home-Bildschirm": a plus in a rounded box.
  plusIcon() {
    return this.browserButton((g) => {
      g.strokeRoundedRect(-6, -6, 12, 12, 3);
      g.lineBetween(0, -3, 0, 3).lineBetween(-3, 0, 3, 0);
    });
  }

  // The browser menu on Android: three dots one above the other.
  menuIcon() {
    return this.browserButton((g) => {
      g.fillStyle(0x444444);
      for (const y of [-5, 0, 5]) g.fillCircle(0, y, 1.6);
    });
  }

  // The game's icon on the home screen.
  appIcon() {
    const box = this.add.graphics();
    box.fillStyle(0x8fd3f4).fillRoundedRect(-11, -11, 22, 22, 5);
    box.fillStyle(0x5fd068).fillRoundedRect(-11, 4, 22, 7, { tl: 0, tr: 0, bl: 5, br: 5 });
    const dragon = this.add.image(0, -1, 'dragons', 0).setScale(0.3);
    return this.add.container(0, 0, [box, dragon]);
  }
}
