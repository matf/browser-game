// What flies at you and what falls down on each island (THEMES in src/world.js picks one of each).

// Things that fly at you from the right (src/objects/Critter.js). A shot or star power bonks them away.
//   texture: the spritesheet (two frames, flapping; frame: their size), flaps: flaps per second
//   body:    the part that hurts [width, height, x, y]
//   motion:  bob (gently up and down), zigzag (sharp up and down), swoop (dives toward your
//            dragon), spin (straight and spinning)
//   height:  how far it moves up and down (pixels), wiggle: how quickly
export const CRITTERS = {
  bee: { texture: 'bee', frame: [24, 20], body: [16, 12, 3, 7], motion: 'bob', height: 25, wiggle: 0.004 },
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
};
