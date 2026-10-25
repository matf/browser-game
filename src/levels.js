// One entry per level, three per island (see src/world.js). On each island the levels get harder,
// and the first level of the next island is easier again than the last one before it (Anna's wish).
//   seconds:     how long you fly before the rainbow comes
//   scroll:      how fast the world moves past (pixels per second)
//   pillarEvery: a new pair of rock pillars this often (milliseconds)
//   gap:         height of the hole between two pillars (pixels)
//   beeEvery:    a new bee this often (milliseconds)
//   beeSpeed:    how fast bees fly (pixels per second)
//   dropEvery:   a new raindrop this often (milliseconds)
export const LEVELS = [
  // Blumeninsel
  { seconds: 40, scroll: 55, pillarEvery: 5500, gap: 150, beeEvery: 9000, beeSpeed: 80, dropEvery: 2600 },
  { seconds: 45, scroll: 60, pillarEvery: 5000, gap: 140, beeEvery: 7500, beeSpeed: 90, dropEvery: 2200 },
  { seconds: 50, scroll: 65, pillarEvery: 4500, gap: 130, beeEvery: 6000, beeSpeed: 100, dropEvery: 1800 },
  // Zuckerinsel
  { seconds: 45, scroll: 60, pillarEvery: 5000, gap: 140, beeEvery: 7500, beeSpeed: 90, dropEvery: 2200 },
  { seconds: 50, scroll: 68, pillarEvery: 4250, gap: 124, beeEvery: 5500, beeSpeed: 105, dropEvery: 1650 },
  { seconds: 60, scroll: 80, pillarEvery: 3500, gap: 110, beeEvery: 4000, beeSpeed: 120, dropEvery: 1250 },
  // Schneeinsel
  { seconds: 50, scroll: 68, pillarEvery: 4250, gap: 124, beeEvery: 5500, beeSpeed: 105, dropEvery: 1650 },
  { seconds: 60, scroll: 80, pillarEvery: 3500, gap: 110, beeEvery: 4000, beeSpeed: 120, dropEvery: 1250 },
  { seconds: 60, scroll: 88, pillarEvery: 3100, gap: 100, beeEvery: 3200, beeSpeed: 135, dropEvery: 1000 },
  // Sterneninsel
  { seconds: 60, scroll: 80, pillarEvery: 3500, gap: 110, beeEvery: 4000, beeSpeed: 120, dropEvery: 1250 },
  { seconds: 60, scroll: 88, pillarEvery: 3100, gap: 100, beeEvery: 3200, beeSpeed: 135, dropEvery: 1000 },
  { seconds: 65, scroll: 95, pillarEvery: 2750, gap: 94, beeEvery: 2500, beeSpeed: 150, dropEvery: 850 },
];

// The fight against the fire dragon on the volcano island, after all levels.
//   seconds:   how long you must dodge until the fire dragon gives up
//   scroll:    how fast the ground moves past (pixels per second)
//   powerUpAt: when the helping power-up comes (seconds)
//   phases:    how it attacks, from `from` seconds on: a fire breath every `every` milliseconds with
//              `shots` fireballs, flying `speed` pixels per second
export const BOSS_FIGHT = {
  seconds: 60,
  scroll: 70,
  powerUpAt: 30,
  phases: [
    { from: 0, every: 1700, shots: 1, speed: 140 },
    { from: 20, every: 1900, shots: 3, speed: 145 },
    { from: 40, every: 1400, shots: 3, speed: 160 },
  ],
};
