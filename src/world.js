// The world map: islands, their levels and where everything sits on public/assets/map.png.
// The map picture is drawn to match these positions, so moving a station means redrawing the map.

// What a level looks like on each island. sky: background colour, splash: colours when a falling
// thing hits the ground, twinkle: little stars in the sky.
export const THEMES = {
  flowers: { sky: '#8fd3f4', splash: [0x7ec8f5, 0xd6f1ff] },
  candy: { sky: '#ffd6ec', splash: [0xff9ed2, 0xffe3f2] },
  snow: { sky: '#cfe6f5', splash: [0xffffff, 0xbcd8f0] },
  stars: { sky: '#2a2350', splash: [0xffd84a, 0xfff3b0], twinkle: true },
};

// Three levels per island. stations: the spot of each level on the map (x, y in pixels).
// label: where the island's name is written.
export const ISLANDS = [
  {
    name: 'Blumeninsel',
    theme: 'flowers',
    label: [96, 260],
    stations: [[40, 222], [88, 228], [136, 208]],
  },
  {
    name: 'Zuckerinsel',
    theme: 'candy',
    label: [212, 46],
    stations: [[176, 118], [214, 112], [250, 94]],
  },
  {
    name: 'Schneeinsel',
    theme: 'snow',
    label: [322, 252],
    stations: [[286, 198], [322, 216], [364, 206]],
  },
  {
    name: 'Sterneninsel',
    theme: 'stars',
    label: [418, 48],
    stations: [[384, 122], [416, 128], [456, 118]],
  },
];

export const LEVELS_PER_ISLAND = 3;
export const LEVEL_COUNT = ISLANDS.length * LEVELS_PER_ISLAND;

// The shop house: x, y is the bottom middle of the house; the dragon lands at its door.
export const SHOP = { x: 84, y: 186 };
export const SHOP_SPOT = -1; // "where the dragon is" when it's at the shop (levels are 0, 1, 2, ...)

export function islandOf(level) {
  return ISLANDS[Math.floor(level / LEVELS_PER_ISLAND)];
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
