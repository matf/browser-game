import { WIDTH, ZOOM } from '../view.js';

const RADIUS = 28; // how far the knob can move from the middle, in pixels
const DEAD_ZONE = 0.15; // tiny thumb movements near the middle are ignored

// A joystick for phones: put your thumb anywhere on the left half of the screen and slide it.
// x and y go from -1 to 1, like the arrow keys but with in-between values.
export class TouchStick {
  constructor(scene) {
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.pointer = null;
    this.base = scene.add.circle(0, 0, RADIUS, 0xffffff, 0.2).setStrokeStyle(2, 0xffffff, 0.5);
    this.knob = scene.add.circle(0, 0, 12, 0xffffff, 0.6);
    for (const g of [this.base, this.knob]) g.setDepth(20).setScrollFactor(0).setVisible(false);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
    });
  }

  onDown(pointer) {
    const x = pointer.x / ZOOM; // screen pixels -> game pixels
    const y = pointer.y / ZOOM;
    if (this.pointer || !pointer.wasTouch || x > WIDTH / 2) return;
    this.pointer = pointer;
    this.base.setPosition(x, y).setVisible(true);
    this.knob.setPosition(x, y).setVisible(true);
  }

  onMove(pointer) {
    if (pointer !== this.pointer) return;
    const dx = pointer.x / ZOOM - this.base.x;
    const dy = pointer.y / ZOOM - this.base.y;
    const len = Math.min(Math.hypot(dx, dy), RADIUS);
    const angle = Math.atan2(dy, dx);
    this.knob.setPosition(this.base.x + Math.cos(angle) * len, this.base.y + Math.sin(angle) * len);
    const strength = len / RADIUS < DEAD_ZONE ? 0 : len / RADIUS;
    this.x = Math.cos(angle) * strength;
    this.y = Math.sin(angle) * strength;
  }

  onUp(pointer) {
    if (pointer !== this.pointer) return;
    this.pointer = null;
    this.x = 0;
    this.y = 0;
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }
}
