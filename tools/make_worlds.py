"""Draw the pictures for the island groups after the first one (Dragon Flight).

Usage: python -I tools/make_worlds.py <tiny-town tilemap_packed.png> public/assets [debug-folder]

Needs Pillow and Kenney's Tiny Town pack (like tools/make_assets.py). Reads the green *-flowers.png
level pictures from the assets folder and writes, for every new island theme, its ground, hills,
pillars and falling thing, the critters that fly at you, the bosses, and one map per island group.
Everything is seeded, so running it again gives the same pictures. The map positions in WORLDS below
must match src/world.js. With a debug folder, it also writes big previews there.
"""
import os
import random
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

TOWN_PATH, OUT = sys.argv[1], sys.argv[2]
DEBUG = sys.argv[3] if len(sys.argv) > 3 else None
W, H = 480, 270
LINE = '#2b1d2e'  # the dark outline around critters and falling things

town = Image.open(TOWN_PATH).convert('RGBA')


def tt(i):  # Tiny Town tile, 16x16
    return town.crop(((i % 12) * 16, (i // 12) * 16, (i % 12) * 16 + 16, (i // 12) * 16 + 16))


def hexc(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


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


def outline(shape, color=LINE):
    """Shape with a 1px outline around its opaque pixels."""
    a = shape.getchannel('A').point(lambda v: 255 if v else 0)
    edge = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(3)), a)
    out = Image.new('RGBA', shape.size)
    out.paste(Image.new('RGBA', shape.size, hexc(color)), (0, 0), edge)
    out.alpha_composite(shape)
    return out


def pic(w, h, paint, line=True):
    """A small picture: paint(d) draws on a w x h canvas, then it gets the dark outline. The picture
    is 2 pixels bigger than the canvas, so the outline fits all around."""
    im = Image.new('RGBA', (w, h))
    paint(ImageDraw.Draw(im))
    padded = Image.new('RGBA', (w + 2, h + 2))
    padded.paste(im, (1, 1))
    return outline(padded) if line else padded


def face(d, x, y, blush=True):
    """A cute face looking left: an eye at (x, y) and a pink cheek below it."""
    d.rectangle([x, y, x, y + 1], fill=hexc(LINE))
    if blush:
        d.point((x + 1, y + 3), fill=hexc('#ff8fb0'))


def strip(frames):
    """Frames side by side, for a spritesheet."""
    w, h = frames[0].size
    out = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames):
        out.alpha_composite(f, (i * w, 0))
    return out


def save(im, name):
    im.save(f'{OUT}/{name}.png')
    if DEBUG:
        k = 2 if im.width > 200 else 6
        im.resize((im.width * k, im.height * k), Image.NEAREST).save(f"{DEBUG}/{name}.png")


def orig(name):
    return Image.open(f'{OUT}/{name}-flowers.png').convert('RGBA')


# --- Level pictures per theme ------------------------------------------------------------------
# Colour swaps from the green "flowers" originals (ground, hills, pillars).
GROUND = ['#cb815e', '#9f5a52', '#f4ac66', '#7e3125', '#fcc782', '#e29f7b', '#2eb082', '#36e377',
          '#345551', '#434a5f', '#dd442c', '#fc683b', '#8cd17e', '#ffffff']


def ground_swap(dirt, dirt_dark, light, darkest, lightest, mid, grass, grass_light, grass_dark, line, red, orange, hill, cloud):
    return dict(zip(GROUND, [dirt, dirt_dark, light, darkest, lightest, mid, grass, grass_light, grass_dark, line,
                             red, orange, hill, cloud]))


def pillar_swap(wall, wall_dark, wall_light, line, grass, grass_light):
    return {'#cb815e': wall, '#9f5a52': wall_dark, '#f4ac66': wall_light, '#434a5f': line,
            '#2eb082': grass, '#36e377': grass_light}


THEMES = {
    # Meeresinseln
    'beach': {
        'ground': ground_swap('#f0cf86', '#d6a95e', '#fff0c0', '#a8763c', '#fff8dc', '#e8bd74', '#f7dc96', '#fff0c0',
                              '#c99a52', '#6b4a2a', '#ff7a6a', '#ffb07a', '#5fcf9a', '#e6fbff'),
        'pillar': pillar_swap('#c9945a', '#9a6a3a', '#e8bf80', '#5a3a28', '#3fae5a', '#6fdc6f'),
    },
    'reef': {
        'ground': ground_swap('#e6c27a', '#c89e5a', '#f6dfa0', '#8a6a3a', '#fff0c8', '#d8b070', '#ff7f9f', '#ffb0c4',
                              '#c4507a', '#4a3050', '#ffd84a', '#ff9fd0', '#2c8fbf', '#62c3e8'),
        'pillar': pillar_swap('#ff8a7a', '#d9586a', '#ffc0b0', '#7a2a40', '#ff9fd0', '#ffd0e6'),
    },
    'treasure': {
        'ground': ground_swap('#c98d52', '#9c6436', '#e8b878', '#6e4122', '#f3d29a', '#b67a46', '#3f9f4a', '#6fd06a',
                              '#2b6e3a', '#3a2a20', '#e84537', '#ffd84a', '#e8a060', '#fff3e0'),
        'pillar': pillar_swap('#a0703a', '#7a4f26', '#c9965a', '#3a2a20', '#3f9f4a', '#6fd06a'),
    },
    'deep': {
        'ground': ground_swap('#3d5a7a', '#2c4460', '#5a7fa0', '#1c2c44', '#7fa2c0', '#4a6a8a', '#3fa0a0', '#6fd0c8',
                              '#2a6a7a', '#141c30', '#ff9fd0', '#c9a7ff', '#1d5a8a', '#3d7fb0'),
        'pillar': pillar_swap('#4a6a8a', '#2c4460', '#6a8fb0', '#141c30', '#3fa0a0', '#6fd0c8'),
    },
}

for theme, swaps in THEMES.items():
    save(recolor(orig('ground'), swaps['ground']), f'ground-{theme}')
    save(recolor(orig('hills'), swaps['ground']), f'hills-{theme}')
    for name in ['pillar-top', 'pillar-bottom']:
        save(recolor(orig(name), swaps['pillar']), f'{name}-{theme}')


# --- Falling things (go puff when they hit something) ------------------------------------------
def coconut(d):
    d.ellipse([1, 1, 12, 12], fill=hexc('#8a5a34'))
    d.ellipse([2, 2, 9, 8], fill=hexc('#a8703f'))
    for x, y in [(4, 3), (7, 3), (5, 6)]:
        d.point((x, y), fill=hexc('#4a2e18'))
    d.point((3, 3), fill=hexc('#d9a370'))
    face(d, 4, 8, blush=False)
    face(d, 8, 8, blush=False)


def bubble(d):
    d.ellipse([1, 1, 12, 12], fill=hexc('#bff4ff', 110), outline=hexc('#e8fdff'))
    d.rectangle([4, 3, 5, 4], fill=hexc('#ffffff'))
    d.point((9, 9), fill=hexc('#ffffff'))


def cannonball(d):
    d.ellipse([1, 1, 12, 12], fill=hexc('#55556e'))
    d.ellipse([2, 2, 9, 9], fill=hexc('#73738c'))
    d.rectangle([4, 3, 5, 4], fill=hexc('#c0c0d8'))
    face(d, 4, 7)
    face(d, 8, 7, blush=False)


def ink(d):  # the octopus's ink blob
    d.ellipse([1, 2, 12, 12], fill=hexc('#4a2f78'))
    d.polygon([(4, 3), (7, 0), (9, 3)], fill=hexc('#4a2f78'))
    d.rectangle([4, 5, 5, 6], fill=hexc('#9a7ad0'))


save(pic(14, 14, coconut), 'drop-beach')
save(pic(14, 14, bubble, line=False), 'drop-reef')
save(pic(14, 14, cannonball), 'drop-treasure')
save(outline(pic(14, 14, ink, line=False), '#e9d6ff'), 'drop-deep')  # light edge: it flies over dark water


# --- Critters (two frames each, looking left) --------------------------------------------------
def gull(up):
    def paint(d):
        d.polygon([(17, 8), (23, 7), (23, 11), (17, 11)], fill=hexc('#c8d2dc'))  # tail
        d.ellipse([5, 6, 19, 13], fill=hexc('#ffffff'))  # body
        d.ellipse([2, 3, 10, 10], fill=hexc('#ffffff'))  # head
        d.polygon([(0, 7), (3, 6), (3, 8)], fill=hexc('#ffb13b'))  # beak
        if up:
            d.polygon([(9, 8), (13, 0), (17, 1), (15, 8)], fill=hexc('#c8d2dc'))
            d.line([(13, 0), (17, 1)], fill=hexc('#7a8a9a'))
        else:
            d.polygon([(9, 9), (13, 15), (17, 14), (15, 9)], fill=hexc('#c8d2dc'))
            d.line([(13, 15), (17, 14)], fill=hexc('#7a8a9a'))
        face(d, 4, 5)
    return pic(24, 16, paint)


def fish(up):
    def paint(d):
        d.polygon([(15, 7), (21, 1 if up else 3), (21, 13 if up else 11)], fill=hexc('#ff8a2a'))  # tail
        d.ellipse([1, 2, 17, 12], fill=hexc('#ffb13b'))  # body
        d.line([(9, 3), (9, 11)], fill=hexc('#ffffff'), width=2)  # stripe
        d.line([(13, 4), (13, 10)], fill=hexc('#ffffff'))
        d.polygon([(7, 2), (11, 0), (12, 3)], fill=hexc('#ff8a2a'))  # fin
        face(d, 4, 5)
    return pic(22, 14, paint)


def parrot(up):
    def paint(d):
        d.polygon([(14, 11), (21, 16), (19, 18), (13, 13)], fill=hexc('#3a8cff'))  # tail
        d.ellipse([4, 5, 17, 15], fill=hexc('#e8423f'))  # body
        d.ellipse([1, 2, 10, 11], fill=hexc('#e8423f'))  # head
        d.polygon([(0, 6), (2, 5), (3, 9), (1, 9)], fill=hexc('#ffd84a'))  # beak
        if up:
            d.polygon([(8, 8), (11, 0), (16, 1), (15, 9)], fill=hexc('#3a8cff'))
            d.line([(11, 1), (15, 2)], fill=hexc('#ffd84a'))
        else:
            d.polygon([(8, 10), (11, 17), (16, 17), (15, 10)], fill=hexc('#3a8cff'))
            d.line([(11, 16), (15, 16)], fill=hexc('#ffd84a'))
        face(d, 4, 4)
    return pic(22, 20, paint)


save(strip([gull(True), gull(False)]), 'critter-gull')
save(strip([fish(True), fish(False)]), 'critter-fish')
save(strip([parrot(True), parrot(False)]), 'critter-parrot')


# --- Bosses ------------------------------------------------------------------------------------
def octopus(frame):
    """Tinti the giant octopus, 64x56, looking left. frame 0-2 moves the tentacles."""
    def paint(d):
        body, dark, light = hexc('#c86ad8'), hexc('#9a4ab0'), hexc('#e9a6f0')
        wave = [0, 2, 4][frame]
        for i in range(6):  # tentacles below the head, swinging
            x = 10 + i * 8
            sway = (wave if i % 2 else 4 - wave) - 2
            pts = [(x, 30), (x + 6, 30), (x + 7 + sway, 42), (x + 5 + sway * 2, 52), (x + 1 + sway * 2, 54),
                   (x + 2 + sway, 42)]
            d.polygon(pts, fill=dark if i % 2 else body)
            for k in range(3):
                d.point((x + 3 + sway, 36 + k * 5), fill=light)
        d.ellipse([6, 2, 58, 38], fill=body)  # head
        d.ellipse([12, 6, 30, 16], fill=light)  # shine
        for x, y in [(40, 10), (48, 18), (44, 26)]:  # spots
            d.ellipse([x, y, x + 4, y + 3], fill=dark)
        for ex in (14, 28):  # big eyes looking left
            d.ellipse([ex, 18, ex + 9, 28], fill=hexc('#ffffff'))
            d.rectangle([ex + 1, 21, ex + 4, 26], fill=hexc(LINE))
            d.point((ex + 2, 22), fill=hexc('#ffffff'))
        d.line([(15, 16), (22, 17)], fill=hexc(LINE))  # cheeky eyebrows
        d.line([(29, 17), (36, 16)], fill=hexc(LINE))
        d.ellipse([10, 28, 15, 31], fill=hexc('#ff8fb0'))  # cheeks
        d.ellipse([36, 28, 41, 31], fill=hexc('#ff8fb0'))
        d.ellipse([20, 30, 28, 35], fill=hexc('#7a2a6a'))  # o-shaped mouth (it spits ink)
    return pic(64, 56, paint)


save(strip([octopus(0), octopus(1), octopus(2)]), 'boss-octopus')


# --- Maps of the island groups -----------------------------------------------------------------
SAND, SAND_DARK, CLIFF = hexc('#f3d58f'), hexc('#d9b46e'), hexc('#b98b52')
GRASS = ['#84c669', '#65a556', '#8bd87d', '#479f4a']  # the Tiny Town grass colours


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


# Map decorations (drawn small, x/y is the bottom middle when placed).
def palm():
    def paint(d):
        for i, (x, y) in enumerate([(9, 21), (9, 18), (8, 15), (8, 12), (7, 9)]):
            d.rectangle([x, y - 3, x + 2, y], fill=hexc('#a8703f' if i % 2 else '#8a5a34'))
        for pts in [[(8, 7), (0, 9), (2, 6)], [(8, 7), (16, 9), (14, 5)], [(8, 7), (3, 2), (7, 2)],
                    [(8, 7), (13, 2), (10, 1)]]:
            d.polygon(pts, fill=hexc('#3fae5a'))
        d.point((8, 8), fill=hexc('#6b4a2a'))
        d.point((10, 8), fill=hexc('#6b4a2a'))
    return pic(18, 23, paint)


def shell():
    return pic(7, 6, lambda d: (d.pieslice([0, 0, 6, 9], 180, 360, fill=hexc('#ffb0c4')),
                                d.line([(3, 1), (3, 4)], fill=hexc('#ff7f9f'))))


def starfish():
    return pic(7, 7, lambda d: d.polygon([(3, 0), (4, 2), (6, 2), (5, 4), (6, 6), (3, 5), (0, 6), (1, 4), (0, 2), (2, 2)],
                                         fill=hexc('#ff8a5a')))


def coral(color):
    def paint(d):
        c = hexc(color)
        d.line([(5, 12), (5, 4)], fill=c, width=2)
        d.line([(5, 8), (1, 4), (1, 1)], fill=c, width=2)
        d.line([(5, 7), (9, 3), (9, 0)], fill=c, width=2)
    return pic(12, 13, paint)


def chest():
    def paint(d):
        d.rectangle([0, 4, 11, 9], fill=hexc('#a0703a'))
        d.pieslice([0, 0, 11, 8], 180, 360, fill=hexc('#c9965a'))
        d.rectangle([0, 4, 11, 4], fill=hexc('#ffd84a'))
        d.rectangle([5, 4, 6, 6], fill=hexc('#ffd84a'))
    return pic(12, 10, paint)


def flag():
    def paint(d):
        d.line([(1, 0), (1, 14)], fill=hexc('#6b4a2a'), width=2)
        d.polygon([(2, 1), (10, 3), (2, 6)], fill=hexc('#e84537'))
        d.point((5, 3), fill=hexc('#ffffff'))
    return pic(12, 15, paint)


def rock(w, h, color='#7a8a9a'):
    return pic(w, h, lambda d: d.ellipse([0, 0, w - 1, h + 3], fill=hexc(color)))


def tentacle(flip=False):
    def paint(d):
        d.line([(3, 14), (2, 9), (4, 4), (7, 2), (8, 4)], fill=hexc('#c86ad8'), width=3)
        d.point((3, 8), fill=hexc('#e9a6f0'))
        d.point((4, 11), fill=hexc('#e9a6f0'))
    im = pic(11, 16, paint)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im


BUSH = tt(5)

# One map per island group. Positions must match WORLDS in src/world.js.
#   sea, wave: the water colours. islands: blobs (x, y, radius x, radius y), grass colour swap,
#   decor (picture, x, y with x/y the bottom middle). little: small rocks for the gate back.
WORLDS = [
    {
        'name': 'map-sea',
        'sea': '#3fb3dc', 'wave': '#6ccbea', 'shallow': '#7fd6ef', 'foam': '#e6fbff', 'seed': 21,
        'islands': [
            {'blobs': [(100, 194, 80, 44), (58, 210, 40, 28), (146, 202, 40, 30)],
             'grass': ['#f7dc96', '#ecc878', '#fff0c0', '#d9b05a'],
             'decor': [(palm(), 28, 214), (palm(), 160, 190), (shell(), 72, 236), (starfish(), 128, 232),
                       (palm(), 136, 172), (shell(), 170, 218)]},
            {'blobs': [(230, 98, 68, 40), (196, 108, 36, 26), (268, 92, 34, 26)],
             'grass': ['#ffb0c4', '#ff8fae', '#ffd0dc', '#e0607e'],
             'decor': [(coral('#ff7f9f'), 206, 92), (coral('#ffb13b'), 252, 84), (coral('#c86ad8'), 286, 104),
                       (starfish(), 236, 132), (shell(), 172, 120), (coral('#ff7f9f'), 228, 80)]},
            {'blobs': [(338, 202, 70, 42), (302, 192, 34, 26), (378, 212, 36, 24)],
             'grass': GRASS,
             'decor': [(palm(), 296, 182), (palm(), 362, 190), (chest(), 336, 192), (flag(), 388, 198),
                       (BUSH, 316, 236), (palm(), 404, 222)]},
            # Krakeninsel, the boss island: dark rocks, with tentacles poking out of the water.
            {'blobs': [(426, 104, 34, 24), (446, 116, 18, 12)],
             'grass': ['#7a8a9a', '#65758a', '#8a9aaa', '#4a5a70'],
             'decor': [(rock(14, 10, '#55607a'), 404, 102), (rock(10, 8, '#55607a'), 452, 124),
                       (tentacle(), 388, 128), (tentacle(True), 466, 136), (tentacle(), 470, 82)]},
        ],
        'little': [(26, 46, 14, 9)],
    },
]

for world in WORLDS:
    rng = random.Random(world['seed'])
    sea = Image.new('RGBA', (W, H), hexc(world['sea']))
    d = ImageDraw.Draw(sea)
    for _ in range(70):  # little wave marks
        x, y = rng.randrange(0, W), rng.randrange(30, H)
        d.line([(x, y), (x + 2, y - 1), (x + 4, y)], fill=hexc(world['wave']))
    islands = world['islands'] + [{'blobs': [b], 'grass': ['#7a8a9a'] * 4, 'decor': []} for b in world['little']]
    masks = [blob_mask(i['blobs']) for i in islands]
    for m in masks:
        sea.paste(hexc(world['shallow']), (0, 0), grow(m, 7))
    for m in masks:
        sea.paste(hexc(world['foam']), (0, 0), ImageChops.subtract(grow(m, 2), m))
    for isl, m in zip(islands, masks):
        layer = Image.new('RGBA', (W, H))
        top = ImageChops.multiply(ImageChops.offset(m, 0, -5), m)  # the flat top; 5px of cliff below
        layer.paste(CLIFF, (0, 0), m)
        layer.paste(SAND_DARK, (0, 0), ImageChops.offset(top, 0, 2))
        layer.paste(SAND, (0, 0), top)
        tex = Image.new('RGBA', (W, H))
        for ty in range(0, H, 16):
            for tx in range(0, W, 16):
                tex.alpha_composite(tt(rng.choice([0, 0, 0, 1])), (tx, ty))
        layer.paste(tex, (0, 0), shrink(top, 4))
        layer = recolor(layer, dict(zip(GRASS, isl['grass'])))
        for thing, x, y in sorted(isl['decor'], key=lambda e: e[2]):
            layer.alpha_composite(thing, (x - thing.width // 2, y - thing.height))
        sea.alpha_composite(layer)
    save(sea, world['name'])
