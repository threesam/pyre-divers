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
# The d's counter — the hole the vortex core sits in — is MEASURED off the
# built face, not written down. It was hard-coded, which quietly defeated the
# "re-run me when the face changes" instruction this whole script exists for:
# a changed bowl would print fresh-looking numbers aimed at the old hole.
def counter_centre(font):
    """Centre of the d's counter, in font units from the glyph's origin."""
    from fontTools.pens.recordingPen import RecordingPen

    glyph_set = font.getGlyphSet()
    pen = RecordingPen()
    glyph_set[font.getBestCmap()[ord("d")]].draw(pen)

    contours, current = [], []
    for op, args in pen.value:
        if op == "moveTo" and current:
            contours.append(current)
            current = []
        current.append((op, args))
    contours.append(current)

    def box(contour):
        pts = [p for _, args in contour for p in args if isinstance(p, tuple)]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    boxes = [box(c) for c in contours]
    outer = max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    inner = [
        b
        for b in boxes
        if b is not outer
        and b[0] >= outer[0]
        and b[1] >= outer[1]
        and b[2] <= outer[2]
        and b[3] <= outer[3]
    ]
    assert len(inner) == 1, f"expected one counter in the d, found {len(inner)}"
    x0, y0, x1, y1 = inner[0]
    return (x0 + x1) / 2, (y0 + y1) / 2


def main():
    face = hb.Face(hb.Blob.from_file_path(str(FONT)))
    hb_font = hb.Font(face)
    upm = face.upem

    tt = TTFont(FONT)
    counter_cx, counter_cy = counter_centre(tt)
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
                counter = x + counter_cx
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
    # sits counter_cy above the baseline, so the gap between the counter and the
    # box centre is the difference — lift by it and the counter lands on the
    # vortex core. Per-face: hhea moves when the face does.
    hhea = tt["hhea"]
    baseline_drop = (hhea.ascender + hhea.descender) / 2  # descender is negative
    rise = counter_cy - baseline_drop

    print(f"  word-spacing: {word_spacing / upm:+.4f}em;   /* .wordmark */")
    print(f"  translateX:   {shift / upm:+.4f}em;   /* .wordmark .line */")
    print(f"  translateY:   {rise / upm:+.4f}em;   /* .wordmark .line */")
    print()
    print(f"  counter - ink centre : {counter - (left + right) / 2:+.6f} units")
    print(f"  inset left / right   : {left + shift:.2f} / {advance - right - shift:.2f}")


if __name__ == "__main__":
    main()
