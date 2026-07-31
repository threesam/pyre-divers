#!/usr/bin/env python3
"""Build the pyre divers brand face from La Chata.

Three edits, all to letters where La Chata's own drawing fights how the mark is
used. Nothing else is touched — the build asserts it.

d b p q — La Chata runs the leg down past the bowl's equator, nearly to the
    baseline, filling in the arc that should close the bowl into a ring.
    Comfortaa and Fabada both stop it at the equator, the one height where the
    ring's outer edge and the leg's agree and the ring's tangent is vertical, so
    the two flow together. This rebuilds them that way: the face's own "o", plus
    a leg from the equator to a round tip. It matters beyond taste on the "d" —
    the splash parks the vortex core inside its counter.

y — its tail swung out to x=-126, 164 units past its own left arm and into
    negative space, so in "pyre" it tucked under the p. Cut back and re-capped
    to land on the arm, which is where both reference faces put it.

Advances never move, so kerning and the wordmark's metric alignment survive.

    python3 tools/build-brand-font.py

Inputs  : tools/src-font/lachata.ttf  (SIL OFL 1.1, deFharo)
          Kept out of static/ deliberately: it is a build input, and anything
          under static/ is served publicly.
Outputs : static/fonts/pyre-display.woff2   — subset, for headings
          tools/pyre-display.ttf            — full source, for regenerating art

Licence: La Chata is SIL OFL 1.1 with no Reserved Font Name, so a derivative is
permitted. It does carry a deFharo trademark on the name, so the family is
renamed here and the OFL notice plus attribution ride along in the name table.
"""

import math
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps
from fontTools.subset import Subsetter

import pathops

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "src-font" / "lachata.ttf"
OUT_TTF = ROOT / "tools" / "pyre-display.ttf"
OUT_WOFF2 = ROOT / "static" / "fonts" / "pyre-display.woff2"

FAMILY = "Pyre Display"
VERSION = "1.000"

# Measured off La Chata itself (units per em = 1000):
#   o      outer x[60,616] y[-20,555]      counter x[142,534] y[62,473]
#   p      outer x[90,646] y[-263,555]     counter x[172,564]  -> o shifted +30
#   d      outer x[62,618] y[-20,807]      counter x[144,536]  -> o shifted +2
# stroke = (556 - 392) / 2 = 82, so the stem is one stroke wide and its inner
# edge lands exactly on the counter's edge — tangent, never cutting the ring.
STEM_W = 82.0
KAPPA = 0.5522847498307933  # circle-to-cubic constant, for the stem caps

# The "o" ring's vertical centre. The bowl is widest here, so it is the one
# height where the ring's outer edge and the stem's outer edge coincide — and
# the ring's tangent there is vertical, matching the stem. End the leg here and
# the two flow into one another; end it anywhere lower and the ring has already
# curved away, leaving the notch that made the bowl stop reading as round.
EQUATOR = (-20 + 555) / 2

# glyph -> (bowl x-offset from "o", stem left x, y of the leg's tip)
# Every bowl is the "o" translated: d/g +2, q +3, p/b +30, a +0.
GLYPHS = {
    "d": (2, 536, 807),
    "b": (30, 90, 807),
    "p": (30, 90, -263),
    "q": (3, 537, -263),
}


def draw_stem(pen, x0, y_tip):
    """The leg: a bar from the bowl's equator to a semicircular tip.

    Only the tip is capped. The other end stops flush at the equator, buried in
    the ring, because that is where the two silhouettes agree. Wound clockwise
    in y-up coordinates to match TrueType's outer-contour convention, so it
    unions with the bowl under non-zero fill instead of punching a hole.
    """
    r = STEM_W / 2
    x1, cx = x0 + STEM_W, x0 + r
    k = KAPPA * r
    up = y_tip > EQUATOR
    tip_base = y_tip - r if up else y_tip + r

    # Both branches trace clockwise — start on the side the path descends from,
    # run out to the tip, cap it, come back. Mirroring the up-case verbatim
    # would reverse the winding and pathops would read the leg as a hole,
    # biting a wedge out of the bowl exactly where the two overlap.
    if up:
        pen.moveTo((x0, EQUATOR))
        pen.lineTo((x0, tip_base))
        pen.curveTo((x0, tip_base + k), (cx - k, y_tip), (cx, y_tip))
        pen.curveTo((cx + k, y_tip), (x1, tip_base + k), (x1, tip_base))
        pen.lineTo((x1, EQUATOR))
    else:
        pen.moveTo((x1, EQUATOR))
        pen.lineTo((x1, tip_base))
        pen.curveTo((x1, tip_base - k), (cx + k, y_tip), (cx, y_tip))
        pen.curveTo((cx - k, y_tip), (x0, tip_base - k), (x0, tip_base))
        pen.lineTo((x0, EQUATOR))
    pen.closePath()


def rebuild(font):
    glyph_set = font.getGlyphSet()
    glyf = font["glyf"]

    for name, (bowl_dx, stem_x, y_tip) in GLYPHS.items():
        pen = TTGlyphPen(glyph_set)
        # the bowl: the face's own "o", already quadratic, drawn straight in
        glyph_set["o"].draw(TransformPen(pen, Transform().translate(bowl_dx, 0)))
        # the leg: cubic tip, converted to quadratics on the way into glyf
        draw_stem(Cu2QuPen(pen, max_err=0.5), stem_x, y_tip)
        glyf[name] = pen.glyph()

    # the stem deliberately overlaps the bowl's stroke; merge them into one
    # outline so rasterisers never have to resolve it at small sizes
    removeOverlaps(font, glyphNames=set(GLYPHS))


def set_outline(font, name, glyph):
    """Install an outline and bring its left side bearing along with it.

    Not optional here. La Chata sets head.flags bit 1, which promises every
    glyph's lsb equals its xMin — so a rasteriser is entitled to position from
    the lsb. Change an outline without changing the bearing and the glyph is
    drawn shifted by the difference. Clipping the y moved its xMin from -131 to
    33 while hmtx still said -131, and the y rendered 152 units left: straight
    into the p, with a hole before the r. It compiles clean and looks wrong.
    """
    glyf = font["glyf"]
    glyf[name] = glyph
    glyph.recalcBounds(glyf)
    advance, _ = font["hmtx"][name]
    font["hmtx"][name] = (advance, glyph.xMin)


def clip_y_tail(font):
    """Stop the y's tail at the x its own left arm starts on.

    La Chata swings the tail out to x=-131 — past the arm and into negative
    space, so in "pyre" it tucks under the p. Comfortaa and Fabada both land the
    tail's leftmost exactly on the arm's leftmost; this does the same.

    Cut and re-cap rather than redraw: the hook's curve is the face's own and
    worth keeping. Two things make the cap read as part of the tail instead of a
    bead stuck on the end:

      the cut runs PERPENDICULAR to the tail, not vertically. The tail leaves at
      about 19 degrees, so a vertical cut crosses a wider slice than the stroke
      is thick, and the disc that caps it bulges past both edges.

      the disc sits on the tail's centreline with the stroke's own half-width,
      solved where it actually lands. Tangent to both edges, so the join is
      smooth rather than notched.

    The centre goes one radius right of the target, since a disc's leftmost is
    always centre minus radius however the cut is angled.
    """
    glyph_set = font.getGlyphSet()
    op, OPS = pathops.op, pathops.PathOp
    TAIL_Y = -100  # below the junction only the tail lives

    def outline():
        path = pathops.Path()
        glyph_set["y"].draw(path.getPen())
        return path

    def box(x0, y0, x1, y1, angle=0.0, px=0.0, py=0.0):
        """A rectangle, optionally rotated about and translated to (px, py)."""
        path = pathops.Path()
        pen = path.getPen()
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        for i, (x, y) in enumerate([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]):
            point = (px + x * cos_a - y * sin_a, py + x * sin_a + y * cos_a)
            pen.moveTo(point) if i == 0 else pen.lineTo(point)
        pen.closePath()
        return path

    def circle(cx, cy, r):
        path = pathops.Path()
        pen = path.getPen()
        k = KAPPA * r
        pen.moveTo((cx - r, cy))
        pen.curveTo((cx - r, cy + k), (cx - k, cy + r), (cx, cy + r))
        pen.curveTo((cx + k, cy + r), (cx + r, cy + k), (cx + r, cy))
        pen.curveTo((cx + r, cy - k), (cx + k, cy - r), (cx, cy - r))
        pen.curveTo((cx - k, cy - r), (cx - r, cy - k), (cx - r, cy))
        pen.closePath()
        return path

    def centreline(x):
        """Midpoint of the tail at x, and the direction it is travelling."""

        def mid(at):
            b = op(outline(), box(at - 1.0, -2000, at + 1.0, TAIL_Y), OPS.INTERSECTION)
            return (b.bounds[1] + b.bounds[3]) / 2

        return (x, mid(x)), math.atan2(mid(x + 6) - mid(x - 6), 12.0)

    def half_width(px, py, angle):
        """Half the stroke's thickness measured across it, not down the page."""
        sliver = op(outline(), box(-1.2, -400, 1.2, 400, angle, px, py), OPS.INTERSECTION)
        b = sliver.bounds
        return math.hypot(b[2] - b[0], b[3] - b[1]) / 2

    arm_x = op(outline(), box(-2000, 300, 2000, 2000), OPS.INTERSECTION).bounds[0]

    r = STEM_W / 2
    for _ in range(40):
        (px, py), angle = centreline(arm_x + r)
        r_next = half_width(px, py, angle)
        if abs(r_next - r) < 1e-3:
            break
        r = r_next
    (px, py), angle = centreline(arm_x + r)

    kept = op(outline(), box(-4000, -4000, 0, 4000, angle, px, py), OPS.DIFFERENCE)
    result = op(kept, circle(px, py, r), OPS.UNION)
    assert abs(result.bounds[0] - arm_x) < 0.01, "tail still overshoots the arm"

    pen = TTGlyphPen(glyph_set)
    result.draw(Cu2QuPen(pen, max_err=0.5))
    set_outline(font, "y", pen.glyph())


def rename(font):
    name = font["name"]
    notice = (
        f"{FAMILY} is a derivative of La Chata by deFharo (deFharo.com), "
        "used and redistributed under the SIL Open Font License 1.1. "
        'The "p" and "d" have been redrawn; no other glyph is altered.'
    )
    ofl = (
        "This Font Software is licensed under the SIL Open Font License, "
        "Version 1.1. This license is available with a FAQ at: "
        "http://scripts.sil.org/OFL"
    )
    for nid, value in {
        0: notice,
        1: FAMILY,
        2: "Regular",
        3: f"{FAMILY}:{VERSION}",
        4: FAMILY,
        5: f"Version {VERSION}",
        6: FAMILY.replace(" ", ""),
        7: "La Chata is a trademark of deFharo.com.",
        9: "deFharo",
        13: ofl,
        14: "http://scripts.sil.org/OFL",
        16: FAMILY,
        17: "Regular",
    }.items():
        name.setName(value, nid, 3, 1, 0x409)
    # drop the Macintosh records rather than leave them saying "La chata"
    name.names = [n for n in name.names if n.platformID == 3]


def verify():
    """Assert the fork changed p and d and nothing else.

    Compare raw glyf coordinates, not a drawn glyphSet. La Chata sets head.flags
    bit 1 ("lsb == xMin") while 60 glyphs disagree with it — two has lsb 64
    against xMin 56 — and fontTools' glyphSet honours the flag by shifting those
    glyphs as it draws. Compiling drops the (already untrue) flag, so a drawn
    comparison reports 60 phantom differences. The stored outlines never moved,
    and that is what a rasteriser reads.
    """
    built, source = TTFont(OUT_TTF), TTFont(SRC)
    a, b = source["glyf"], built["glyf"]
    changed = set()
    for name in source.getGlyphOrder():
        ga, gb = a[name], b[name]
        ga.expand(a)
        gb.expand(b)
        if list(getattr(ga, "coordinates", [])) != list(getattr(gb, "coordinates", [])):
            changed.add(name)
    expected = set(GLYPHS) | {"y"}
    assert changed == expected, f"unexpected glyph changes: {changed ^ expected}"
    # advances drive layout and must not move; lsb follows the outline, and
    # the y's does change now that its tail no longer reaches into -x
    for name in source.getGlyphOrder():
        assert source["hmtx"][name][0] == built["hmtx"][name][0], f"advance moved: {name}"
    print(f"verified: only {', '.join(sorted(changed))} redrawn, advances intact")


def main():
    font = TTFont(SRC)
    rebuild(font)
    clip_y_tail(font)
    rename(font)

    OUT_TTF.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUT_TTF)
    verify()

    # headers need Latin text, not the full 376-glyph face
    subsetter = Subsetter()
    subsetter.populate(
        unicodes=(
            list(range(0x20, 0x7F))  # basic latin
            + list(range(0xA0, 0x100))  # latin-1 supplement
            + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026]  # punctuation
        )
    )
    subsetter.subset(font)
    font.flavor = "woff2"
    OUT_WOFF2.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUT_WOFF2)

    print(f"{OUT_TTF.relative_to(ROOT)}  {OUT_TTF.stat().st_size:,} bytes")
    print(f"{OUT_WOFF2.relative_to(ROOT)}  {OUT_WOFF2.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
