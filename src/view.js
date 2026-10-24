// The game world is 480x270 pixels of pixel art, but the canvas is ZOOM times bigger and every
// camera zooms in. Pixel art looks the same, while text is drawn sharp instead of blocky.
export const WIDTH = 480;
export const HEIGHT = 270;
export const ZOOM = 4;

export const FONT = 'Fredoka, sans-serif'; // public/assets/fonts/Fredoka.ttf, loaded in style.css

export function setupCamera(scene) {
  scene.cameras.main.setOrigin(0, 0).setZoom(ZOOM);
}
