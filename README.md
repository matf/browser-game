# Dragon Flight

A 2D browser game built with Phaser 4 and Vite: fly cute dragons, dodge obstacles, collect coins.

## Run locally

```sh
npm install
npm run dev
```

Then open the URL Vite prints (this project uses http://localhost:5174 by convention).

## Play online

Every push to `main` is built and published to GitHub Pages by `.github/workflows/pages.yml`:
https://matf.github.io/browser-game/

## Controls

- Arrow keys or WASD: fly
- Shop (opens by itself after every finished level): arrows choose, Space buys, Tab switches
  page, Enter or Esc starts the next level; the mouse works too

Fly through the rainbow at the end of each level. The level settings (length, speed, pillar gap,
bees, raindrops) are in `src/levels.js`. The dragon has 5 hearts that only come back by feeding it in the shop; with no hearts left it
naps, loses the coins collected in that level and restarts it with 3 hearts (no shop). Coins, hearts, the reached level, owned dragons and accessories are saved
in `localStorage`. Shop items and prices are in `src/shop.js`.

## Layout

- `src/main.js`: Phaser config
- `src/scenes/`: Preload, Game and UI scenes
- `src/objects/`: one class per game object
- `public/assets/`: images, maps and sounds loaded at runtime

## Credits

- Dragons: [Free Pixel Art Dragons](https://magicae-games.itch.io/free-pixel-art-dragons) by
  Magicae! Games. License as stated on the page: "Can be used in any project commercial and
  non-commercial. You may modify or adapt however you want. You cannot resell these assets, even if
  modified." The pink dragon (Marshmallow) is a recolour of the Air dragon.
- Background, ground, rock pillars, hearts, coins and digits: [Pixel Platformer](https://opengameart.org/content/pixel-platformer-0)
  by Kenney ([kenney.nl](https://kenney.nl)), CC0. `hills.png` is a recoloured strip of its
  background sheet; `ground.png` and the `pillar-*.png` images are assembled from its tiles.
- Cupcake and marshmallow: [Pixel Platformer Food Expansion](https://opengameart.org/content/pixel-platformer-food-expansion)
  by Kenney ([kenney.nl](https://kenney.nl)), CC0.
- Bee, raindrop, rainbow, apple, strawberry and accessories: drawn for this game.
