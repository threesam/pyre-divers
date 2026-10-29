# An episode's title card: the title in the brand bold on the paper, over the
# dot field the ending dissolves into. One drawing, two shapes — 16:9 for the
# YouTube thumbnail and the email, square for the feed's <itunes:image>.
# usage: card.py OUT.jpg WIDTHxHEIGHT "line|line|..."   (| breaks the title)
#   card.py thumb.jpg 1280x720 "first dive"
#   card.py cover.jpg 3000x3000 "deadlines|+|decisions"
import io
import math
import os
import random
import sys

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

PAPER, INK = (232, 228, 217), (35, 39, 22)
WOFF2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'static', 'fonts', 'pyre-display-700.woff2')
SS = 2  # supersample: PIL's ellipses are not antialiased


def font(px):
    # PIL can't read woff2; the 700 ttf is a gitignored build output, so unwrap
    # the tracked woff2 instead of depending on a local build.
    f = TTFont(WOFF2)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, px)


def card(w, h, lines):
    W, H = w * SS, h * SS
    k = W / 1280  # the field was drawn for a 1280-wide frame
    im = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(im, 'RGBA')
    # dots on a 5.33 x 12 grid, dense at the centre and thinning outward
    rnd = random.Random(1206)
    r = 1.5 * k
    y = 6 * k
    while y < H:
        x = 2.7 * k
        while x < W:
            dist = math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H * 0.556))
            if rnd.random() < 0.04 + 0.5 * math.exp(-dist * dist * 3.2):
                a = 115 if rnd.random() < 0.2 else 230
                d.ellipse((x - r, y - r, x + r, y + r), fill=INK + (a,))
            x += 5.333 * k
        y += 12 * k
    # the widest line fills two thirds of the frame; a short title stops at
    # 0.148 of the width so it doesn't shout
    probe = font(1000)
    widest = max(probe.getlength(s) for s in lines) / 1000
    px = min(0.148 * W, 0.66 * W / widest)
    f = font(px)
    lead = 1.02 * px
    asc, desc = f.getmetrics()
    y0 = H / 2 - lead * len(lines) / 2 + (lead - asc - desc) / 2 + asc
    for i, s in enumerate(lines):
        d.text((W / 2, y0 + i * lead), s, font=f, fill=INK, anchor='ms')
    return im.resize((w, h), Image.LANCZOS)


if __name__ == '__main__':
    out, size, title = sys.argv[1:4]
    w, h = (int(n) for n in size.split('x'))
    card(w, h, title.split('|')).save(out, quality=88)
