// What flies at you and what falls down on each island (THEMES in src/world.js picks one of each).

// Things that fly at you from the right (src/objects/Critter.js). A shot or star power bonks them away.
//   texture: the spritesheet (two frames, flapping; frame: their size), flaps: flaps per second
//   body:    the part that hurts [width, height, x, y]
//   motion:  bob (gently up and down), zigzag (sharp up and down), swoop (dives toward your
//            dragon), spin (straight and spinning)
//   height:  how far it moves up and down (pixels), wiggle: how quickly
export const CRITTERS = {
  bee: { texture: 'bee', frame: [24, 20], body: [16, 12, 3, 7], motion: 'bob', height: 25, wiggle: 0.004 },
  gull: { texture: 'critter-gull', frame: [26, 18], body: [16, 8, 4, 6], motion: 'swoop', flaps: 6 },
  fish: { texture: 'critter-fish', frame: [24, 16], body: [16, 10, 2, 3], motion: 'bob', height: 35, wiggle: 0.0025, flaps: 5 },
  parrot: { texture: 'critter-parrot', frame: [24, 22], body: [14, 12, 3, 5], motion: 'zigzag', height: 30, wiggle: 0.005, flaps: 8 },
  raincloud: { texture: 'critter-raincloud', frame: [26, 19], body: [18, 10, 4, 4], motion: 'bob', height: 15, wiggle: 0.002, flaps: 3 },
  butterfly: { texture: 'critter-butterfly', frame: [18, 17], body: [10, 8, 3, 5], motion: 'zigzag', height: 35, wiggle: 0.007, flaps: 10 },
  ufo: { texture: 'critter-ufo', frame: [26, 16], body: [20, 8, 3, 6], motion: 'bob', height: 45, wiggle: 0.0015, flaps: 4 },
  firefly: { texture: 'critter-firefly', frame: [15, 13], body: [9, 7, 3, 3], motion: 'bob', height: 30, wiggle: 0.006, flaps: 14 },
  bat: { texture: 'critter-bat', frame: [24, 15], body: [12, 8, 6, 4], motion: 'zigzag', height: 28, wiggle: 0.006, flaps: 10 },
  crystal: { texture: 'critter-crystal', frame: [17, 17], body: [9, 9, 4, 4], motion: 'spin', flaps: 4 },
};

// Things that fall down (or come up) and go puff when they hit something.
//   texture: the picture, body: [width, height, x, y]
//   motion:  fall (down, drifting left), rise (up from the ground), bounce (falls, bounces once,
//            then goes puff), arc (thrown up from the right, comes down again), sway (falls slowly,
//            swinging left and right), streak (fast and slanted, like a meteor)
//   speed:   how fast (pixels per second), spin: how fast it turns (degrees per second)
export const DROPS = {
  raindrop: { texture: 'drop-flowers', body: [8, 10, 2, 5], motion: 'fall', speed: 110 },
  sugar: { texture: 'drop-candy', body: [8, 10, 2, 5], motion: 'fall', speed: 110 },
  snowflake: { texture: 'drop-snow', body: [8, 10, 2, 5], motion: 'fall', speed: 110 },
  shootingStar: { texture: 'drop-stars', body: [8, 10, 2, 5], motion: 'fall', speed: 110 },
  coconut: { texture: 'drop-beach', body: [10, 10, 3, 3], motion: 'bounce', speed: 120, spin: 150 },
  bubble: { texture: 'drop-reef', body: [10, 10, 3, 3], motion: 'rise', speed: 45 },
  cannonball: { texture: 'drop-treasure', body: [10, 10, 3, 3], motion: 'arc', speed: 150, spin: -200 },
  hail: { texture: 'drop-cloud', body: [8, 8, 3, 3], motion: 'fall', speed: 160 },
  rainbowDrop: { texture: 'drop-colors', body: [8, 10, 3, 5], motion: 'sway', speed: 70 },
  meteor: { texture: 'drop-moon', body: [8, 8, 2, 6], motion: 'streak', speed: 150 },
  spore: { texture: 'drop-mushroom', body: [8, 8, 3, 3], motion: 'sway', speed: 50 },
  pumpkin: { texture: 'drop-spooky', body: [10, 10, 3, 4], motion: 'bounce', speed: 110 },
  icicle: { texture: 'drop-crystal', body: [6, 10, 3, 6], motion: 'fall', speed: 190 },
};
