// The world map: islands, their levels and where everything sits on public/assets/map.png.
// The map picture is drawn to match these positions, so moving a station means redrawing the map.

// What a level looks like on each island. sky: background colour, splash: colours when a falling
// thing hits the ground, twinkle: little stars in the sky. critter: what flies at you (CRITTERS in
// src/obstacles.js), drop: what falls down (DROPS there).
export const THEMES = {
  flowers: { sky: '#8fd3f4', splash: [0x7ec8f5, 0xd6f1ff], critter: 'bee', drop: 'raindrop' },
  candy: { sky: '#ffd6ec', splash: [0xff9ed2, 0xffe3f2], critter: 'bee', drop: 'sugar' },
  snow: { sky: '#cfe6f5', splash: [0xffffff, 0xbcd8f0], critter: 'bee', drop: 'snowflake' },
  stars: { sky: '#2a2350', splash: [0xffd84a, 0xfff3b0], twinkle: true, critter: 'bee', drop: 'shootingStar' },
  fire: { sky: '#3a1e33', splash: [0xff7a2a, 0xffd84a], embers: true }, // embers: glowing sparks float up
  // Meeresinseln (bubbles: little bubbles float up in the background)
  beach: { sky: '#a8e6ff', splash: [0xf3d58f, 0xffffff], critter: 'gull', drop: 'coconut' },
  reef: { sky: '#3aa6d6', splash: [0xbff4ff, 0xffffff], bubbles: true, critter: 'fish', drop: 'bubble' },
  treasure: { sky: '#ffd9a0', splash: [0x8a8aa0, 0xffffff], critter: 'parrot', drop: 'cannonball' },
  deep: { sky: '#16406e', splash: [0x7a5ab0, 0x3a2560], bubbles: true },
};

// The island groups, one world map each, played one after the other. In each group:
//   map:     the picture of the map (public/assets/<map>.png, drawn by tools/make_assets.py)
//   shop:    where the shop house stands (x, y is the bottom middle of the house)
//   islands: three levels each. stations: the spot of each level on the map (x, y in pixels).
//            label: where the island's name is written. area: the island on the map (x, y, radius
//            x, radius y); tapping there opens the island view (only islands with a view picture).
//   boss:    the island with one station, the fight against the group's big enemy. icon: the
//            picture on its station. gate: the glittering gate to the next group that opens once
//            the boss is beaten (gateHint: what the fireworks say about it).
//   back:    where the gate back to the group before is (not in the first group).
// The map pictures are drawn to match these positions, so moving a station means redrawing the map.
export const WORLDS = [
  {
    name: 'Dracheninseln',
    map: 'map',
    shop: { x: 84, y: 186 },
    islands: [
      {
        name: 'Blumeninsel',
        theme: 'flowers',
        label: [96, 260],
        stations: [[40, 222], [88, 228], [136, 208]],
        area: [92, 196, 78, 48],
      },
      {
        name: 'Zuckerinsel',
        theme: 'candy',
        label: [212, 46],
        stations: [[176, 118], [214, 112], [250, 94]],
        area: [210, 96, 70, 42],
      },
      {
        name: 'Schneeinsel',
        theme: 'snow',
        label: [322, 252],
        stations: [[286, 198], [322, 216], [364, 206]],
        area: [320, 196, 72, 44],
      },
      {
        name: 'Sterneninsel',
        theme: 'stars',
        label: [418, 48],
        stations: [[384, 122], [416, 128], [456, 118]],
        area: [414, 100, 62, 44],
      },
    ],
    // volcano: the top of the volcano drawn on the map, where smoke comes out.
    boss: {
      name: 'Vulkaninsel',
      theme: 'fire',
      label: [444, 254],
      stations: [[452, 226]],
      volcano: [440, 187],
      gate: [440, 180],
      icon: 'map-flame',
      gateHint: 'Im Vulkan glitzert etwas...',
    },
  },
  {
    name: 'Meeresinseln',
    map: 'map-sea',
    shop: { x: 96, y: 184 },
    back: [26, 36],
    islands: [
      { name: 'Strandinsel', theme: 'beach', label: [100, 258], stations: [[50, 220], [100, 226], [148, 210]] },
      { name: 'Korallenriff', theme: 'reef', label: [232, 46], stations: [[196, 112], [232, 120], [268, 100]] },
      { name: 'Schatzinsel', theme: 'treasure', label: [340, 258], stations: [[302, 210], [342, 224], [382, 212]] },
    ],
    boss: {
      name: 'Krakeninsel',
      theme: 'deep',
      label: [428, 62],
      stations: [[424, 118]],
      gate: [446, 100],
      icon: 'map-octopus',
      gateHint: 'Bei der Krakeninsel glitzert etwas...',
    },
  },
];

export const LEVELS_PER_ISLAND = 3;

// Every level in playing order, numbered from 0 (the number is what the save remembers):
// { world (index in WORLDS), island, station (index in island.stations), boss (true/false) }.
// Each group also learns its first level and its boss level.
export const LEVEL_SPOTS = [];
WORLDS.forEach((world, w) => {
  world.first = LEVEL_SPOTS.length;
  for (const island of [...world.islands, world.boss]) {
    island.world = w;
    island.firstLevel = LEVEL_SPOTS.length;
    island.stations.forEach((_, station) => LEVEL_SPOTS.push({ world: w, island, station, boss: island === world.boss }));
  }
  world.bossLevel = LEVEL_SPOTS.length - 1;
});

// The islands of the first group (they have an island view for building).
export const ISLANDS = WORLDS[0].islands;

// Islands without levels, where dragons just live (free, always open). The Brutinsel has the nest
// with the dragon eggs.
// Drawn on the map by tools/make_assets.py (NEST_ISLAND); nest: where the nest sits in the island view.
export const HOME_ISLANDS = [
  { name: 'Brutinsel', theme: 'nest', label: [66, 58], area: [66, 94, 48, 28], nest: { x: 240, y: 150 } },
  { name: 'Herbstinsel', theme: 'autumn', label: [216, 248], area: [216, 214, 34, 22] },
];

export const SHOP_SPOT = -1; // "where the dragon is" when it's at the shop (levels are 0, 1, 2, ...)

// The big island in the island view (island-<theme>.png): ellipses x, y, radius x, radius y.
// Must match BIG_ISLAND in tools/make_assets.py.
export const ISLAND_GROUND = [[240, 160, 196, 78], [120, 176, 92, 58], [362, 150, 100, 64]];
const GROUND_TOP = 8; // the cliff: the flat top of the island is this much higher than the ellipses

// Is (x, y) on the flat top of the big island, at least `margin` pixels away from its edge?
export function onIslandGround(x, y, margin = 0) {
  return ISLAND_GROUND.some(([cx, cy, rx, ry]) => {
    const dx = (x - cx) / (rx - margin);
    const dy = (y - (cy - GROUND_TOP / 2)) / (ry - GROUND_TOP / 2 - margin);
    return dx * dx + dy * dy <= 1;
  });
}

export function islandOf(level) {
  return LEVEL_SPOTS[level].island;
}

// The index in WORLDS of the group a level belongs to.
export function worldOf(level) {
  return LEVEL_SPOTS[level].world;
}

export function isBossLevel(level) {
  return LEVEL_SPOTS[level]?.boss ?? false;
}

// True for the last level of an island (after it, the next island opens).
export function lastOnIsland(level) {
  const { island, station } = LEVEL_SPOTS[level];
  return station === island.stations.length - 1;
}

// Spot of a level (or SHOP_SPOT, the shop of group `world`) on its map.
export function spotPosition(spot, world = 0) {
  if (spot === SHOP_SPOT) {
    const { x, y } = WORLDS[world].shop;
    return [x, y + 6];
  }
  const { island, station } = LEVEL_SPOTS[spot];
  return island.stations[station];
}

// The levels are played in order. The first level of the next island opens once all levels of
// the island before it are done, and the next group once the boss before it is beaten.
export function isOpen(save, level) {
  return level === 0 || save.done.includes(level - 1);
}
