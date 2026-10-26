// One entry per level in playing order: three per island, then the boss of the island group (see
// src/world.js). On each island the levels get harder, and the first level of the next island is
// easier again than the last one before it (Anna's wish).
//   seconds:      how long you fly before the rainbow comes
//   scroll:       how fast the world moves past (pixels per second)
//   pillarEvery:  a new pair of rock pillars this often (milliseconds)
//   gap:          height of the hole between two pillars (pixels)
//   critterEvery: a new bee (or seagull, fish...) this often (milliseconds)
//   critterSpeed: how fast they fly (pixels per second)
//   dropEvery:    a new raindrop (or coconut, bubble...) this often (milliseconds)
//
// A boss fight instead has:
//   boss:      who it is (BOSSES in src/objects/Boss.js)
//   health:    how many hits with your shots it takes until the boss gives up
//   scroll:    how fast the ground moves past (pixels per second)
//   powerUpAt: when the helping power-up comes (seconds)
//   phases:    how it attacks, from `from` seconds on: every `every` milliseconds an `attack`
//              (aim, lob, strike or chase, see src/objects/Boss.js) with `shots` shots flying
//              `speed` pixels per second
export const LEVELS = [
  // Blumeninsel
  { seconds: 40, scroll: 55, pillarEvery: 5500, gap: 150, critterEvery: 9000, critterSpeed: 80, dropEvery: 2600 },
  { seconds: 45, scroll: 60, pillarEvery: 5000, gap: 140, critterEvery: 7500, critterSpeed: 90, dropEvery: 2200 },
  { seconds: 50, scroll: 65, pillarEvery: 4500, gap: 130, critterEvery: 6000, critterSpeed: 100, dropEvery: 1800 },
  // Zuckerinsel
  { seconds: 45, scroll: 60, pillarEvery: 5000, gap: 140, critterEvery: 7500, critterSpeed: 90, dropEvery: 2200 },
  { seconds: 50, scroll: 68, pillarEvery: 4250, gap: 124, critterEvery: 5500, critterSpeed: 105, dropEvery: 1650 },
  { seconds: 60, scroll: 80, pillarEvery: 3500, gap: 110, critterEvery: 4000, critterSpeed: 120, dropEvery: 1250 },
  // Schneeinsel
  { seconds: 50, scroll: 68, pillarEvery: 4250, gap: 124, critterEvery: 5500, critterSpeed: 105, dropEvery: 1650 },
  { seconds: 60, scroll: 80, pillarEvery: 3500, gap: 110, critterEvery: 4000, critterSpeed: 120, dropEvery: 1250 },
  { seconds: 60, scroll: 88, pillarEvery: 3100, gap: 100, critterEvery: 3200, critterSpeed: 135, dropEvery: 1000 },
  // Sterneninsel
  { seconds: 60, scroll: 80, pillarEvery: 3500, gap: 110, critterEvery: 4000, critterSpeed: 120, dropEvery: 1250 },
  { seconds: 60, scroll: 88, pillarEvery: 3100, gap: 100, critterEvery: 3200, critterSpeed: 135, dropEvery: 1000 },
  { seconds: 65, scroll: 95, pillarEvery: 2750, gap: 94, critterEvery: 2500, critterSpeed: 150, dropEvery: 850 },
  // Vulkaninsel: the fire dragon
  {
    boss: 'fire',
    health: 25,
    scroll: 70,
    powerUpAt: 30,
    phases: [
      { from: 0, every: 1700, shots: 1, speed: 140 },
      { from: 20, every: 1900, shots: 3, speed: 145 },
      { from: 40, every: 1400, shots: 3, speed: 160 },
    ],
  },
  // Strandinsel
  { seconds: 45, scroll: 65, pillarEvery: 4500, gap: 130, critterEvery: 6000, critterSpeed: 95, dropEvery: 2200 },
  { seconds: 50, scroll: 70, pillarEvery: 4200, gap: 122, critterEvery: 5000, critterSpeed: 105, dropEvery: 1900 },
  { seconds: 55, scroll: 78, pillarEvery: 3800, gap: 114, critterEvery: 4200, critterSpeed: 115, dropEvery: 1600 },
  // Korallenriff
  { seconds: 50, scroll: 70, pillarEvery: 4200, gap: 122, critterEvery: 5000, critterSpeed: 100, dropEvery: 1900 },
  { seconds: 55, scroll: 78, pillarEvery: 3800, gap: 114, critterEvery: 4200, critterSpeed: 110, dropEvery: 1600 },
  { seconds: 60, scroll: 85, pillarEvery: 3400, gap: 106, critterEvery: 3500, critterSpeed: 120, dropEvery: 1350 },
  // Schatzinsel
  { seconds: 55, scroll: 78, pillarEvery: 3800, gap: 114, critterEvery: 4200, critterSpeed: 110, dropEvery: 2000 },
  { seconds: 60, scroll: 85, pillarEvery: 3400, gap: 106, critterEvery: 3500, critterSpeed: 120, dropEvery: 1700 },
  { seconds: 65, scroll: 92, pillarEvery: 3000, gap: 100, critterEvery: 3000, critterSpeed: 130, dropEvery: 1450 },
  // Krakeninsel: the giant octopus Tinti
  {
    boss: 'octopus',
    health: 30,
    scroll: 60,
    powerUpAt: 30,
    phases: [
      { from: 0, attack: 'lob', every: 2000, shots: 1, speed: 150 },
      { from: 15, attack: 'aim', every: 1600, shots: 2, speed: 150 },
      { from: 30, attack: 'lob', every: 1700, shots: 3, speed: 160 },
      { from: 45, attack: 'aim', every: 1300, shots: 3, speed: 170 },
    ],
  },
];
