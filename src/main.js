import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { HelpScene } from './scenes/HelpScene.js';
import { watchOrientation } from './touch.js';
import { HEIGHT, WIDTH, ZOOM } from './view.js';

function startGame() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WIDTH * ZOOM,
    height: HEIGHT * ZOOM,
    pixelArt: true,
    backgroundColor: '#8fd3f4',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 }, // several fingers at once on phones
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false }, // no gravity: the dragons fly freely
    },
    scene: [PreloadScene, GameScene, UIScene, ShopScene, HelpScene],
  });

  watchOrientation(game);

  // Handy for poking at the game from the browser console (and for automated testing).
  if (import.meta.env.DEV) window.game = game;
}

// Wait for the font, otherwise the first texts are drawn in a fallback font.
document.fonts.load('bold 16px Fredoka').finally(startGame);
