import { DRAGONS } from './scenes/PreloadScene.js';
import { growth, hatchlingLook } from './hatchery.js';

// Any of your dragons, by its key: a dragon from the shop ('chili') or one that hatched on the
// Brutinsel ('hatchling-<id>'). Returns { key, name, anim, tint, shot }: tint is undefined for shop
// dragons, shot is the SHOTS key (src/objects/Shooter.js) of what it spits.
export function dragonLook(save, key = save.dragon) {
  const hatchling = save.hatchlings.find((h) => `hatchling-${h.id}` === key);
  if (hatchling) return { ...hatchlingLook(hatchling), shot: hatchling.shot ?? 'marshmallow' };
  const dragon = DRAGONS.find((d) => d.key === key) ?? DRAGONS[0];
  return { key: dragon.key, name: dragon.name, anim: `${dragon.key}-fly`, shot: dragon.key };
}

// Make a sprite look like this dragon (its animation and colour).
export function showDragon(sprite, look) {
  sprite.play(look.anim);
  if (look.tint === undefined) sprite.clearTint();
  else sprite.setTint(look.tint);
  return sprite;
}

// Hatchlings that are grown up and can fly with you.
export function grownHatchlings(save) {
  return save.hatchlings.filter((h) => growth(h) >= 1);
}
