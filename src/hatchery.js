// The Brutinsel: every day there is a new dragon egg in the nest, and the next day a baby dragon
// hatches out of it. The babies are new dragons: one of the dragon shapes in a colour no other
// dragon has. They grow up by themselves, and once grown they move into a free house.

export const GROW_HOURS = 24; // how long a baby takes to grow up
export const BABY_SCALE = 0.3; // size of a just-hatched baby (1 = as big as in the levels)
export const GROWN_SCALE = 0.45; // size once grown up, like the other dragons on the islands
export const SHAPES = 5; // rows of dragons-white.png

// Colours for the new dragons, none like the nine dragons from the shop.
const COLORS = [0x8ff0c8, 0xffb88a, 0x4fd8d8, 0xff7a7a, 0xc8f060, 0xd8e0f0, 0x3fb8a0, 0xffa0e0, 0xa0b8ff, 0xffe8a0];
const NAMES = [
  'Krümel', 'Pünktchen', 'Funkel', 'Flausch', 'Zimti', 'Blinki', 'Knuddel', 'Wuschel', 'Sternchen',
  'Nebel', 'Kiwi', 'Mocca', 'Bonbon', 'Glitzer', 'Tupfi', 'Schnuppi', 'Minzi', 'Pfirsich', 'Koralle', 'Smaragd',
];

// Today's date in the player's time zone, like '2026-10-25'. Strings in this form sort by date.
export function today(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// A visit to the nest: an egg from an earlier day hatches, and if there was no egg yet today, a new
// one is laid. Changes the save; returns { hatched (the new baby or null), laid (true/false) }.
export function visitNest(save, now = Date.now()) {
  const day = today(new Date(now));
  let hatched = null;
  if (save.egg && save.egg.day < day) {
    hatched = newHatchling(save, now);
    save.hatchlings.push(hatched);
    save.egg = null;
  }
  let laid = false;
  if (!save.egg && save.lastEgg !== day) {
    save.egg = { day };
    save.lastEgg = day;
    laid = true;
  }
  return { hatched, laid };
}

function newHatchling(save, now) {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const usedNames = save.hatchlings.map((h) => h.name);
  const name = pick(NAMES.filter((n) => !usedNames.includes(n))) ?? `Drachi ${save.hatchlings.length + 1}`;
  // A shape and colour that no other hatchling has yet (while there are some left).
  const used = save.hatchlings.map((h) => `${h.shape}-${h.tint}`);
  const looks = [];
  for (let shape = 0; shape < SHAPES; shape++) for (const tint of COLORS) looks.push({ shape, tint });
  const fresh = looks.filter((l) => !used.includes(`${l.shape}-${l.tint}`));
  const { shape, tint } = pick(fresh.length ? fresh : looks);
  return { id: now, name, shape, tint, born: now };
}

// How grown up a hatchling is, from 0 (just hatched) to 1 (grown up).
export function growth(hatchling, now = Date.now()) {
  return Math.min(1, (now - hatchling.born) / (GROW_HOURS * 3600 * 1000));
}

// How a hatchling looks on the islands (for Resident).
export function hatchlingLook(hatchling, now = Date.now()) {
  return {
    key: `hatchling-${hatchling.id}`,
    name: hatchling.name,
    anim: `white-${hatchling.shape}-fly`,
    tint: hatchling.tint,
    scale: BABY_SCALE + (GROWN_SCALE - BABY_SCALE) * growth(hatchling, now),
  };
}
