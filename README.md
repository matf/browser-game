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

- Main menu (first screen): Weiterspielen, Neues Spiel (asks first, then starts over) and Hilfe.
  Arrows or WASD choose, Enter or Space picks; tapping works too. The house icon on the world map
  (or Esc there) goes back to it.
- World map: tap a level (or the shop house) and the dragon flies there and goes in. With the
  keyboard, arrows or WASD fly to the previous/next spot (the shop comes before level 1) and Space or
  Enter goes in.
- In a level: arrow keys or WASD fly; Esc or the little map icon goes back to the world map
- M or the speaker icon: sound on/off
- Phone (landscape): the joystick waits bottom left; put your thumb anywhere on the left half
  (or the dark border) and slide it. A "So geht's!" screen explains this on the first start.
  Held upright, the game pauses and asks you to turn the phone.
- Shop (the house on the flower island): arrows choose, Space buys, Tab switches page, Enter or Esc
  goes back to the world map; the mouse works too

Fly through the rainbow at the end of each level. After a level you land on the world map: four
islands (Blumeninsel, Zuckerinsel, Schneeinsel, Sterneninsel) with three levels each, played in
order. Finishing all three levels of an island blows the clouds off the next one, and you can always
fly back to islands you have opened. Each level looks like its island (sky, hills, ground, pillars,
and raindrops, sugar drops, snowflakes or shooting stars). Islands, themes and map positions are in
`src/world.js`; the level settings (length, speed, pillar gap, bees, falling things) are in
`src/levels.js`.

The dragon has 5 hearts that only come back by feeding it in the shop; with no hearts left it naps,
loses the coins collected in that level and restarts it with 3 hearts. Coins, hearts, finished
levels, the dragon's spot on the map, owned dragons and accessories are saved in `localStorage`.
Shop items and prices are in `src/shop.js`.

`public/assets/map.png` and the themed level pictures (`ground-candy.png`, ...) were generated with a
small Pillow script from the Kenney art below; the station positions in `src/world.js` match the
islands drawn on the map.

## Layout

- `src/main.js`: Phaser config
- `src/scenes/`: Preload, Title (main menu), Map (world map), Game, UI (level HUD), Shop and Help scenes
- `src/world.js`: islands, themes and map positions; `src/levels.js`: level settings
- `src/objects/`: one class per game object
- `public/assets/`: images, maps and sounds loaded at runtime

## Credits

- Dragons: [Free Pixel Art Dragons](https://magicae-games.itch.io/free-pixel-art-dragons) by
  Magicae! Games. License as stated on the page: "Can be used in any project commercial and
  non-commercial. You may modify or adapt however you want. You cannot resell these assets, even if
  modified." The pink dragon (Marshmallow) is a recolour of the Air dragon.
- Background, ground, rock pillars, snowman, hearts, coins and digits: [Pixel Platformer](https://opengameart.org/content/pixel-platformer-0)
  by Kenney ([kenney.nl](https://kenney.nl)), CC0. `hills-*.png` are recoloured strips of its
  background sheet; `ground-*.png` and the `pillar-*.png` images are assembled from its tiles and
  recoloured for each island.
- World map houses, trees, bushes, mushrooms and beehive: [Tiny Town](https://opengameart.org/content/tiny-town)
  by Kenney ([kenney.nl](https://kenney.nl)), CC0, recoloured for each island. The sea and island
  shapes were drawn for this game.
- Cupcake and marshmallow: [Pixel Platformer Food Expansion](https://opengameart.org/content/pixel-platformer-food-expansion)
  by Kenney ([kenney.nl](https://kenney.nl)), CC0.
- Bee, raindrop, snowflake, shooting star, rainbow, apple, strawberry, piggy bank and accessories: drawn for this game.
- Sounds: [Interface Sounds](https://opengameart.org/content/interface-sounds),
  [85 Short music jingles](https://opengameart.org/content/85-short-music-jingles),
  [63 Digital sound effects](https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc) and
  [50 RPG sound effects](https://opengameart.org/content/50-rpg-sound-effects) by Kenney, CC0 (converted to mp3).
- Music: [Flowerbed Fields [Loop]](https://opengameart.org/content/flowerbed-fields-loop) by Zane Little Music, CC0
  (converted to mp3).
- Font: [Fredoka](https://fonts.google.com/specimen/Fredoka) by The Fredoka Project Authors,
  [SIL Open Font License 1.1](public/assets/fonts/OFL.txt).
