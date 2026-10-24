import { MenuPage, TEXT, COLORS, addButton } from './MenuPage.js';
import { WIDTH } from '../view.js';
import { VOLUME_STEPS, addMuteButton, getVolume, isMuted, play, setVolume } from '../sound.js';

const ROW = { y: 82, gap: 50, labelX: 70 }; // first row at y, the next one gap pixels lower
const BAR = { x: 222, width: 22, height: 16, gap: 4 }; // the volume blocks, the first one at x
const STEP_BUTTON = 24; // size of the - and + buttons

// Einstellungen: how loud the music and the sound effects are.
export class SettingsScene extends MenuPage {
  constructor() {
    super('settings');
  }

  create() {
    this.openPage('Einstellungen');
    addMuteButton(this, 466, 14);

    this.rows = [
      { kind: 'music', label: 'Musik', icon: '♪' },
      { kind: 'sfx', label: 'Geräusche', icon: '★' },
    ].map((row, i) => this.addRow(row, ROW.y + i * ROW.gap));
    this.selected = 0;
    this.select(0);

    this.mutedNote = this.add
      .text(WIDTH / 2, 190, 'Der Ton ist gerade ganz aus.\nTippe oben rechts auf den Lautsprecher!', {
        ...TEXT,
        fontSize: '11px',
        color: '#ff9fc8',
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(4);
    const showMuted = () => this.mutedNote.setVisible(isMuted());
    showMuted();
    this.sound.on('dragonmute', showMuted);
    this.events.once('shutdown', () => this.sound.off('dragonmute', showMuted));

    this.input.keyboard.on('keydown-UP', () => this.select(this.selected - 1));
    this.input.keyboard.on('keydown-DOWN', () => this.select(this.selected + 1));
    this.input.keyboard.on('keydown-LEFT', () => this.change(this.rows[this.selected], -1));
    this.input.keyboard.on('keydown-RIGHT', () => this.change(this.rows[this.selected], +1));
  }

  // One line: name, a minus button, the volume blocks and a plus button.
  addRow(row, y) {
    row.frame = this.add.rectangle(WIDTH / 2, y, 380, 40, COLORS.card).setStrokeStyle(2, 0xffffff);
    this.add.text(ROW.labelX, y, `${row.icon}  ${row.label}`, { ...TEXT, fontSize: '15px' }).setOrigin(0, 0.5).setResolution(4);
    const lastBarX = BAR.x + (VOLUME_STEPS - 1) * (BAR.width + BAR.gap);
    const stepOptions = { width: STEP_BUTTON, height: STEP_BUTTON };
    addButton(this, BAR.x - BAR.width, y, '–', () => this.change(row, -1), stepOptions);
    addButton(this, lastBarX + BAR.width, y, '+', () => this.change(row, +1), stepOptions);
    // Tapping a block sets the volume right there.
    row.bars = Array.from({ length: VOLUME_STEPS }, (_, i) =>
      this.add
        .rectangle(BAR.x + i * (BAR.width + BAR.gap), y, BAR.width, BAR.height)
        .setStrokeStyle(2, 0x1b1630)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.change(row, i + 1 - getVolume(row.kind))),
    );
    this.showVolume(row);
    return row;
  }

  showVolume(row) {
    const step = getVolume(row.kind);
    row.bars.forEach((bar, i) => bar.setFillStyle(i < step ? COLORS.selected : 0x2b2140));
  }

  select(index) {
    if (index < 0 || index >= this.rows.length) return;
    this.selected = index;
    this.rows.forEach((row, i) => row.frame.setStrokeStyle(i === index ? 3 : 2, i === index ? COLORS.selected : 0xffffff));
  }

  change(row, by) {
    this.select(this.rows.indexOf(row));
    const before = getVolume(row.kind);
    setVolume(row.kind, before + by);
    if (getVolume(row.kind) === before) return play(this, 'nope');
    this.showVolume(row);
    // The music is playing anyway; for the sound effects, play one so you hear how loud they are.
    if (row.kind === 'sfx') play(this, 'coin');
  }
}
