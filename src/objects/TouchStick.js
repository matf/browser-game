import Phaser from 'phaser';
import { HEIGHT, WIDTH } from '../view.js';
import { IS_TOUCH } from '../touch.js';

const RADIUS = 38; // size of the joystick ring, in pixels (the knob moves this far)
const KNOB = 16; // size of the knob you push around
const DEAD_ZONE = 0.15; // tiny thumb movements near the middle are ignored
export const STICK_HOME = { x: 72, y: 180 }; // where the joystick waits when no thumb is on it
const MARGIN = 6; // the ring always stays this far inside the screen

// A joystick for phones. It always shows at STICK_HOME. Put your thumb anywhere on the left half
// of the screen (even on the dark border next to the game) and slide it; the joystick jumps under
// your thumb and goes back home when you let go. x and y go from -1 to 1, like the arrow keys.
//
// It reads the browser's touch events itself, because Phaser ignores touches outside the canvas.
export class TouchStick {
  constructor(scene) {
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.touchId = null;
    if (!IS_TOUCH) return; // computers use the keyboard

    this.base = scene.add.circle(0, 0, RADIUS, 0xffffff, 0.15).setStrokeStyle(3, 0xffffff, 0.6);
    this.knob = scene.add.circle(0, 0, KNOB, 0xffffff, 0.55).setStrokeStyle(2, 0x1b1630, 0.3);
    for (const g of [this.base, this.knob]) g.setDepth(20).setScrollFactor(0);
    this.goHome();

    const page = document.getElementById('game');
    const handlers = {
      touchstart: (e) => this.onStart(e),
      touchmove: (e) => this.onMove(e),
      touchend: (e) => this.onEnd(e),
      touchcancel: (e) => this.onEnd(e),
    };
    for (const [type, fn] of Object.entries(handlers)) page.addEventListener(type, fn);
    scene.events.once('shutdown', () => {
      for (const [type, fn] of Object.entries(handlers)) page.removeEventListener(type, fn);
    });
  }

  // Browser page coordinates -> game pixels (can be outside 0..WIDTH on the dark border).
  toGame(touch) {
    const r = this.scene.game.canvas.getBoundingClientRect();
    return {
      x: ((touch.clientX - r.left) / r.width) * WIDTH,
      y: ((touch.clientY - r.top) / r.height) * HEIGHT,
    };
  }

  goHome() {
    this.base.setPosition(STICK_HOME.x, STICK_HOME.y).setAlpha(0.7);
    this.knob.setPosition(STICK_HOME.x, STICK_HOME.y).setAlpha(0.7);
  }

  onStart(e) {
    if (this.touchId !== null || !this.scene.sys.isActive()) return;
    for (const touch of e.changedTouches) {
      const p = this.toGame(touch);
      if (p.x > WIDTH / 2) continue;
      this.touchId = touch.identifier;
      this.start = p; // pushing is measured from where the thumb first landed
      // Under the thumb, but never partly off screen.
      const cx = Phaser.Math.Clamp(p.x, RADIUS + MARGIN, WIDTH / 2);
      const cy = Phaser.Math.Clamp(p.y, RADIUS + MARGIN, HEIGHT - RADIUS - MARGIN);
      this.base.setPosition(cx, cy).setAlpha(1);
      this.knob.setPosition(cx, cy).setAlpha(1);
      return;
    }
  }

  onMove(e) {
    const touch = [...e.changedTouches].find((t) => t.identifier === this.touchId);
    if (!touch) return;
    const p = this.toGame(touch);
    const dx = p.x - this.start.x;
    const dy = p.y - this.start.y;
    const len = Math.min(Math.hypot(dx, dy), RADIUS);
    const angle = Math.atan2(dy, dx);
    this.knob.setPosition(this.base.x + Math.cos(angle) * len, this.base.y + Math.sin(angle) * len);
    const strength = len / RADIUS < DEAD_ZONE ? 0 : len / RADIUS;
    this.x = Math.cos(angle) * strength;
    this.y = Math.sin(angle) * strength;
  }

  onEnd(e) {
    if (![...e.changedTouches].some((t) => t.identifier === this.touchId)) return;
    this.touchId = null;
    this.x = 0;
    this.y = 0;
    this.goHome();
  }
}
