import { TILE } from './scenes/PreloadScene.js';
import { MAX_HEARTS } from './shop.js';

// The hearts and coins in the top corners, shared by the level HUD and the world map.

// Hearts in the top left. Returns a function that shows a new number of hearts.
export function addHearts(scene) {
  const icons = Array.from({ length: MAX_HEARTS }, (_, i) => scene.add.image(14 + i * 20, 14, 'tiles'));
  return (hearts) => icons.forEach((h, i) => h.setFrame(i < hearts ? TILE.heartFull : TILE.heartEmpty));
}

// Coin count in the top right, drawn with the pixel digits from the Kenney tilesheet. Returns a
// function that shows a new number of coins.
export function addCoins(scene) {
  scene.add.image(400, 14, 'tiles', TILE.coin);
  let digits = [];
  return (coins) => {
    for (const d of digits) d.destroy();
    digits = [...String(coins)].map((ch, i) => scene.add.image(418 + i * 11, 14, 'tiles', TILE.digit0 + Number(ch)));
  };
}
