import Phaser from 'phaser';
import { FONT } from '../view.js';
import { onIslandGround } from '../world.js';

const WALK_SPEED = 35; // how fast dragons stroll around their house, in pixels per second
const ROAM = 70; // how far from its house a dragon goes, in pixels
const EDGE = 12; // keep this far from the beach edge
const HOME_CHANCE = 0.3; // after a walk, how likely the dragon goes into its house for a while
const INSIDE_MS = [3000, 7000]; // how long it stays inside (shortest, longest)
const REST_MS = [800, 2600]; // how long it stands still between walks
export const RESIDENT_SCALE = 0.45; // size of a dragon living on the island

const TEXT = { fontFamily: FONT, fontStyle: 'bold', color: '#ffffff', stroke: '#1b1630', strokeThickness: 3 };

// One of your dragons living in a house: it strolls around near its house and sometimes goes in.
// look: { key, name, anim, tint, scale }; home: { x, y } of the house's door on its island; left: x
// of that island in the world. With goesInside false (babies at the nest), it only strolls around.
export class Resident {
  constructor(scene, look, home, left, { goesInside = true } = {}) {
    this.scene = scene;
    this.look = look;
    this.scale = look.scale ?? RESIDENT_SCALE;
    this.goesInside = goesInside;
    this.home = home;
    this.left = left;
    this.pos = { x: home.x, y: home.y + 4 };
    this.target = null;
    this.shadow = scene.add.ellipse(0, 0, 40 * this.scale, 5, 0x1b1630, 0.25);
    this.sprite = scene.add.sprite(0, 0, 'dragons').play(look.anim).setScale(this.scale);
    if (look.tint !== undefined) this.sprite.setTint(look.tint);
    this.sprite.anims.setProgress(Math.random());
    this.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.tapResident(this));
    this.phase = Math.random() * 1000;
    this.rest();
  }

  update(time, delta) {
    if (this.target && !this.inside) {
      const dx = this.target.x - this.pos.x;
      const dy = this.target.y - this.pos.y;
      const length = Math.hypot(dx, dy);
      const step = (WALK_SPEED * delta) / 1000;
      if (length <= step) {
        Object.assign(this.pos, this.target);
        this.target = null;
        this.arrived();
      } else {
        this.pos.x += (dx / length) * step;
        this.pos.y += (dy / length) * step;
        if (Math.abs(dx) > 0.5) this.sprite.setFlipX(dx < 0);
      }
    }
    const x = this.left + this.pos.x;
    const hover = 18 * this.scale + Math.sin((time + this.phase) / 260) * 1.2;
    this.shadow.setPosition(x, this.pos.y).setDepth(this.pos.y - 1);
    this.sprite.setPosition(x, this.pos.y - hover).setDepth(this.pos.y);
    this.bubble?.setPosition(x, this.pos.y - 30);
  }

  // Stand still a moment, then go somewhere.
  rest() {
    this.scene.time.delayedCall(Phaser.Math.Between(...REST_MS), () => this.next());
  }

  next() {
    if (!this.sprite.active) return;
    if (this.goesInside && Math.random() < HOME_CHANCE) {
      this.goingHome = true;
      this.target = { x: this.home.x, y: this.home.y + 4 };
      return;
    }
    // A random spot near the house that is on the island.
    for (let tries = 0; tries < 20; tries++) {
      const x = this.home.x + Phaser.Math.Between(-ROAM, ROAM);
      const y = this.home.y + Phaser.Math.Between(-ROAM / 2, ROAM / 2);
      if (onIslandGround(x, y, EDGE)) {
        this.target = { x, y };
        return;
      }
    }
    this.rest();
  }

  arrived() {
    if (!this.goingHome) return this.rest();
    // In through the door, and out again a bit later.
    this.goingHome = false;
    this.inside = true;
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, scale: '*=0.6', duration: 300 });
    this.scene.time.delayedCall(Phaser.Math.Between(...INSIDE_MS), () => {
      if (!this.sprite.active) return;
      this.scene.tweens.add({ targets: this.sprite, alpha: 1, scale: this.scale, duration: 300 });
      this.scene.tweens.add({ targets: this.shadow, alpha: 1, scale: 1, duration: 300 });
      this.inside = false;
      this.rest();
    });
  }

  // Its name (or `text`) pops up over it for a moment, for example when it's tapped.
  say(text = this.look.name) {
    if (this.inside) return;
    this.bubble?.destroy();
    this.bubble = this.scene.add
      .text(0, 0, text, { ...TEXT, fontSize: '10px', color: '#ffe066' })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(900);
    const bubble = this.bubble;
    this.scene.tweens.add({ targets: bubble, alpha: 0, delay: 1800, duration: 400, onComplete: () => bubble.destroy() });
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.bubble?.destroy();
  }
}
