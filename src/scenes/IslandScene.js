import Phaser from 'phaser';
import { Accessories } from '../objects/Accessories.js';
import { loadSave } from '../save.js';
import { FONT, WIDTH, HEIGHT, ZOOM, setupCamera } from '../view.js';
import { IS_TOUCH } from '../touch.js';
import { addMuteButton, play, startMusic } from '../sound.js';
import { addCoins } from '../hud.js';
import { ISLANDS, LEVELS_PER_ISLAND, isOpen, onIslandGround } from '../world.js';

const WALK_SPEED = 80; // how fast your dragon walks on the island, in pixels per second
const DRAGON_SCALE = 0.5; // size of the dragon on the island (1 = as big as in the levels)
const EDGE = 12; // the dragon stays this many pixels away from the beach edge
const SWIPE = 50; // how far a finger has to swipe to get to the next island, in pixels
const DRAG_START = 8; // a finger that moves less than this is a tap, not a swipe
const SWITCH_MS = 500; // how long the trip to the next island takes

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// The island view: one big island at a time, side by side. Swipe (or the arrows) to get to the next
// island; tap somewhere and your dragon walks there.
export class IslandScene extends Phaser.Scene {
  constructor() {
    super('island');
  }

  // data.island: which island to show first (index in ISLANDS).
  create(data) {
    setupCamera(this);
    startMusic(this);
    this.save = loadSave();
    this.leaving = false;
    // Only islands that are open on the map, in map order.
    this.islands = ISLANDS.filter((_, i) => isOpen(this.save, i * LEVELS_PER_ISLAND));
    this.index = Math.max(0, this.islands.indexOf(ISLANDS[data?.island ?? 0]));
    this.islands.forEach((island, i) => this.add.image(i * WIDTH, 0, `island-${island.theme}`).setOrigin(0));
    // No camera bounds: they don't work with the zoomed camera, so scrolling is clamped by hand.
    this.cameras.main.scrollX = this.index * WIDTH;

    // Your dragon, with a little shadow on the ground. pos is its spot on the current island.
    this.pos = { x: WIDTH / 2, y: 170 };
    this.target = null;
    this.shadow = this.add.ellipse(0, 0, 22, 6, 0x1b1630, 0.25);
    this.dragon = this.add.sprite(0, 0, 'dragons').play(`${this.save.dragon}-fly`).setScale(DRAGON_SCALE);
    this.accessories = new Accessories(this, this.dragon, this.save.wear);

    this.addHud();
    this.addInput();
    this.showIsland();
    this.cameras.main.fadeIn(250);
  }

  update(time, delta) {
    this.walk(delta / 1000);
    const x = this.index * WIDTH + this.pos.x + (this.trip?.offset ?? 0);
    const hover = 10 + Math.sin(time / 260) * 1.5;
    this.shadow.setPosition(x, this.pos.y).setDepth(this.pos.y - 1);
    this.dragon.setPosition(x, this.pos.y - hover).setDepth(this.pos.y);
    this.accessories.update();
  }

  // --- On screen ----------------------------------------------------------------------------

  addHud() {
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(1000);
    // The coins and the speaker don't know about scrolling, so pin everything they add.
    const before = this.children.list.length;
    addCoins(this)(this.save.coins);
    addMuteButton(this, 466, 14);
    this.children.list.slice(before).forEach(fixed);
    fixed(
      this.add
        .image(372, 14, 'map-icon')
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.toMap()),
    );
    this.title = fixed(this.add.text(WIDTH / 2, 16, '', { ...TEXT, fontSize: '16px', strokeThickness: 4 }).setOrigin(0.5).setResolution(4));
    const hint = IS_TOUCH ? 'Tippen: hinlaufen   Wischen: nächste Insel' : 'Pfeile: laufen   Q / E: andere Insel   Esc: Karte';
    fixed(this.add.text(WIDTH / 2, HEIGHT - 8, hint, { ...TEXT, fontSize: '8px' }).setOrigin(0.5).setResolution(4));

    // Arrows to the islands left and right, and a dot for each island.
    this.arrows = [-1, 1].map((dir) => {
      const arrow = fixed(
        this.add
          .text(dir < 0 ? 14 : WIDTH - 14, HEIGHT / 2, dir < 0 ? '◀' : '▶', { ...TEXT, fontSize: '22px', strokeThickness: 4 })
          .setOrigin(0.5)
          .setResolution(4)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', (pointer, x, y, event) => {
            event.stopPropagation();
            this.go(this.index + dir);
          }),
      );
      this.tweens.add({ targets: arrow, x: arrow.x + dir * 3, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      return arrow;
    });
    this.dots = this.islands.map((_, i) =>
      fixed(this.add.circle(WIDTH / 2 + (i - (this.islands.length - 1) / 2) * 10, HEIGHT - 20, 3, 0xffffff)),
    );
  }

  // Name, arrows and dots for the island you're on.
  showIsland() {
    this.title.setText(this.islands[this.index].name);
    this.arrows[0].setVisible(this.index > 0);
    this.arrows[1].setVisible(this.index < this.islands.length - 1);
    this.dots.forEach((dot, i) => dot.setFillStyle(i === this.index ? 0xffd84a : 0xffffff, i === this.index ? 1 : 0.6));
  }

  // --- Input ----------------------------------------------------------------------------------

  addInput() {
    const camera = this.cameras.main;
    // A finger (or the mouse) that moves sideways drags the islands; a short tap walks there.
    this.input.on('pointerdown', (pointer) => {
      if (this.trip) return;
      this.drag = { startX: pointer.x, scrollX: camera.scrollX, moving: false };
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.drag || !pointer.isDown) return;
      const dx = (pointer.x - this.drag.startX) / camera.zoom;
      if (Math.abs(dx) > DRAG_START) this.drag.moving = true;
      if (this.drag.moving) camera.scrollX = Phaser.Math.Clamp(this.drag.scrollX - dx, 0, (this.islands.length - 1) * WIDTH);
    });
    this.input.on('pointerup', (pointer) => {
      const drag = this.drag;
      this.drag = null;
      if (!drag || this.trip) return;
      if (!drag.moving) {
        return this.walkTo(pointer.x / ZOOM, pointer.y / ZOOM);
      }
      const dx = (pointer.x - drag.startX) / camera.zoom;
      this.go(this.index + (dx < -SWIPE ? 1 : dx > SWIPE ? -1 : 0), true);
    });

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S');
    this.input.keyboard.on('keydown-Q', () => this.go(this.index - 1));
    this.input.keyboard.on('keydown-E', () => this.go(this.index + 1));
    this.input.keyboard.on('keydown-ESC', () => this.toMap());
  }

  // --- Moving around --------------------------------------------------------------------------

  walkTo(x, y) {
    if (!onIslandGround(x, y + 4, EDGE)) return; // in the water: stay
    this.target = { x, y: y + 4 };
  }

  // Arrow keys walk directly; otherwise walk towards the tapped spot. Never into the water.
  walk(seconds) {
    if (this.trip) return;
    const k = this.keys;
    let dx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let dy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (dx || dy) {
      this.target = null;
    } else if (this.target) {
      dx = this.target.x - this.pos.x;
      dy = this.target.y - this.pos.y;
      if (Math.hypot(dx, dy) < 2) {
        this.target = null;
        return;
      }
    } else {
      return;
    }
    const length = Math.hypot(dx, dy);
    const step = Math.min(WALK_SPEED * seconds, this.target ? length : Infinity);
    const nx = this.pos.x + (dx / length) * step;
    const ny = this.pos.y + (dy / length) * step;
    // Slide along the beach instead of stopping when only one direction is blocked.
    if (onIslandGround(nx, ny, EDGE)) Object.assign(this.pos, { x: nx, y: ny });
    else if (onIslandGround(nx, this.pos.y, EDGE)) this.pos.x = nx;
    else if (onIslandGround(this.pos.x, ny, EDGE)) this.pos.y = ny;
    else this.target = null;
    if (Math.abs(dx) > 0.5) this.dragon.setFlipX(dx < 0);
  }

  // Go to another island (or, with `snap`, back to this one after a short swipe). The camera glides
  // over and your dragon flies along.
  go(index, snap = false) {
    if (this.trip || this.leaving) return;
    if (index < 0 || index >= this.islands.length) {
      if (!snap) return play(this, 'nope');
      index = this.index;
    }
    const camera = this.cameras.main;
    const dir = index - this.index;
    if (dir) {
      play(this, 'click');
      this.dragon.setFlipX(dir < 0);
    }
    this.target = null;
    // While travelling, the dragon is drawn `offset` pixels away from its island.
    this.trip = { offset: 0 };
    this.tweens.add({ targets: this.trip, offset: dir * WIDTH, duration: SWITCH_MS, ease: 'Sine.InOut' });
    this.tweens.add({
      targets: camera,
      scrollX: index * WIDTH,
      duration: dir ? SWITCH_MS : 200,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.index = index;
        this.trip = null;
        this.showIsland();
      },
    });
  }

  toMap() {
    if (this.leaving) return;
    this.leaving = true;
    play(this, 'click');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', {}));
  }
}
