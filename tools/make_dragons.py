"""Paint the extra dragons of Dragon Flight as new rows of dragons.png.

Usage: python -I tools/make_dragons.py public/assets

Needs Pillow. Rows 0-4 of dragons.png are the original dragons (Free Pixel Art Dragons by
magicae-games); every row below them is made here by repainting one of those rows. Running it again
rebuilds the extra rows, so you can change the colours in NEW_DRAGONS and run it.
"""
import random
import sys

from PIL import Image

OUT = sys.argv[1]
FRAME_W, FRAME_H, ORIGINAL_ROWS = 67, 52, 5
BODY_TOP = 22  # the wings are above this line in every frame


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


# base: which original row gives the shape (0 Marshmallow, 1 Chili, 2 Blubb, 3 Wolke, 4 Kiesel).
# colors: dark outline to brightest highlight; each pixel gets the colour for its brightness.
NEW_DRAGONS = [
    {'name': 'Goldi', 'base': 4, 'colors': ['#5a3a06', '#b8740e', '#f0b21c', '#ffd84a', '#fff1a8']},
    {'name': 'Lila', 'base': 2, 'colors': ['#2a1240', '#5a2d82', '#8a4fc0', '#b47ee6', '#e2c4ff']},
    {'name': 'Mitternacht', 'base': 1, 'colors': ['#070a1e', '#141c46', '#24317a', '#3a4fa8', '#6a82d8'],
     'sparkles': 14},
    {'name': 'Summsi', 'base': 0, 'colors': ['#4a3206', '#a8740e', '#f5c21b', '#ffd84a', '#fff1a8'],
     'stripes': '#2a2016'},
]

sheet = Image.open(f'{OUT}/dragons.png').convert('RGBA')
original = sheet.crop((0, 0, sheet.width, ORIGINAL_ROWS * FRAME_H))


def gradient(colors, t):  # t from 0 (darkest) to 1 (brightest)
    stops = [hexc(c) for c in colors]
    pos = t * (len(stops) - 1)
    i = min(int(pos), len(stops) - 2)
    f = pos - i
    return tuple(round(stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f) for k in range(3))


def paint(dragon, rng):
    row = original.crop((0, dragon['base'] * FRAME_H, original.width, (dragon['base'] + 1) * FRAME_H))
    px = row.load()
    eyes = {(255, 255, 255), (0, 0, 0)}
    body = [px[x, y][:3] for y in range(row.height) for x in range(row.width) if px[x, y][3] and px[x, y][:3] not in eyes]
    lo, hi = min(map(lum, body)), max(map(lum, body))
    for y in range(row.height):
        for x in range(row.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) not in eyes:
                px[x, y] = gradient(dragon['colors'], (lum((r, g, b)) - lo) / (hi - lo)) + (a,)

    for col in range(3):
        left = col * FRAME_W
        # The eye is the white pixel; it tells where the head is in this frame.
        eye_x = next(x for y in range(FRAME_H) for x in range(left, left + FRAME_W) if px[x, y][:3] == (255, 255, 255))
        if 'stripes' in dragon:  # bee stripes across the body, behind the head
            dark = hexc(dragon['stripes'])
            for x in range(left, eye_x - 8):
                if (eye_x - x) % 8 < 3 and eye_x - x > 14:
                    for y in range(BODY_TOP, FRAME_H):  # not on the wings above the body
                        p = px[x, y]
                        if p[3] and lum(p[:3]) > 90:
                            px[x, y] = dark + (p[3],)
        for _ in range(dragon.get('sparkles', 0)):  # little stars on the night sky body
            for _ in range(50):
                x, y = rng.randrange(left, eye_x - 4), rng.randrange(FRAME_H)
                if px[x, y][3] and lum(px[x, y][:3]) > 25 and all(px[x + dx, y + dy][3] for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]):
                    px[x, y] = hexc(rng.choice(['#ffffff', '#ffe066', '#b8e8ff'])) + (255,)
                    break
    return row


rng = random.Random(7)
out = Image.new('RGBA', (original.width, (ORIGINAL_ROWS + len(NEW_DRAGONS)) * FRAME_H))
out.paste(original, (0, 0))
for i, dragon in enumerate(NEW_DRAGONS):
    out.paste(paint(dragon, rng), (0, (ORIGINAL_ROWS + i) * FRAME_H))
out.save(f'{OUT}/dragons.png')
