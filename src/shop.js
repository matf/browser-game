// Everything you can buy in the shop. Prices are in coins.

export const MAX_HEARTS = 5; // hearts only come back by feeding the dragon

export const DRAGON_PRICE = 70;

// heal: how many hearts the food gives back (MAX_HEARTS = all of them).
export const FOODS = [
  { key: 'apple', name: 'Apfel', price: 5, heal: 1, frame: 0 },
  { key: 'strawberry', name: 'Erdbeere', price: 9, heal: 2, frame: 1 },
  { key: 'cake', name: 'Kuchen', price: 12, heal: 3, frame: 2 },
  { key: 'marshmallow', name: 'Marshmallow', price: 18, heal: MAX_HEARTS, frame: 3 },
];

// slot: where it sits. Only one thing per slot can be worn at a time.
export const ACCESSORIES = [
  { key: 'bow', name: 'Schleife', price: 15, slot: 'head' },
  { key: 'crown', name: 'Krone', price: 50, slot: 'head' },
  { key: 'glasses', name: 'Herzbrille', price: 25, slot: 'eyes' },
  { key: 'necklace', name: 'Halskette', price: 20, slot: 'neck' },
  { key: 'pawchain', name: 'Pfotenkette', price: 20, slot: 'paws' },
  { key: 'gem-pink', name: 'Steine rosa', price: 30, slot: 'body' },
  { key: 'gem-blue', name: 'Steine blau', price: 30, slot: 'body' },
  { key: 'gem-green', name: 'Steine grün', price: 30, slot: 'body' },
  { key: 'gem-purple', name: 'Steine lila', price: 30, slot: 'body' },
  { key: 'glitter', name: 'Glitzer', price: 40, slot: 'glitter' },
];
