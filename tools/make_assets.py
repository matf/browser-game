"""Generate the world map and the themed level art for Dragon Flight.

Usage: python -I tools/make_assets.py <tiny-town tilemap_packed.png> public/assets [debug.png]

Needs Pillow and Kenney's Tiny Town pack (https://kenney.nl/assets/tiny-town, CC0; the tilemap is
Tilemap/tilemap_packed.png in the zip; download it outside the project). Reads tiles.png, food.png and
the green *-flowers.png originals from the assets folder and writes map.png, shop-house.png and the
other themes' ground/hills/pillar/drop pictures. It is seeded, so running it again gives the same
pictures. The station and shop positions in ISLANDS and SHOP below must match src/world.js. The debug picture
shows the map 3x bigger with the stations marked.
"""
import json
import os
import random
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

TOWN_PATH, OUT = sys.argv[1], sys.argv[2]
DEBUG = sys.argv[3] if len(sys.argv) > 3 else None
W, H = 480, 270

town = Image.open(TOWN_PATH).convert('RGBA')
tiles = Image.open(f'{OUT}/tiles.png').convert('RGBA')
food = Image.open(f'{OUT}/food.png').convert('RGBA')


def tt(i):  # Tiny Town tile, 16x16
    return town.crop(((i % 12) * 16, (i // 12) * 16, (i % 12) * 16 + 16, (i // 12) * 16 + 16))


def pt(i):  # Pixel Platformer tile, 18x18
    return tiles.crop(((i % 20) * 18, (i // 20) * 18, (i % 20) * 18 + 18, (i // 20) * 18 + 18))


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def recolor(im, mapping):
    m = {hexc(k)[:3]: hexc(v) for k, v in mapping.items()}
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            p = px[x, y]
            if p[3] and p[:3] in m:
                px[x, y] = m[p[:3]][:3] + (p[3],)
    return out


def compose(rows):  # a building made of Tiny Town tiles
    im = Image.new('RGBA', (len(rows[0]) * 16, len(rows) * 16))
    for r, row in enumerate(rows):
        for c, i in enumerate(row):
            im.alpha_composite(tt(i), (c * 16, r * 16))
    return im


def outline(shape, color):
    """Shape with a 1px outline around its opaque pixels."""
    a = shape.getchannel('A').point(lambda v: 255 if v else 0)
    grown = a.filter(ImageFilter.MaxFilter(3))
    edge = ImageChops.subtract(grown, a)
    out = Image.new('RGBA', shape.size)
    out.paste(Image.new('RGBA', shape.size, hexc(color)), (0, 0), edge)
    out.alpha_composite(shape)
    return out


# --- Themes -------------------------------------------------------------------------------------
# Colour swaps from the green "flowers" originals to each theme.
LEVEL_SWAP = {
    'candy': {
        '#cb815e': '#8f5a3c', '#9f5a52': '#6e4230', '#f4ac66': '#ff9ed2', '#7e3125': '#5a3424',
        '#fcc782': '#fff2a8', '#e29f7b': '#c58a64', '#2eb082': '#ff7ebf', '#36e377': '#ffb3dc',
        '#345551': '#b34a86', '#434a5f': '#5b2a48', '#dd442c': '#ffffff', '#fc683b': '#ff6fa8',
        '#8cd17e': '#f6a9d1', '#ffffff': '#fff3fa',
    },
    'snow': {
        '#cb815e': '#9db4d0', '#9f5a52': '#7590b3', '#f4ac66': '#e3f3ff', '#7e3125': '#5a6f94',
        '#fcc782': '#ffffff', '#e29f7b': '#b8cce0', '#2eb082': '#cfe3f2', '#36e377': '#ffffff',
        '#345551': '#7f98b8', '#434a5f': '#3f4f70', '#dd442c': '#e8f4ff', '#fc683b': '#bcd8f0',
        '#8cd17e': '#d3e5f2',
    },
    'stars': {
        '#cb815e': '#3d3470', '#9f5a52': '#2c2556', '#f4ac66': '#ffe066', '#7e3125': '#241d47',
        '#fcc782': '#fff3b0', '#e29f7b': '#5a4c94', '#2eb082': '#6550c9', '#36e377': '#8d7bea',
        '#345551': '#3b2d7a', '#434a5f': '#1f1a3a', '#dd442c': '#5fe3ff', '#fc683b': '#a8f2ff',
        '#8cd17e': '#4a3d8f', '#ffffff': '#6d5fb5',
    },
    'fire': {
        '#cb815e': '#5a3a3e', '#9f5a52': '#40282e', '#f4ac66': '#ff9a3c', '#7e3125': '#2a1a20',
        '#fcc782': '#ffd27a', '#e29f7b': '#7a4a44', '#2eb082': '#6b4658', '#36e377': '#8f6274',
        '#345551': '#3a2433', '#434a5f': '#24161f', '#dd442c': '#ff6a1a', '#fc683b': '#ffb347',
        '#8cd17e': '#7a3a4a', '#ffffff': '#c98a7a',
    },
}
PILLAR_SWAP = {
    'candy': {'#cb815e': '#ffb3d9', '#9f5a52': '#e07fb3', '#f4ac66': '#ffe6f3', '#434a5f': '#7a3a62',
              '#2eb082': '#ff7ebf', '#36e377': '#ffb3dc'},
    'snow': {'#cb815e': '#a8dcf5', '#9f5a52': '#78b6e0', '#f4ac66': '#e8f8ff', '#434a5f': '#3f5f86',
             '#2eb082': '#cfe3f2', '#36e377': '#ffffff'},
    'stars': LEVEL_SWAP['stars'],
    'fire': LEVEL_SWAP['fire'],
}
MAP_SWAP = {
    'flowers': {},
    'candy': {'#84c669': '#f9b8d8', '#65a556': '#ec95c3', '#8bd87d': '#ffd3ea', '#479f4a': '#d9659f',
              '#c34b35': '#d9468f', '#f28462': '#ff9fcf', '#e84537': '#ff6fa8', '#e38628': '#ff8fc8', '#fdbe53': '#ffc8e4',
              '#f3d58f': '#fff0c2', '#d9b46e': '#f0cf8a', '#b98b52': '#d8a868'},
    'snow': {'#84c669': '#f2f7fc', '#65a556': '#d3e3f1', '#8bd87d': '#ffffff', '#479f4a': '#3f8f6a',
             '#f3d58f': '#e6f1f9', '#d9b46e': '#bcd3e6', '#b98b52': '#93aac4', '#5a6988': '#7b8fb0',
             '#8b9bb4': '#e8f0f8', '#52607c': '#b9c8da'},
    'fire': {'#84c669': '#6b4b5e', '#65a556': '#57394c', '#8bd87d': '#80596f', '#479f4a': '#3f2838',
             '#f3d58f': '#8a6a5e', '#d9b46e': '#6e5249', '#b98b52': '#4e3832'},
    'stars': {'#84c669': '#6a5bc0', '#65a556': '#5547a6', '#8bd87d': '#8070d6', '#479f4a': '#3e3488',
              '#e38628': '#ffd84a', '#fdbe53': '#fff0a0', '#5a6988': '#6b4fb0', '#8b9bb4': '#9c7fe0',
              '#52607c': '#4f3c8f', '#e84537': '#5fe3ff', '#ff706d': '#a8f2ff', '#f3d58f': '#d8cff2', '#d9b46e': '#b3a6e0', '#b98b52': '#8d7fc4'},
}

def orig(name):  # the green original, before or after it was renamed to *-flowers.png
    p = f'{OUT}/{name}-flowers.png'
    return p if os.path.exists(p) else f'{OUT}/{name}.png'


# --- Level art ----------------------------------------------------------------------------------
for name in ['ground', 'hills', 'pillar-top', 'pillar-bottom']:
    src = Image.open(orig(name)).convert('RGBA')
    src.save(f'{OUT}/{name}-flowers.png')
    for theme in ['candy', 'snow', 'stars', 'fire']:
        swap = PILLAR_SWAP[theme] if name.startswith('pillar') else LEVEL_SWAP[theme]
        out = recolor(src, swap)
        if name == 'ground':
            # A few theme things standing on the grass (decor row is the top 18 px).
            extra = {'candy': [(food, 2, 18)], 'snow': [(tiles, 145, 18)], 'stars': [], 'fire': []}[theme]
            for sheet, frame, size in extra:
                cols = sheet.width // size
                img = sheet.crop(((frame % cols) * size, (frame // cols) * size,
                                  (frame % cols) * size + size, (frame // cols) * size + size))
                for x in (60, 250, 380):
                    out.alpha_composite(img, (x, 0))
        out.save(f'{OUT}/{name}-{theme}.png')

# Falling things: raindrop, pink sugar drop, snowflake, shooting star (all 12x16, body near the bottom).
drop = Image.open(orig('drop')).convert('RGBA')
drop.save(f'{OUT}/drop-flowers.png')
recolor(drop, {'#7ec8f5': '#ff9ed2', '#2b5d9b': '#b3407f', '#d6f1ff': '#ffe3f2', '#ff9fc0': '#ff5f9f'}).save(
    f'{OUT}/drop-candy.png')
# A little ember for the fire theme.
recolor(drop, {'#7ec8f5': '#ff8a2a', '#2b5d9b': '#a8321a', '#d6f1ff': '#ffe08a', '#ff9fc0': '#ff5a3a'}).save(
    f'{OUT}/drop-fire.png')

flake = Image.new('RGBA', (12, 16))
d = ImageDraw.Draw(flake)
c = (5.5, 9.5)
for a, b in [((5, 4), (6, 15)), ((0, 9), (11, 10))]:
    d.rectangle([a, b], fill=hexc('#ffffff'))
for dx, dy in [(-1, -1), (1, 1), (-1, 1), (1, -1)]:
    for k in range(1, 5):
        x, y = int(c[0] + dx * k + (dx > 0)), int(c[1] + dy * k + (dy > 0))
        d.point((x, y), fill=hexc('#ffffff'))
flake = outline(flake, '#5b8fc7')
flake.putpixel((4, 9), hexc('#2b4f7b'))
flake.putpixel((7, 9), hexc('#2b4f7b'))
flake.save(f'{OUT}/drop-snow.png')

star = Image.new('RGBA', (12, 16))
d = ImageDraw.Draw(star)
pts = [(5.5, 3), (7, 7), (11, 7.5), (8, 10.5), (9, 15), (5.5, 12.5), (2, 15), (3, 10.5), (0, 7.5), (4, 7)]
d.polygon(pts, fill=hexc('#ffd84a'))
star = outline(star.crop((0, 0, 12, 16)), '#b5651d')
for p in [(4, 9), (7, 9)]:
    star.putpixel(p, hexc('#5a3a1a'))
star.putpixel((5, 5), hexc('#fff6c0'))
star.save(f'{OUT}/drop-stars.png')

# --- World map ----------------------------------------------------------------------------------
SEA = hexc('#5bc0eb')
SHALLOW = hexc('#86d6f2')
FOAM = hexc('#e6fbff')
SAND, SAND_DARK, CLIFF = hexc('#f3d58f'), hexc('#d9b46e'), hexc('#b98b52')

ISLANDS = [
    {'theme': 'flowers', 'blobs': [(92, 200, 74, 46), (54, 214, 40, 28), (132, 186, 44, 32)],
     'stations': [(40, 222), (88, 228), (136, 208)]},
    {'theme': 'candy', 'blobs': [(210, 96, 66, 40), (176, 110, 38, 26), (246, 84, 34, 26)],
     'stations': [(176, 118), (214, 112), (250, 94)]},
    {'theme': 'snow', 'blobs': [(320, 196, 68, 42), (286, 184, 36, 28), (354, 212, 38, 24)],
     'stations': [(286, 198), (322, 216), (364, 206)]},
    {'theme': 'stars', 'blobs': [(414, 100, 58, 42), (440, 86, 32, 28), (388, 116, 34, 24)],
     'stations': [(384, 122), (416, 128), (456, 118)]},
    # The volcano island, where the fire dragon waits after all the others.
    {'theme': 'fire', 'blobs': [(446, 214, 30, 22), (430, 226, 18, 12)],
     'stations': [(452, 226)]},
]
SHOP = {'island': 0, 'x': 84, 'y': 186}  # bottom-centre of the shop house (Phaser places the sprite)

# Decorations per island: (picture, x, y) with x/y the bottom-centre, drawn in y order.
HOUSE_BLUE = compose([[48, 49, 50], [60, 63, 62], [72, 85, 75]])
HOUSE_SMALL = compose([[52, 54], [64, 67], [84, 85]])
HOUSE_STONE = compose([[48, 50], [60, 62], [89, 88]])
SHOP_HOUSE = compose([[52, 55, 54], [64, 67, 66], [76, 89, 79]])
TALL_PINE, TALL_AUTUMN = compose([[4], [16]]), compose([[3], [15]])
TREE, BUSH, SMALL_PINE, MUSHROOMS, SPROUT = tt(16), tt(5), tt(28), tt(29), tt(17)
HIVE, WELL, SIGN = tt(94), tt(92), tt(83)
SNOWMAN = pt(145)
CAKE, MARSHMALLOW = (food.crop((36, 0, 54, 18)), food.crop((54, 0, 72, 18)))


def volcano():
    im = Image.new('RGBA', (40, 30))
    d = ImageDraw.Draw(im)
    d.polygon([(1, 29), (14, 5), (26, 5), (39, 29)], fill=hexc('#5e4450'))
    d.polygon([(21, 5), (26, 5), (39, 29), (25, 29)], fill=hexc('#4a3440'))
    d.rectangle([14, 4, 26, 6], fill=hexc('#ff7a2a'))
    d.rectangle([16, 3, 24, 4], fill=hexc('#ffd84a'))
    d.line([(17, 7), (15, 13), (16, 18)], fill=hexc('#ff7a2a'))
    d.line([(23, 7), (25, 14), (24, 17)], fill=hexc('#ff9a3c'))
    return outline(im, '#2a1a20')


VOLCANO = volcano()
ROCK = outline(Image.new('RGBA', (5, 4), hexc('#4a3440')), '#2a1a20')

DECOR = [
    [(TALL_PINE, 30, 206), (SMALL_PINE, 58, 200), (TREE, 128, 178), (BUSH, 158, 198), (HIVE, 22, 234),
     (MUSHROOMS, 114, 242), (SPROUT, 162, 214), (SPROUT, 60, 244)],
    [(HOUSE_SMALL, 198, 84), (BUSH, 162, 100), (TALL_AUTUMN, 232, 72), (TREE, 266, 84), (CAKE, 150, 116),
     (MARSHMALLOW, 272, 106), (CAKE, 240, 128), (SMALL_PINE, 196, 134)],
    [(HOUSE_BLUE, 338, 180), (TALL_PINE, 266, 180), (TALL_PINE, 300, 172), (SNOWMAN, 298, 232),
     (SMALL_PINE, 382, 192), (SMALL_PINE, 258, 202), (SNOWMAN, 384, 222)],
    [(HOUSE_STONE, 430, 90), (TREE, 394, 96), (TALL_PINE, 466, 98), (MUSHROOMS, 404, 138), (BUSH, 372, 108)],
    [(VOLCANO, 440, 214), (ROCK, 468, 214), (ROCK, 424, 230)],
]


def blob_mask(blobs):
    m = Image.new('L', (W, H))
    d = ImageDraw.Draw(m)
    for cx, cy, rx, ry in blobs:
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return m


def grow(mask, n):
    for _ in range(n):
        mask = mask.filter(ImageFilter.MaxFilter(3))
    return mask


def shrink(mask, n):
    for _ in range(n):
        mask = mask.filter(ImageFilter.MinFilter(3))
    return mask


rng = random.Random(7)
sea = Image.new('RGBA', (W, H), SEA)
d = ImageDraw.Draw(sea)
for _ in range(70):  # little wave marks
    x, y = rng.randrange(0, W), rng.randrange(30, H)
    d.line([(x, y), (x + 2, y - 1), (x + 4, y)], fill=hexc('#7dcff0'))

masks = [blob_mask(i['blobs']) for i in ISLANDS]
for m in masks:
    shallow = grow(m, 7)
    sea.paste(SHALLOW, (0, 0), shallow)
    sea.paste(FOAM, (0, 0), ImageChops.subtract(grow(m, 2), m))

island_layers = []
for idx, (isl, m) in enumerate(zip(ISLANDS, masks)):
    layer = Image.new('RGBA', (W, H))
    top = ImageChops.offset(m, 0, -5)  # the flat top; the 5px below it is the cliff
    top = ImageChops.multiply(top, m)
    layer.paste(CLIFF, (0, 0), m)
    layer.paste(SAND_DARK, (0, 0), ImageChops.offset(top, 0, 2))
    layer.paste(SAND, (0, 0), top)
    grass = shrink(top, 4)
    tex = Image.new('RGBA', (W, H))
    for ty in range(0, H, 16):
        for tx in range(0, W, 16):
            tex.alpha_composite(tt(rng.choice([0, 0, 0, 1, 1, 2] if isl['theme'] == 'flowers' else [0, 0, 0, 1])),
                                (tx, ty))
    layer.paste(tex, (0, 0), grass)
    for pic, x, y in sorted(DECOR[idx], key=lambda e: e[2]):
        layer.alpha_composite(pic, (x - pic.width // 2, y - pic.height))
    layer = recolor(layer, MAP_SWAP[isl['theme']])
    sea.alpha_composite(layer)

sea.save(f'{OUT}/map.png')
recolor(SHOP_HOUSE, {}).save(f'{OUT}/shop-house.png')

# --- The fire dragon ----------------------------------------------------------------------------
# Chili (row 1 of dragons.png) in dark purple with glowing orange and angry red eyes, 3 flying
# frames of 67x52.
dragons = Image.open(f'{OUT}/dragons.png').convert('RGBA')
chili = dragons.crop((0, 52, 201, 104))
BOSS_SWAP = {
    '#911f1b': '#4a3560', '#350907': '#140a1c', '#621412': '#33244a', '#ad2622': '#62477c',
    '#c43028': '#ff8a2a', '#6a120f': '#2e2042', '#501512': '#24183a', '#541210': '#24183a',
    '#7d1b18': '#3e2c56', '#90201b': '#4a3560', '#621712': '#33244a', '#4f160e': '#24183a',
    '#ffffff': '#ff2a2a',  # the eyes
}
boss = recolor(chili, BOSS_SWAP)
px = boss.load()
for y in range(boss.height):  # whatever reddish pixels are left become dark purple too
    for x in range(boss.width):
        r, g, b, a = px[x, y]
        if a and r > g + 30 and r > b + 30 and (r, g, b) not in [hexc('#ff8a2a')[:3], hexc('#ff2a2a')[:3]]:
            px[x, y] = (r // 3 + 30, g // 3 + 20, b // 3 + 50, a)
boss.save(f'{OUT}/boss-dragon.png')

print(json.dumps({'stations': [i['stations'] for i in ISLANDS], 'shop': SHOP}))

if DEBUG:
    dbg = sea.copy()
    d = ImageDraw.Draw(dbg)
    for isl in ISLANDS:
        for x, y in isl['stations']:
            d.ellipse([x - 6, y - 4, x + 6, y + 4], outline=(255, 0, 0, 255))
    dbg.alpha_composite(SHOP_HOUSE, (SHOP['x'] - 24, SHOP['y'] - 48))
    dbg.resize((W * 3, H * 3), Image.NEAREST).save(DEBUG)
