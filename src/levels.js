// One entry per level. Each level is a bit harder than the one before.
//   seconds:     how long you fly before the rainbow comes
//   scroll:      how fast the world moves past (pixels per second)
//   pillarEvery: a new pair of rock pillars this often (milliseconds)
//   gap:         height of the hole between two pillars (pixels)
//   beeEvery:    a new bee this often (milliseconds)
//   beeSpeed:    how fast bees fly (pixels per second)
//   dropEvery:   a new raindrop this often (milliseconds)
export const LEVELS = [
  { seconds: 40, scroll: 55, pillarEvery: 5500, gap: 150, beeEvery: 9000, beeSpeed: 80, dropEvery: 2600 },
  { seconds: 45, scroll: 60, pillarEvery: 5000, gap: 140, beeEvery: 7500, beeSpeed: 90, dropEvery: 2200 },
  { seconds: 50, scroll: 65, pillarEvery: 4500, gap: 130, beeEvery: 6000, beeSpeed: 100, dropEvery: 1800 },
  { seconds: 55, scroll: 72, pillarEvery: 4000, gap: 120, beeEvery: 5000, beeSpeed: 110, dropEvery: 1500 },
  { seconds: 60, scroll: 80, pillarEvery: 3500, gap: 110, beeEvery: 4000, beeSpeed: 120, dropEvery: 1250 },
  { seconds: 60, scroll: 85, pillarEvery: 3200, gap: 104, beeEvery: 3400, beeSpeed: 130, dropEvery: 1100 },
  { seconds: 60, scroll: 90, pillarEvery: 2950, gap: 98, beeEvery: 2900, beeSpeed: 140, dropEvery: 950 },
  { seconds: 65, scroll: 95, pillarEvery: 2750, gap: 94, beeEvery: 2500, beeSpeed: 150, dropEvery: 850 },
  { seconds: 65, scroll: 100, pillarEvery: 2550, gap: 90, beeEvery: 2200, beeSpeed: 160, dropEvery: 750 },
  { seconds: 70, scroll: 105, pillarEvery: 2400, gap: 86, beeEvery: 2000, beeSpeed: 170, dropEvery: 650 },
];
