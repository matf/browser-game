// One entry per level. Each level is a bit harder than the one before.
//   seconds:     how long you fly before the rainbow comes
//   scroll:      how fast the world moves past (pixels per second)
//   pillarEvery: a new pair of rock pillars this often (milliseconds)
//   gap:         height of the hole between two pillars (pixels)
//   beeEvery:    a new bee this often (milliseconds)
//   beeSpeed:    how fast bees fly (pixels per second)
//   dropEvery:   a new raindrop this often (milliseconds)
export const LEVELS = [
  { seconds: 40, scroll: 60, pillarEvery: 5000, gap: 125, beeEvery: 6000, beeSpeed: 90, dropEvery: 1800 },
  { seconds: 45, scroll: 65, pillarEvery: 4200, gap: 115, beeEvery: 4500, beeSpeed: 100, dropEvery: 1400 },
  { seconds: 50, scroll: 70, pillarEvery: 3600, gap: 105, beeEvery: 3500, beeSpeed: 110, dropEvery: 1100 },
  { seconds: 55, scroll: 80, pillarEvery: 3100, gap: 95, beeEvery: 2800, beeSpeed: 125, dropEvery: 900 },
  { seconds: 60, scroll: 90, pillarEvery: 2700, gap: 88, beeEvery: 2200, beeSpeed: 140, dropEvery: 750 },
];
