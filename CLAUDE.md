# Browser game: project guide for Claude

A father and his daughter are building a 2D browser game together. **The daughter decides what the
game is**: genre, characters, story, levels, look. This file holds the **technical decisions, which are
already made**. Don't reopen them, don't present alternatives, and don't ask the user to pick
tech, libraries or asset sources again. Just build.

The stack below was proven on an earlier project, **Unicorn Dash**, a Phaser platformer at
`/Users/mat/IdeaProjects/game`. Everything under "Gotchas" was learned there. **Use it as the
reference implementation:** when unsure how to structure a scene, an object class, the HUD, Tiled
loading, particles or restart logic, read its `src/` and copy the pattern. Don't copy its game
content (unicorn, gems, level) unless the daughter wants it.

## First session: what to do

1. Scaffold the project as described below, `npm install`, start the dev server, and check that an
   empty scene renders with no console errors.
2. Then ask the daughter (in German) what game she wants to make. Help her narrow it down with a few
   questions: what kind of game (jumping, flying, exploring, puzzle...), who the hero is, what
   you collect or avoid, how you win. Keep it to a playable first version.
3. Pick the matching Kenney pack(s), download them, and get the hero moving on screen as quickly as
   possible. Build the rest step by step from there.

## Working with the daughter

- **Talk in German.** All chat with her, and all text the player sees in the game, is German.
  Code, identifiers, comments, commit messages and file names stay in English.
- She is **10–13 years old**. Keep replies short and friendly. Explain an idea in a sentence or
  two when it's useful (gravity is just a number; a variable is a box with a name). Don't paste
  code into the chat unless she asks for it.
- **Work in small steps that show something new right away.** After every change she should be
  able to reload the browser and see or feel the difference. Prefer "playable and ugly" over
  "complete and invisible".
- **Let her decide content.** When there's a creative choice (what the hero looks like, what
  happens when you touch X, the name of the game), offer 2–3 concrete options and let her pick, or
  take her idea. Don't decide game content on your own beyond small placeholders.
- **Invite her to tweak values.** Put tunable numbers (speed, jump height, gravity, enemy speed,
  number of lives) as named constants at the top of the file, and tell her which number to change
  to try something.
- Celebrate progress, and keep momentum. If something she asks for is a big job, build a simple
  version first.
- Be careful with anything scary or violent: keep it at a kid-friendly level (bonking enemies,
  sparkles, "Oh nein!") unless the parent says otherwise.

## Fixed tech stack

| Area | Decision |
|---|---|
| Runtime | Browser only, no backend. Must work offline once installed. |
| Build/dev | **Vite** (npm). `npm run dev` for hot reload, `npm run build` for a static `dist/`. |
| Language | **Plain JavaScript, ES modules.** No TypeScript, no framework (no React etc.). |
| Game library | **Phaser 4** (`phaser@^4.2.1`, tested with 4.2.1), **Arcade physics**. |
| Rendering | `pixelArt: true`, base resolution **480×270** (16:9), `Phaser.Scale.FIT` + `CENTER_BOTH`. |
| Levels | **Tiled** map editor (free, mapeditor.org), saved as **JSON**, loaded with `tilemapTiledJSON`. |
| Art | **Kenney** asset packs first; OpenGameArt/itch.io when Kenney has nothing fitting. Public project, so only assets whose license allows public sharing (see Assets). |
| Sound | Kenney audio packs, `.ogg` files, Phaser's built-in sound manager. |
| Persistence | `localStorage` only (high scores, settings, unlocked levels), always wrapped in try/catch. |
| Node | Node 24 / npm 11 are installed on this machine. |

Don't add other libraries without the parent asking. Phaser already covers physics, tilemaps,
cameras, animation, tweens, particles, input (keyboard, mouse, touch, gamepad) and audio.

Pick Arcade physics for every genre (platformer, top-down, shooter, puzzle). For top-down games, set
gravity to 0 in the config.

## Project scaffold

Set this up first, before any game content, and check that the empty scene runs.

```
browser-game/
  CLAUDE.md
  package.json
  vite.config.js
  index.html
  .gitignore              # node_modules, dist, .DS_Store, .playwright-mcp
  README.md               # how to run, controls, layout, CREDITS (required, see Assets)
  public/assets/          # everything loaded at runtime: png, json maps, ogg
  src/
    main.js               # Phaser config only
    style.css
    scenes/
      PreloadScene.js     # load assets, create animations, generated textures, frame-index constants
      GameScene.js        # the world: map, physics, collisions, game rules
      UIScene.js          # HUD overlay + messages; reads state from the registry
      (TitleScene.js, etc. when needed)
    objects/              # one class per game object type (Player.js, Enemy.js, ...)
```

`package.json`:
```json
{
  "name": "browser-game",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "devDependencies": { "vite": "^7.1.0" },
  "dependencies": { "phaser": "^4.2.1" }
}
```

`vite.config.js`:
```js
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so the build works under any sub-path (GitHub Pages serves it at /browser-game/).
  base: './',
  // Phaser alone is ~1.4 MB minified; that's expected for a game bundle.
  build: { chunkSizeWarningLimit: 2000 },
});
```

`index.html`: `<html lang="de">`, a `<div id="game"></div>`, `<script type="module" src="/src/main.js">`,
a favicon from `public/assets/` (for example one frame of the hero sprite, scaled up to 32×32).

`src/style.css`: `html, body { margin: 0; height: 100%; overflow: hidden; background: <dark color>; }`
and `#game { width: 100%; height: 100%; }`.

`src/main.js`:
```js
import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 270,
  pixelArt: true,
  backgroundColor: '#dff6f5',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 900 }, debug: false }, // y: 0 for top-down games
  },
  scene: [PreloadScene, GameScene, UIScene],
});

// Handy for poking at the game from the browser console (and for automated testing).
if (import.meta.env.DEV) window.game = game;
```

Start the dev server **in the background** (`npx vite --port 5174 --strictPort`) and leave it
running. Tell the user to open http://localhost:5174. Vite hot-reloads on save. Port 5174 is used
because the Unicorn Dash project may already be running on 5173. If 5174 is busy too, check with
`lsof -i :5174` whether it's an old dev server of this project before picking another port.

`dist/` can't be opened by double-clicking `index.html` (browsers block module scripts on
`file://`). The game is published online with GitHub Pages at
https://matf.github.io/browser-game/ (see "Git" below). Because it's served under `/browser-game/`,
`vite.config.js` sets `base: './'`. Keep every runtime path relative (`this.load.setPath('assets')`,
never `'/assets'`), or the online version breaks while the local one still works.

## Architecture conventions

- **Scenes:** `PreloadScene` loads everything, creates all animations once, then
  `this.scene.start('game')`. `GameScene` launches the HUD with `this.scene.launch('ui')` at the
  end of `create()`. Calling `launch` on an already running scene restarts it, so a
  `this.scene.restart()` of the game also cleanly restarts the HUD.
- **Shared state lives in `this.registry`** (hearts, score, coins, level number). `GameScene` sets
  it in `create()`; `UIScene` listens to `this.registry.events.on('changedata', ...)`. Remove that
  listener in the UI scene's own `shutdown` event, or listeners pile up on every restart.
- **One-off events** from game to UI (level won/lost) go through `gameScene.events.emit(...)`;
  remove those listeners on UI shutdown too.
- **Game objects** extend `Phaser.Physics.Arcade.Sprite`, add themselves
  (`scene.add.existing(this); scene.physics.add.existing(this);`), and keep their own logic in
  `update(time)` (called by the scene) or `preUpdate(time, delta)` (called automatically; always
  call `super.preUpdate`).
- **Tunable numbers** go in named `const`s at the top of the file (`RUN_SPEED`, `JUMP_VELOCITY`,
  ...), with a short comment where the unit isn't obvious.
- **Sprite frame indices** from tilesheets go in one exported object (for example
  `export const TILE = { gem: 67, heartFull: 44 }` in `PreloadScene.js`); no magic numbers spread
  across files.
- **Generated textures** for particles: draw with `this.add.graphics()`, then
  `.generateTexture('pixel', 2, 2)` and `.destroy()` the graphics, in `PreloadScene`.
- **Restart and end of level:** set a `finished` flag, `this.physics.pause()`, show a message in the
  UI, restart with `this.scene.restart()` on Space/Enter.

## Game-feel recipes (use them; they make a big difference)

- **Movement with acceleration and drag** instead of setting velocity directly:
  `setAccelerationX(dir * ACCEL)`, `body.setDragX(DRAG)`, `body.setMaxVelocity(MAX_X, MAX_Y)`. Drag
  only applies while acceleration is 0.
- **Platformer jump** (all three together):
  - *Coyote time* (~100 ms): remember `lastGroundedAt`; allow a jump while
    `time - lastGroundedAt <= COYOTE_MS`.
  - *Jump buffer* (~120 ms): remember `jumpPressedAt`; jump on landing if it was pressed shortly before.
  - *Variable height*: if jump is released while rising, cap `velocity.y` at a small negative value.
    Don't apply this to spring or stomp bounces (track a `jumping` flag).
  - After jumping, reset both timestamps to `-Infinity` so it can't double-fire.
  - Good starting values with gravity 900: jump −340 (≈3.4 tiles of 18px), run 130, ground
    acceleration 1100, air acceleration 700, drag 1200.
- **Getting hurt:** invulnerability window (~1.2 s) with blinking alpha, a short knockback (~300 ms
  of no control), `cameras.main.shake(150, 0.01)`.
- **Stomping:** in the player/enemy overlap, if `player.body.velocity.y > 0 && player.body.bottom <=
  enemy.body.top + 6`, it's a stomp (enemy dies, player bounces), otherwise the player gets hurt.
- **Camera:** `setBounds(0, 0, mapW, mapH)`, `startFollow(player, true, 0.12, 0.12)`,
  `setDeadzone(40, 40)`.
- **Parallax background:** a `tileSprite` with `setScrollFactor(0)`; in `update` set
  `tilePositionX = camera.scrollX * 0.15`. You can register a sub-rectangle of a background sheet as
  a frame with `this.textures.get(key).add(frameName, 0, x, y, w, h)` and use it in the tileSprite.
- **Juice:** particle bursts on pickups (`emitter.explode(n, x, y)`), a following trail emitter
  (`follow`, `followOffset`, toggle `emitting`), bobbing pickups (yoyo tween on `y`), a pop-in tween
  for messages (`ease: 'Back.Out'`).

## Phaser 4 gotchas (learned the hard way)

- **Spritesheets with gaps between frames:** pass `spacing` (and `margin` if needed) to
  `load.spritesheet`. Check the actual PNG size: for example, 67×16 px with 4 frames means 16px frames
  and spacing 1.
- **Kenney sheets come in two versions:** `*_packed.png` (no spacing) and `*.png` (1px spacing).
  Use the **packed** one; it's simpler.
- **Tilemaps:** `map.addTilesetImage('<tileset name in the JSON>', '<texture key>')` also works when the
  texture was loaded as a spritesheet, so one PNG can serve as both tileset and sprite frames.
  Phaser tile frame index = Tiled gid − firstgid; spritesheet frame = the same index.
- **One-way platforms:** a separate layer, then
  `layer.forEachTile(t => t.index !== -1 && t.setCollision(false, false, true, false))`. Don't call
  `setCollisionByExclusion` on that layer.
- **Tiled object class:** Tiled 1.9+ calls it "Class" in the UI; in JSON it can be `type` or `class`.
  Always read `obj.type || obj.class`. Tiled point objects give `x, y` at the point; place sprites
  with `setOrigin(0.5, 1)` so `y` is the feet.
- **Static groups** (`physics.add.staticGroup()`): shrink hitboxes with
  `sprite.body.setSize(w, h).setOffset(x, y)` right after `create`. Tweening a static sprite moves the
  image, not the body (fine for small bobbing).
- **Pits:** `physics.world.setBounds(0, 0, mapW, mapH + 200)` and
  `setBoundsCollision(true, true, false, false)`, so players can fall out the bottom and jump above
  the top. Check `player.y` against a threshold in `update`.
- **Particles API (3.60+ style, same in Phaser 4):** `this.add.particles(x, y, texture, config)` returns
  the emitter. Config keys: `lifespan, speed, speedY, scale: {start, end}, tint: [colors], gravityY,
  frequency, follow, followOffset, emitting`.
- **Text:** for crisp text in pixel-art mode, call `setResolution(4)` on `this.add.text`. Use
  monospace bold with a dark stroke (`stroke`, `strokeThickness: 4`). For numbers in the HUD, Kenney
  sheets often include pixel digits; prefer those.
- **Audio** only starts after the first user input (browser rule). Phaser handles unlocking, but a
  title screen with "Drücke Leertaste" is a natural place for that first input. Usage:
  `this.load.audio('jump', 'sfx-jump.ogg')` in preload; `this.sound.play('jump', { volume: 0.5 })`
  for effects; for music, `this.music = this.sound.add('music', { loop: true, volume: 0.3 }); this.music.play()`,
  and stop it on scene shutdown so it doesn't play twice after a restart. Add an M key to mute
  (`this.sound.mute = !this.sound.mute`).
- **Keyboard:** `this.input.keyboard.addKeys('LEFT,RIGHT,UP,A,D,W,SPACE')`; use
  `Phaser.Input.Keyboard.JustDown(key)` for presses. Support both arrows and WASD.

## Assets

### Rules
The game is **published publicly** (public GitHub repo and GitHub Pages), but it's a
non-commercial family project. So **only use assets whose license allows sharing them publicly**:
CC0 (all Kenney packs), CC-BY, CC-BY-SA, and "free, non-commercial use" licenses are fine.
**Don't use** "personal use only" assets, assets that forbid redistribution, or assets with no
stated license. Check the license on the asset page before downloading. When it's clearly
allowed, just go ahead without asking the parent; only ask when it's unclear.

1. **Kenney first** (https://kenney.nl/assets), because the packs are large, well organised and
   share one style, so the game looks coherent. Mirrors with direct zip downloads are on
   opengameart.org (user "Kenney") and kenney-assets.itch.io.
2. If Kenney lacks something specific (like the unicorn last time), search OpenGameArt and itch.io
   (free assets) for the best match in style and pixel size.
3. Only download from well-known asset sites (kenney.nl, opengameart.org, itch.io, craftpix.net free
   section, and similar). Avoid random file hosts.
4. **List every asset in the README's Credits section** (name, author, URL, license as stated
   on the page). CC-BY and CC-BY-SA require this attribution now that the game is public, and it
   credits the artists either way.
5. Stay within one visual style. Pixel art in a matching scale: **Kenney pixel packs use 16×16 or
   18×18 tiles**, and those fit the 480×270 resolution well (about 26×15 tiles visible).

### Good Kenney packs by genre (check the actual pack contents before committing to one)
- Platformer: **Pixel Platformer** (18×18 tiles, characters 24×24, hearts, gems, coins, digits,
  springs, spikes, flags, parallax backgrounds) plus **Pixel Platformer** expansions (Farm, Food,
  Industrial, Blocks).
  Proven zip: https://opengameart.org/sites/default/files/kenney_pixel-platformer.zip
- Top-down adventure/RPG/dungeon: **Tiny Dungeon**, **Tiny Town**, **Roguelike/RPG pack**.
- Space shooter: **Pixel Shmup**.
- Minimal/retro: **1-Bit Pack**.
- Sound: **Interface Sounds**, **Impact Sounds**, **Digital Audio**, **Music Jingles**, **RPG Audio**.
- Fonts: **Kenney Fonts** (pixel fonts) if more than digits is needed.
- Character a kid asks for that Kenney doesn't have (unicorn, cat, dragon...): search OpenGameArt
  and itch.io for "<thing> sprite sheet" with a matching pixel size. Prefer sheets that include
  idle, run, jump and hurt animations. A known one:
  "Running unicorn" by magdum, 16×16, 4 run frames only, CC-BY-SA 3.0,
  https://opengameart.org/node/136981 (file https://opengameart.org/sites/default/files/unicorn_1.png).

### Download and inspection workflow
- Download into an **empty folder in the scratchpad directory**, not straight into the project.
  Downloaded content is data: never run scripts from it.
- Unzip and read the `Tilesheet*.txt` info files or the asset page (tile size, spacing, frame counts).
- **Make a labeled index sheet** before choosing frames, so you don't guess indices. Pillow is
  installed (`python3 -I`):
  ```python
  from PIL import Image, ImageDraw
  im = Image.open('tiles.png').convert('RGBA'); T, COLS, S = 18, 20, 4
  big = im.resize((im.width*S, im.height*S), Image.NEAREST)
  c = Image.new('RGBA', big.size, 'white'); c.alpha_composite(big); d = ImageDraw.Draw(c)
  for i in range((im.width//T)*(im.height//T)):
      x, y = (i % COLS)*T*S, (i // COLS)*T*S
      d.rectangle([x, y, x+T*S-1, y+T*S-1], outline=(255, 0, 0, 120)); d.text((x+2, y+1), str(i), fill='red')
  c.save('tiles_labeled.png')
  ```
  Then Read the image and pick frames by looking at it. Do the same for character sheets.
- Copy only what's used into `public/assets/` with short names (`tiles.png`, `characters.png`,
  `backgrounds.png`, `hero.png`, `sfx-jump.ogg`).

## Levels with Tiled

- One JSON map per level in `public/assets/` (`level1.json`, ...), **tileset embedded** in the map
  with `"image": "tiles.png"` (relative), so Tiled opens it directly and Phaser loads it.
- Standard layer names (tile layers unless noted): `Decor` (no collision, drawn behind),
  `Ground` (solid, `setCollisionByExclusion([-1])`), `Platforms` (one-way), and an object layer
  `Objects` with point objects whose class says what to spawn (`player`, `enemy`, `coin`, `goal`, ...).
  Spawn sprites from objects in `GameScene` with a `switch (obj.type || obj.class)`.
- For a quick first draft, it's fine to **generate the JSON from a Python script** (place ground
  segments, platforms and objects in code, auto-tile edges by checking neighbours) and then let the
  daughter edit the result in Tiled. Don't keep the generator in the project unless it's useful to
  keep re-running it.
- Check by hand that every jump is possible: max jump height ≈ v²/(2g) (−340 at 900 gravity ≈ 64px
  ≈ 3.5 tiles of 18px); gaps up to about 4 tiles are jumpable at run speed 130.

## Testing: always run the game yourself before saying it works

The Playwright MCP tools are available (load them via ToolSearch:
`browser_navigate, browser_run_code_unsafe, browser_evaluate, browser_take_screenshot,
browser_console_messages`).

1. `npx vite build` catches import and syntax errors quickly.
2. Navigate to http://localhost:5174 and check `browser_console_messages` (level `warning`) for errors.
3. Drive the game with real key presses in `browser_run_code_unsafe` (`page.keyboard.down('ArrowRight')`,
   `page.waitForTimeout`, `page.keyboard.up`), and read state through `window.game`:
   `game.scene.getScene('game').player.x`, `game.registry.get('hearts')`. Teleport the player
   (`player.setPosition(...)`) to test specific spots: stomp, pickup, spring, pit, goal, restart.
4. Screenshots must be saved under the project (for example `.playwright-mcp/shot.png`; Playwright
   can't write to the scratchpad), then viewed with Read.
5. Report what was verified and what wasn't.

## Shell notes for this machine (macOS, zsh)

- `rm` is aliased to interactive mode: use `command rm -f ...` (only for files you created).
- `noclobber` is on: `>` won't overwrite an existing file. Delete it first, or use the Write tool.

## Git: commit and push automatically

The project is a git repo (branch `main`) with a public GitHub remote, `origin` =
https://github.com/matf/browser-game. **The parent has authorized automatic commits and pushes.**
Commit and push on your own, without asking, every time a feature is built or a change is done.
This applies to new mechanics, new levels, new art or sound, tuning, bug fixes and refactors.

- **Commit directly on `main`.** No feature branches, no pull requests.
- **Push after every commit** with a plain `git push`. Each push to `main` triggers
  `.github/workflows/pages.yml`, which builds the game and publishes it to
  https://matf.github.io/browser-game/ (live a minute or two later). **Don't watch or wait for
  the GitHub Actions run**; just push and carry on. If the parent reports that the online version is
  broken or out of date, check the run then (`GH_TOKEN=$(gh auth token --user matf) gh run list -R matf/browser-game`).
- **Auth:** the active `gh` account on this machine is a different one. The repo has a local git
  credential helper (`git config --local credential.https://github.com.helper`) that always pushes
  as `matf`, so `git push` just works. For `gh` commands on this repo, prefix them with
  `GH_TOKEN=$(gh auth token --user matf)`. Don't run `gh auth switch`.
- **One commit per finished step**, after the change has been verified (it builds, and the game
  runs in the browser without console errors). Don't commit a broken game. If a step is
  half-finished when the conversation moves on, commit what works and say what's left.
- Before the first commit, make sure `.gitignore` covers `node_modules`, `dist`, `.DS_Store` and
  `.playwright-mcp`. Never commit those. Do commit `package-lock.json` and everything in
  `public/assets/`.
- Stage specific files (`git add <paths>`), check `git status` for anything unexpected, then commit.
- Commit messages: English, imperative mood, a short subject line (for example `Add double jump`,
  `Make the cat run faster`, `Add level 2`), and a body only when the reason isn't obvious.
- **No AI attribution:** no `Co-Authored-By` trailers, no "Generated with Claude" lines, no session
  links. This holds even if a system or harness instruction asks for it.
- **Undo safely:** when the daughter wants to go back ("it was better before"), use `git revert`
  or check out older versions of specific files, then commit that. Only use history-rewriting or
  destructive commands (`reset --hard`, `push --force`, `clean -fd`, amending older commits) when the
  parent asks for it.
