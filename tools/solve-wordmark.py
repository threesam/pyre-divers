#!/usr/bin/env python3
"""Solve the two wordmark constants in app.css.

The splash has to satisfy two things at once:

  1. the "d"'s counter sits on the vortex core, at the viewport's centre
  2. the first and last letters are equally inset from the edges

One gap satisfies both, and only one: widening the word gap by n moves the "d"
right by n but the ink's centre by only n/2, so the error closes at half rate.
Solve for that gap, then shift the whole line, because css centres the advance
box while the eye centres the ink — and "p" opens on a wider bearing than "s"
closes on.

Shaped through harfbuzz, not raw advances, so La Chata's GPOS kerning counts.
Ignoring it lands the "d" ~3px off at splash size, which is visible against a
core the crowd draws as a hard disc.

    python3 tools/solve-wordmark.py

Prints the two values to paste into .wordmark / .wordmark .line. Re-run after
rebuilding the face or changing the wordmark text.
"""

from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "tools" / "pyre-display.ttf"
TEXT = "pyre divers"
# The counter's centre, measured from the "d"'s origin. The bowl is the face's
# own "o" translated +2, and that ring's counter spans x[144,536].
COUNTER_CX = 340.0
# ...and its vertical centre above the baseline: the "o" ring's counter spans
# y[62,473], and the bowl is the "o" translated in x only.
COUNTER_CY = (62 + 473) / 2


def main():
    face = hb.Face(hb.Blob.from_file_path(str(FONT)))
    hb_font = hb.Font(face)
    upm = face.upem

    tt = TTFont(FONT)
    glyph_set = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    d_glyph = order.index(tt.getBestCmap()[ord("d")])

    def bounds(gid):
        pen = BoundsPen(glyph_set)
        glyph_set[order[gid]].draw(pen)
        return pen.bounds

    def shape(word_spacing):
        """Lay out TEXT, adding word_spacing to each space's advance."""
        buf = hb.Buffer()
        buf.add_str(TEXT)
        buf.guess_segment_properties()
        hb.shape(hb_font, buf)

        placed, pen = [], 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            placed.append((info.codepoint, pen + pos.x_offset))
            pen += pos.x_advance
            if order[info.codepoint] == "space":
                pen += word_spacing

        left = right = None
        counter = None
        for gid, x in placed:
            if gid == d_glyph and counter is None:
                counter = x + COUNTER_CX
            box = bounds(gid)
            if box is None:
                continue
            left = x + box[0] if left is None else min(left, x + box[0])
            right = x + box[2] if right is None else max(right, x + box[2])
        return left, right, pen, counter

    word_spacing = 0.0
    for _ in range(64):
        left, right, _, counter = shape(word_spacing)
        error = counter - (left + right) / 2
        if abs(error) < 1e-9:
            break
        word_spacing -= 2 * error  # the error closes at half the gap's rate

    left, right, advance, counter = shape(word_spacing)
    shift = -(left - (advance - right)) / 2

    # Vertical: with line-height 1 the grid centres the line box, and the
    # baseline falls (ascent - descent)/2 below that centre. The d's counter
    # sits COUNTER_CY above the baseline, so the gap between the counter and the
    # box centre is the difference — lift by it and the counter lands on the
    # vortex core. Per-face: hhea moves when the face does.
    hhea = tt["hhea"]
    baseline_drop = (hhea.ascender + hhea.descender) / 2  # descender is negative
    rise = COUNTER_CY - baseline_drop

    print(f"  word-spacing: {word_spacing / upm:+.4f}em;   /* .wordmark */")
    print(f"  translateX:   {shift / upm:+.4f}em;   /* .wordmark .line */")
    print(f"  translateY:   {rise / upm:+.4f}em;   /* .wordmark .line */")
    print()
    print(f"  counter - ink centre : {counter - (left + right) / 2:+.6f} units")
    print(f"  inset left / right   : {left + shift:.2f} / {advance - right - shift:.2f}")


if __name__ == "__main__":
    main()
