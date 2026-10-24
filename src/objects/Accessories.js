import { ACCESSORIES } from '../shop.js';
import { ACCESSORY_ART, ACCESSORY_CELL } from '../scenes/PreloadScene.js';

// Where things sit on a dragon, in pixels inside one 67x52 frame. All five dragons share the same
// body shape; only the flying frame (0, 1 or 2) changes the positions.
const EYE = [[57, 13], [58, 16], [56, 14]];
const FRONT_PAW = [[51, 42], [53, 46], [52, 44]];
const BACK_PAW = [[23, 41], [23, 45], [22, 43]];

function anchors(col) {
  const [ex, ey] = EYE[col];
  return {
    head: [[ex - 3, ey - 3]],
    eyes: [[ex, ey]],
    neck: [[ex - 5, ey + 9]],
    paws: [FRONT_PAW[col], BACK_PAW[col]],
    body: [[ex - 29, ey + 16], [ex - 23, ey + 17], [ex - 17, ey + 16]],
  };
}

// The accessories a dragon is wearing. Call update() after the dragon has moved.
export class Accessories {
  constructor(scene, dragon, worn) {
    this.dragon = dragon;
    this.parts = [];
    for (const key of worn) {
      const item = ACCESSORIES.find((a) => a.key === key);
      if (!item) continue;
      if (item.slot === 'glitter') {
        this.trail = scene.add.particles(0, 0, 'pixel', {
          follow: dragon,
          followOffset: { x: -12 * dragon.scaleX, y: 4 * dragon.scaleY },
          lifespan: 600,
          speedX: { min: -60, max: -20 },
          speedY: { min: -15, max: 15 },
          scale: { start: 1.2 * dragon.scaleX, end: 0 },
          tint: [0xffffff, 0xffe066, 0xff9fd0, 0xb8e8ff],
          frequency: 40,
        });
        continue;
      }
      const art = ACCESSORY_ART[key];
      anchors(0)[item.slot].forEach((_, i) => {
        const img = scene.add
          .image(0, 0, 'accessories', art.frame)
          .setOrigin((art.ax + 0.5) / ACCESSORY_CELL.width, (art.ay + 0.5) / ACCESSORY_CELL.height);
        this.parts.push({ img, slot: item.slot, i });
      });
    }
    this.update();
  }

  update() {
    const d = this.dragon;
    const points = anchors(Number(d.frame.name) % 3);
    const cos = Math.cos(d.rotation);
    const sin = Math.sin(d.rotation);
    for (const { img, slot, i } of this.parts) {
      const [fx, fy] = points[slot][i];
      const ox = (fx + 0.5 - d.width / 2) * d.scaleX;
      const oy = (fy + 0.5 - d.height / 2) * d.scaleY;
      img
        .setPosition(d.x + ox * cos - oy * sin, d.y + ox * sin + oy * cos)
        .setScale(d.scaleX, d.scaleY)
        .setRotation(d.rotation)
        .setDepth(d.depth + 0.1)
        .setAlpha(d.alpha);
    }
    if (this.trail) this.trail.setDepth(d.depth - 0.1);
  }

  destroy() {
    for (const { img } of this.parts) img.destroy();
    this.trail?.destroy();
    this.parts = [];
  }
}
