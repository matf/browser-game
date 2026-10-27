"""Draw the pictures for the island groups after the first one (Dragon Flight).

Usage: python -I tools/make_worlds.py <tiny-town tilemap_packed.png> public/assets [debug-folder]

Needs Pillow and Kenney's Tiny Town pack (like tools/make_assets.py). Reads the green *-flowers.png
level pictures from the assets folder and writes, for every new island theme, its ground, hills,
pillars and falling thing, the critters that fly at you, the bosses, one map per island group and
the big island-<theme>.png of each level island (island view, for building).
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
    # Himmelsinseln
    'cloud': {
        'ground': ground_swap('#e8f2ff', '#c8d8f0', '#ffffff', '#9fb2d8', '#ffffff', '#d8e6f8', '#f4f8ff', '#ffffff',
                              '#b8c8e8', '#6a7aa8', '#ffd84a', '#ffe9a0', '#d8ecff', '#ffffff'),
        'pillar': pillar_swap('#dfe9f8', '#b5c6e2', '#ffffff', '#6a7aa8', '#ffffff', '#ffffff'),
    },
    'colors': {
        'ground': ground_swap('#c9a7ff', '#a07ad8', '#e6d6ff', '#7a52b0', '#f4ecff', '#b894ec', '#ff9fd0', '#ffd0e8',
                              '#d0609a', '#4a2a6a', '#5fe3ff', '#ffe066', '#a8f0c8', '#ffffff'),
        'pillar': pillar_swap('#ffd84a', '#ffb13b', '#fff3a0', '#8a4a20', '#5fd068', '#a8f0a0'),
    },
    'moon': {
        'ground': ground_swap('#8a8aa8', '#6a6a88', '#b0b0c8', '#4a4a68', '#d0d0e0', '#7a7a98', '#c8c8dc', '#e8e8f4',
                              '#8a8aa8', '#2a2a44', '#ffd84a', '#fff3b0', '#3a3a68', '#5a5a90'),
        'pillar': pillar_swap('#9a9ab8', '#70708e', '#c8c8dc', '#2a2a44', '#c8c8dc', '#e8e8f4'),
    },
    'storm': {
        'ground': ground_swap('#5a6080', '#454a68', '#7a80a0', '#2c3050', '#9aa0c0', '#50567a', '#7a80a0', '#9aa0c0',
                              '#3c4262', '#1c1f3a', '#ffe066', '#fff3b0', '#3c4262', '#5a6080'),
        'pillar': pillar_swap('#5a6080', '#454a68', '#7a80a0', '#1c1f3a', '#7a80a0', '#9aa0c0'),
    },
    # Zauberinseln
    'mushroom': {
        'ground': ground_swap('#8a5a3a', '#6a4028', '#b07a50', '#4a2a18', '#d09a68', '#7a4e32', '#7fc04a', '#a8e070',
                              '#4f8a2a', '#2a2a20', '#ff5f6f', '#ffd84a', '#c06ad8', '#e9a6f0'),
        'pillar': pillar_swap('#f3e3c8', '#d8c0a0', '#ffffff', '#5a3a28', '#e84537', '#ff8a7a'),
    },
    'spooky': {
        'ground': ground_swap('#4a3a4a', '#382a38', '#6a586a', '#241a24', '#8a788a', '#40303f', '#5a7a4a', '#7a9a62',
                              '#3a5230', '#1a141e', '#ff8a2a', '#ffd84a', '#3a2a5a', '#5a4a7a'),
        'pillar': pillar_swap('#6a5a6e', '#4a3e50', '#8a7a8e', '#1a141e', '#5a7a4a', '#7a9a62'),
    },
    'crystal': {
        'ground': ground_swap('#7ab8d8', '#5a98c0', '#a8d8f0', '#3a6a98', '#d0f0ff', '#6aa8cc', '#c8f0ff', '#ffffff',
                              '#8ac8e8', '#2a4a78', '#ff9fd0', '#c9a7ff', '#a8d8f0', '#ffffff'),
        'pillar': pillar_swap('#8fe8ff', '#5ac0e8', '#d8faff', '#2a4a78', '#ff9fd0', '#ffd0e8'),
    },
    'ghost': {
        'ground': ground_swap('#3e3058', '#2e2444', '#564678', '#1c1630', '#6e5e94', '#382a50', '#5a4a7a', '#7a6aa0',
                              '#3e3058', '#120e20', '#9fffd0', '#e8fff4', '#2e2444', '#4a3a6a'),
        'pillar': pillar_swap('#564678', '#3e3058', '#6e5e94', '#120e20', '#5a4a7a', '#7a6aa0'),
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


def hail(d):
    d.ellipse([2, 2, 10, 10], fill=hexc('#e8f6ff'))
    d.ellipse([3, 3, 7, 7], fill=hexc('#ffffff'))
    d.point((8, 8), fill=hexc('#9fc8e8'))


def color_drop(d):
    d.polygon([(6, 0), (11, 8), (1, 8)], fill=hexc('#ff5f9f'))
    d.ellipse([1, 4, 11, 13], fill=hexc('#ff5f9f'))
    d.rectangle([1, 6, 11, 7], fill=hexc('#ffd84a'))
    d.rectangle([1, 8, 11, 9], fill=hexc('#5fd068'))
    d.rectangle([2, 10, 10, 11], fill=hexc('#5fb3ff'))
    d.rectangle([4, 4, 5, 5], fill=hexc('#ffffff'))


def meteor(d):
    d.polygon([(7, 6), (13, 0), (14, 3), (10, 9)], fill=hexc('#ffb13b'))  # flame tail (it flies down-left)
    d.polygon([(8, 5), (12, 1), (12, 3)], fill=hexc('#ffe066'))
    d.ellipse([1, 4, 10, 13], fill=hexc('#8a7a8a'))
    d.ellipse([3, 6, 5, 8], fill=hexc('#6a5a6a'))
    d.point((7, 10), fill=hexc('#6a5a6a'))


def storm_ball(d):  # the storm dragon's crackling ball
    d.ellipse([2, 2, 11, 11], fill=hexc('#ffe066'))
    d.ellipse([4, 4, 9, 9], fill=hexc('#ffffff'))
    for a, b in [((0, 6), (2, 6)), ((11, 6), (13, 6)), ((6, 0), (6, 2)), ((6, 11), (6, 13))]:
        d.line([a, b], fill=hexc('#ffe066'))


def spore(d):
    d.ellipse([2, 2, 10, 10], fill=hexc('#d8f070'))
    d.ellipse([3, 3, 7, 7], fill=hexc('#f4ffb0'))
    for x, y in [(1, 6), (11, 6), (6, 1), (6, 11)]:
        d.point((x, y), fill=hexc('#d8f070'))


def pumpkin(d):
    d.ellipse([0, 3, 7, 13], fill=hexc('#e8761e'))
    d.ellipse([6, 3, 13, 13], fill=hexc('#e8761e'))
    d.ellipse([3, 3, 10, 13], fill=hexc('#ff9a3c'))
    d.rectangle([6, 0, 7, 3], fill=hexc('#4f8a2a'))
    d.polygon([(3, 6), (5, 6), (4, 8)], fill=hexc('#5a2a10'))  # friendly pumpkin face
    d.polygon([(8, 6), (10, 6), (9, 8)], fill=hexc('#5a2a10'))
    d.line([(4, 10), (6, 11), (9, 10)], fill=hexc('#5a2a10'))


def icicle(d):
    d.polygon([(0, 0), (9, 0), (5, 15)], fill=hexc('#a8e8ff'))
    d.polygon([(2, 0), (5, 0), (4, 9)], fill=hexc('#e8faff'))


def mini_ghost(d):  # the big ghost's little ghosts
    d.ellipse([1, 0, 12, 10], fill=hexc('#f4f0ff'))
    d.polygon([(1, 5), (12, 5), (12, 12), (10, 10), (8, 12), (6, 10), (4, 12), (1, 10)], fill=hexc('#f4f0ff'))
    face(d, 3, 4)
    face(d, 7, 4, blush=False)


save(pic(12, 12, hail), 'drop-cloud')
save(pic(12, 14, color_drop), 'drop-colors')
save(pic(15, 14, meteor), 'drop-moon')
save(pic(14, 14, storm_ball, line=False), 'drop-storm')
save(pic(12, 12, spore), 'drop-mushroom')
save(pic(14, 14, pumpkin), 'drop-spooky')
save(pic(10, 16, icicle), 'drop-crystal')
save(pic(14, 13, mini_ghost), 'drop-ghost')


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


def raincloud(up):
    def paint(d):
        for x, y, r in [(6, 8, 5), (12, 6, 6), (18, 8, 5)]:
            d.ellipse([x - r, y - r, x + r, y + r], fill=hexc('#9aa6c0'))
        d.rectangle([2, 8, 22, 12], fill=hexc('#9aa6c0'))
        d.ellipse([7, 2, 13, 6], fill=hexc('#c0c8dc'))
        d.line([(4, 6), (7, 7)], fill=hexc(LINE))  # grumpy eyebrows
        d.line([(10, 7), (13, 6)], fill=hexc(LINE))
        face(d, 5, 8)
        face(d, 11, 8, blush=False)
        for x in ((6, 14, 20) if up else (9, 17)):
            d.line([(x, 14), (x - 1, 16)], fill=hexc('#5fb3ff'))
    return pic(24, 17, paint)


def butterfly(up):
    def paint(d):
        if up:  # wings open above the body
            d.ellipse([4, 0, 11, 9], fill=hexc('#ff7fbf'))
            d.ellipse([9, 3, 15, 10], fill=hexc('#ffd84a'))
            d.point((7, 3), fill=hexc('#ffffff'))
        else:  # wings down, seen from the side
            d.ellipse([5, 8, 11, 14], fill=hexc('#ff7fbf'))
            d.ellipse([9, 8, 14, 13], fill=hexc('#ffd84a'))
        d.ellipse([4, 8, 15, 11], fill=hexc('#6a3a8a'))  # body
        d.ellipse([0, 6, 5, 11], fill=hexc('#6a3a8a'))  # head
        d.point((1, 8), fill=hexc('#ffffff'))  # eye
        d.line([(2, 6), (1, 3)], fill=hexc(LINE))  # feeler
    return pic(16, 15, paint)


def ufo(up):
    def paint(d):
        d.ellipse([7, 0, 17, 9], fill=hexc('#a8f0ff', 200))  # glass dome
        d.ellipse([9, 2, 15, 8], fill=hexc('#7fe07a'))  # little green alien
        d.point((11, 4), fill=hexc(LINE))
        d.point((13, 4), fill=hexc(LINE))
        d.ellipse([0, 6, 23, 13], fill=hexc('#b0a0d8'))
        d.ellipse([3, 7, 20, 10], fill=hexc('#d0c4f0'))
        for i, x in enumerate((4, 9, 14, 19)):
            d.point((x, 11), fill=hexc('#ffe066' if (i % 2 == 0) == up else '#ff7fbf'))
    return pic(24, 14, paint)


def firefly(up):
    def paint(d):
        d.ellipse([6, 4, 12, 10], fill=hexc('#ffe066'))  # glowing back
        d.ellipse([1, 3, 7, 9], fill=hexc('#4a3a2a'))  # head
        d.ellipse([4, 0 if up else 2, 9, 4 if up else 6], fill=hexc('#e8f8ff', 220))  # wing
        d.point((3, 5), fill=hexc('#ffffff'))
    return pic(13, 11, paint)


def bat(up):
    def paint(d):
        if up:
            d.polygon([(10, 7), (2, 0), (4, 4), (0, 6), (8, 10)], fill=hexc('#6a4a9a'))
            d.polygon([(12, 7), (20, 0), (18, 4), (22, 6), (14, 10)], fill=hexc('#6a4a9a'))
        else:
            d.polygon([(10, 7), (1, 11), (4, 12), (8, 11)], fill=hexc('#6a4a9a'))
            d.polygon([(12, 7), (21, 11), (18, 12), (14, 11)], fill=hexc('#6a4a9a'))
        d.ellipse([7, 3, 15, 12], fill=hexc('#8a6abf'))  # body
        d.polygon([(8, 4), (9, 0), (10, 4)], fill=hexc('#8a6abf'))  # ears
        d.polygon([(12, 4), (13, 0), (14, 4)], fill=hexc('#8a6abf'))
        face(d, 9, 6)
        d.point((12, 6), fill=hexc(LINE))
        d.point((12, 7), fill=hexc(LINE))
    return pic(22, 13, paint)


def crystal(up):
    def paint(d):
        d.polygon([(7, 0), (13, 7), (7, 14), (1, 7)], fill=hexc('#8fe8ff'))
        d.polygon([(7, 0), (7, 14), (1, 7)], fill=hexc('#5ac0e8'))
        d.polygon([(7, 2), (10, 7), (7, 7)], fill=hexc('#d8faff'))
        if up:
            d.point((12, 2), fill=hexc('#ffffff'))
            d.point((2, 12), fill=hexc('#ffffff'))
    return pic(15, 15, paint)


save(strip([raincloud(True), raincloud(False)]), 'critter-raincloud')
save(strip([butterfly(True), butterfly(False)]), 'critter-butterfly')
save(strip([ufo(True), ufo(False)]), 'critter-ufo')
save(strip([firefly(True), firefly(False)]), 'critter-firefly')
save(strip([bat(True), bat(False)]), 'critter-bat')
save(strip([crystal(True), crystal(False)]), 'critter-crystal')
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

# The storm dragon: Wolke (row 3 of dragons.png) in thundercloud colours with yellow eyes and belly.
STORM_SWAP = {
    '#a4d7e9': '#7c88b8', '#31525f': '#141631', '#6f939f': '#4f5886', '#94c0d0': '#6c78a8', '#8eb9c8': '#6874a4',
    '#c0eeff': '#a4b0dc', '#6a8791': '#48517e', '#e3f7fe': '#ffe066', '#4c7282': '#30375e', '#6a878e': '#48517e',
    '#4c7281': '#30375e', '#6a8790': '#48517e', '#ffffff': '#ffe066',
}
dragons = Image.open(f'{OUT}/dragons.png').convert('RGBA')
save(recolor(dragons.crop((0, 3 * 52, 201, 4 * 52)), STORM_SWAP), 'boss-storm')


def ghost(frame):
    """Buhu the big cheeky ghost, 60x56, looking left. frame 0-2 waves its bottom and arms."""
    def paint(d):
        white, shade = hexc('#f4f0ff'), hexc('#c9bfe8')
        d.ellipse([8, 0, 52, 40], fill=shade)  # the shadow on its back shows on the right
        d.rectangle([8, 20, 52, 46], fill=shade)
        d.ellipse([8, 0, 46, 40], fill=white)
        d.rectangle([8, 20, 46, 46], fill=white)
        shift = [0, 3, 6][frame]
        for i in range(5):  # wavy bottom
            x = 8 + i * 9 + (shift if i % 2 else -shift // 2) // 2
            d.ellipse([x, 40, x + 10, 52], fill=white)
        arm = [0, -3, -6][frame]
        d.ellipse([0, 22 + arm, 12, 30 + arm], fill=white)  # waving arm
        d.ellipse([46, 26, 58, 34], fill=shade)
        for ex in (14, 28):  # eyes
            d.ellipse([ex, 12, ex + 8, 22], fill=hexc(LINE))
            d.rectangle([ex + 2, 14, ex + 3, 15], fill=hexc('#ffffff'))
        d.ellipse([10, 24, 15, 27], fill=hexc('#ff8fb0'))  # cheeks
        d.ellipse([34, 24, 39, 27], fill=hexc('#ff8fb0'))
        d.ellipse([18, 25, 30, 34], fill=hexc('#5a2a5a'))  # "Buuh!" mouth with a tongue
        d.ellipse([21, 30, 27, 35], fill=hexc('#ff7f9f'))
    return pic(60, 56, paint)


save(strip([ghost(0), ghost(1), ghost(2)]), 'boss-ghost')


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
MUSHROOMS = tt(29)


def puff(w):
    """A little white cloud."""
    h = w // 2
    return pic(w, h, lambda d: (d.ellipse([0, h // 3, w // 2, h - 1], fill=hexc('#ffffff')),
                                d.ellipse([w // 4, 0, w * 3 // 4, h - 1], fill=hexc('#ffffff')),
                                d.ellipse([w // 2, h // 3, w - 1, h - 1], fill=hexc('#ffffff'))), line=False)


def mini_rainbow():
    def paint(d):
        for i, c in enumerate(['#ff5f6f', '#ffb13b', '#ffe066', '#5fd068', '#5fb3ff', '#a07ad8']):
            d.arc([i, i, 23 - i, 23 - i], 180, 360, fill=hexc(c), width=1)
    return pic(24, 12, paint, line=False)


def crater():
    return pic(10, 5, lambda d: (d.ellipse([0, 0, 9, 4], fill=hexc('#6a6a88')), d.ellipse([2, 1, 8, 3], fill=hexc('#4a4a68'))))


def little_star():
    return pic(7, 7, lambda d: d.polygon([(3, 0), (4, 2), (6, 3), (4, 4), (3, 6), (2, 4), (0, 3), (2, 2)],
                                         fill=hexc('#ffe066')))


def dark_cloud():
    def paint(d):
        for x, y, r in [(5, 7, 4), (10, 5, 5), (15, 7, 4)]:
            d.ellipse([x - r, y - r, x + r, y + r], fill=hexc('#5a6080'))
        d.line([(10, 10), (8, 13), (11, 13), (9, 16)], fill=hexc('#ffe066'))
    return pic(20, 17, paint)


def big_mushroom(cap):
    def paint(d):
        d.rectangle([5, 8, 8, 15], fill=hexc('#f3e3c8'))
        d.pieslice([0, 0, 13, 14], 180, 360, fill=hexc(cap))
        d.point((4, 3), fill=hexc('#ffffff'))
        d.point((8, 4), fill=hexc('#ffffff'))
    return pic(14, 16, paint)


def grave():
    def paint(d):
        d.rectangle([1, 4, 10, 13], fill=hexc('#8a8aa0'))
        d.pieslice([1, 0, 10, 9], 180, 360, fill=hexc('#8a8aa0'))
        d.text((2, 3), 'Buh', fill=hexc('#4a4a68'))
    return pic(12, 14, paint)


def crystal_rock(color):
    def paint(d):
        d.polygon([(4, 14), (2, 4), (5, 0), (8, 5), (7, 14)], fill=hexc(color))
        d.polygon([(8, 14), (9, 7), (12, 5), (12, 14)], fill=hexc(color))
        d.line([(4, 3), (4, 10)], fill=hexc('#ffffff'))
    return pic(13, 15, paint)

# One map per island group. Positions must match WORLDS in src/world.js.
#   sea, wave: the water colours. islands: blobs (x, y, radius x, radius y), grass colour swap,
#   decor (picture, x, y with x/y the bottom middle). little: small rocks for the gate back.
#   themes: the themes of the three level islands (for their island views below).
WORLDS = [
    {
        'name': 'map-sea',
        'sea': '#3fb3dc', 'wave': '#6ccbea', 'shallow': '#7fd6ef', 'foam': '#e6fbff', 'seed': 21,
        'themes': ['beach', 'reef', 'treasure'],
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
    {
        'name': 'map-sky',
        'sea': '#8fd0f8', 'wave': '#c0e6ff', 'shallow': '#b4e2ff', 'foam': '#ffffff', 'seed': 31,
        'themes': ['cloud', 'colors', 'moon'],
        'islands': [
            {'blobs': [(100, 194, 80, 44), (58, 210, 40, 28), (146, 202, 40, 30)],
             'grass': ['#f4f8ff', '#dfe9f8', '#ffffff', '#c8d8f0'],
             'decor': [(puff(22), 30, 212), (puff(18), 160, 190), (puff(26), 140, 236), (little_star(), 70, 236),
                       (puff(16), 130, 172)]},
            {'blobs': [(230, 98, 68, 40), (196, 108, 36, 26), (268, 92, 34, 26)],
             'grass': ['#ffc0e0', '#ffa0d0', '#ffe0f0', '#e080b8'],
             'decor': [(mini_rainbow(), 214, 88), (mini_rainbow(), 270, 82), (little_star(), 174, 120),
                       (puff(16), 288, 106), (little_star(), 240, 134)]},
            {'blobs': [(338, 202, 70, 42), (302, 192, 34, 26), (378, 212, 36, 24)],
             'grass': ['#c8c8dc', '#a8a8c4', '#e0e0ec', '#8a8aa8'],
             'decor': [(crater(), 320, 196), (crater(), 366, 190), (crater(), 330, 238), (little_star(), 296, 184),
                       (crater(), 402, 222), (little_star(), 388, 198)]},
            {'blobs': [(426, 104, 34, 24), (446, 116, 18, 12)],
             'grass': ['#6a7090', '#58607e', '#7a80a0', '#454a68'],
             'decor': [(dark_cloud(), 404, 98), (dark_cloud(), 466, 84), (dark_cloud(), 388, 134)]},
        ],
        'little': [(26, 46, 14, 9)],
    },
    {
        'name': 'map-magic',
        'sea': '#4a3f8a', 'wave': '#6a5aaa', 'shallow': '#5e50a0', 'foam': '#c9b8ff', 'seed': 41,
        'themes': ['mushroom', 'spooky', 'crystal'],
        'islands': [
            {'blobs': [(100, 194, 80, 44), (58, 210, 40, 28), (146, 202, 40, 30)],
             'grass': GRASS,
             'decor': [(big_mushroom('#e84537'), 30, 214), (big_mushroom('#c06ad8'), 160, 192), (MUSHROOMS, 70, 238),
                       (big_mushroom('#5fb3ff'), 140, 174), (MUSHROOMS, 136, 236)]},
            {'blobs': [(230, 98, 68, 40), (196, 108, 36, 26), (268, 92, 34, 26)],
             'grass': ['#5a7a4a', '#4a6a3e', '#6a8a58', '#3a5230'],
             'decor': [(grave(), 210, 90), (pumpkin_pic := pic(14, 14, pumpkin), 250, 86), (grave(), 284, 104),
                       (pumpkin_pic, 180, 122), (grave(), 236, 134)]},
            {'blobs': [(338, 202, 70, 42), (302, 192, 34, 26), (378, 212, 36, 24)],
             'grass': ['#c8f0ff', '#a8e0f8', '#e8faff', '#88c8e8'],
             'decor': [(crystal_rock('#8fe8ff'), 300, 186), (crystal_rock('#ff9fd0'), 364, 192),
                       (crystal_rock('#c9a7ff'), 404, 222), (crystal_rock('#8fe8ff'), 322, 238)]},
            {'blobs': [(426, 104, 34, 24), (446, 116, 18, 12)],
             'grass': ['#4a3a6a', '#3e3058', '#5a4a7a', '#2e2444'],
             'decor': [(grave(), 406, 100), (grave(), 452, 124), (pic(14, 13, mini_ghost), 470, 84)]},
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

# --- Island views ------------------------------------------------------------------------------
# One big island per level island (island-beach.png, ...), for walking around and building, like
# the first group's in tools/make_assets.py. BIG_ISLAND must match ISLAND_GROUND in src/world.js.
# The decorations stay near the edge, so the middle is free for building.
BIG_ISLAND = [(240, 160, 196, 78), (120, 176, 92, 58), (362, 150, 100, 64)]
BIG_CLIFF = 8
EDGE_SPOTS = [(62, 160), (92, 140), (426, 120), (48, 214), (432, 196), (150, 228), (330, 214), (400, 110)]
BIG_DECOR = {  # per island theme: what stands at EDGE_SPOTS (in that order)
    'beach': [palm(), palm(), palm(), shell(), starfish(), shell(), starfish(), palm()],
    'reef': [coral('#ff7f9f'), coral('#ffb13b'), coral('#c86ad8'), starfish(), shell(), coral('#ff7f9f'), starfish(),
             coral('#5fb3ff')],
    'treasure': [palm(), palm(), flag(), BUSH, chest(), BUSH, chest(), palm()],
    'cloud': [puff(26), puff(20), puff(24), little_star(), puff(18), little_star(), puff(16), puff(20)],
    'colors': [mini_rainbow(), little_star(), mini_rainbow(), little_star(), puff(18), little_star(), little_star(), puff(16)],
    'moon': [crater(), little_star(), crater(), crater(), little_star(), crater(), little_star(), crater()],
    'mushroom': [big_mushroom('#e84537'), big_mushroom('#c06ad8'), big_mushroom('#5fb3ff'), MUSHROOMS,
                 big_mushroom('#e84537'), MUSHROOMS, MUSHROOMS, big_mushroom('#c06ad8')],
    'spooky': [grave(), pic(14, 14, pumpkin), grave(), pic(14, 14, pumpkin), grave(), pic(14, 14, pumpkin), grave(),
               grave()],
    'crystal': [crystal_rock('#8fe8ff'), crystal_rock('#ff9fd0'), crystal_rock('#c9a7ff'), crystal_rock('#8fe8ff'),
                crystal_rock('#ff9fd0'), crystal_rock('#c9a7ff'), crystal_rock('#8fe8ff'), crystal_rock('#c9a7ff')],
}
big_mask = blob_mask(BIG_ISLAND)


def big(thing):  # the map decorations are small, so they stand twice as big on the island view
    return thing.resize((thing.width * 2, thing.height * 2), Image.NEAREST)


for world in WORLDS:
    for isl, theme in zip(world['islands'], world['themes']):
        rng = random.Random(world['seed'] + len(theme))
        sea = Image.new('RGBA', (W, H), hexc(world['sea']))
        d = ImageDraw.Draw(sea)
        for _ in range(40):
            x, y = rng.randrange(0, W), rng.randrange(0, H)
            d.line([(x, y), (x + 2, y - 1), (x + 4, y)], fill=hexc(world['wave']))
        sea.paste(hexc(world['shallow']), (0, 0), grow(big_mask, 10))
        sea.paste(hexc(world['foam']), (0, 0), ImageChops.subtract(grow(big_mask, 3), big_mask))
        layer = Image.new('RGBA', (W, H))
        top = ImageChops.multiply(ImageChops.offset(big_mask, 0, -BIG_CLIFF), big_mask)
        layer.paste(CLIFF, (0, 0), big_mask)
        layer.paste(SAND_DARK, (0, 0), ImageChops.offset(top, 0, 3))
        layer.paste(SAND, (0, 0), top)
        tex = Image.new('RGBA', (W, H))
        for ty in range(0, H, 16):
            for tx in range(0, W, 16):
                tex.alpha_composite(tt(rng.choice([0, 0, 0, 1])), (tx, ty))
        layer.paste(tex, (0, 0), shrink(top, 7))
        layer = recolor(layer, dict(zip(GRASS, isl['grass'])))
        decor = [(big(thing), x, y) for thing, (x, y) in zip(BIG_DECOR[theme], EDGE_SPOTS)]
        for thing, x, y in sorted(decor, key=lambda e: e[2]):
            layer.alpha_composite(thing, (x - thing.width // 2, y - thing.height))
        sea.alpha_composite(layer)
        save(sea, f'island-{theme}')
