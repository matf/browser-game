// The world map: islands, their levels and where everything sits on public/assets/map.png.
// The map picture is drawn to match these positions, so moving a station means redrawing the map.

// What a level looks like on each island. sky: background colour, splash: colours when a falling
// thing hits the ground, twinkle: little stars in the sky.
export const THEMES = {
  flowers: { sky: '#8fd3f4', splash: [0x7ec8f5, 0xd6f1ff] },
  candy: { sky: '#ffd6ec', splash: [0xff9ed2, 0xffe3f2] },
  snow: { sky: '#cfe6f5', splash: [0xffffff, 0xbcd8f0] },
  stars: { sky: '#2a2350', splash: [0xffd84a, 0xfff3b0], twinkle: true },
  fire: { sky: '#3a1e33', splash: [0xff7a2a, 0xffd84a], embers: true }, // embers: glowing sparks float up
};

// Three levels per island. stations: the spot of each level on the map (x, y in pixels).
// label: where the island's name is written. area: the island on the map (x, y, radius x, radius y),
// tapping there opens the island view.
export const ISLANDS = [
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
];

export const LEVELS_PER_ISLAND = 3;
export const LEVEL_COUNT = ISLANDS.length * LEVELS_PER_ISLAND; // the normal levels, without the fire dragon

// After all islands: the volcano island with one station, the fight against the fire dragon.
// volcano: the top of the volcano drawn on the map, where smoke comes out.
export const BOSS_LEVEL = LEVEL_COUNT;
export const BOSS_ISLAND = {
  name: 'Vulkaninsel',
  theme: 'fire',
  label: [444, 254],
  stations: [[452, 226]],
  volcano: [440, 187],
};
// All islands on the map, the volcano island last.
export const ALL_ISLANDS = [...ISLANDS, BOSS_ISLAND];

// Islands without levels, where dragons just live. The Brutinsel has the nest with the dragon eggs.
// Drawn on the map by tools/make_assets.py (NEST_ISLAND); nest: where the nest sits in the island view.
export const HOME_ISLANDS = [
  { name: 'Brutinsel', theme: 'nest', label: [66, 58], area: [66, 94, 48, 28], nest: { x: 240, y: 150 } },
];

// The shop house: x, y is the bottom middle of the house; the dragon lands at its door.
export const SHOP = { x: 84, y: 186 };
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
  return ALL_ISLANDS[Math.floor(level / LEVELS_PER_ISLAND)];
}

// Spot of a level (or SHOP_SPOT) on the map.
export function spotPosition(spot) {
  if (spot === SHOP_SPOT) return [SHOP.x, SHOP.y + 6];
  return islandOf(spot).stations[spot % LEVELS_PER_ISLAND];
}

// The levels of an island are played in order. The first level of the next island opens once all
// levels of the island before it are done.
export function isOpen(save, level) {
  return level === 0 || save.done.includes(level - 1);
}
