# Browser Game

A 2D browser game built with Phaser 4 and Vite.

## Run locally

```sh
npm install
npm run dev
```

Then open the URL Vite prints (this project uses http://localhost:5174 by convention).

## Play online

Every push to `main` is built and published to GitHub Pages by `.github/workflows/pages.yml`:
https://matf.github.io/browser-game/

## Layout

- `src/main.js`: Phaser config
- `src/scenes/`: Preload, Game and UI scenes
- `src/objects/`: one class per game object
- `public/assets/`: images, maps and sounds loaded at runtime

## Credits

No third-party assets yet.
