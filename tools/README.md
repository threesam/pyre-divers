# tools

Generators. Nothing here runs at build time — each is a one-shot you run by
hand and commit the result of.

- `build-brand-font.py` — forks La Chata into Pyre Display (clips the p/d/b/q
  legs round, emits the 700 weight). Writes `pyre-display.ttf`.
- `solve-wordmark.py` — reads that ttf and prints the three wordmark CSS
  constants (`word-spacing`, `translateX`, `translateY`). Re-run after any
  change to the face; a stale value is what puts the d's bowl off the vortex.

## social art

`static/og.jpg`, `static/og-square.jpg` and `static/podcast-cover.jpg` are
screenshots of the live splash, not exports from a design file. Recapture them
whenever the splash changes — they go stale silently, since nothing in the
build checks that they still resemble the site.

```sh
CHROME="$HOME/Library/Caches/ms-playwright/chromium-*/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
# hide the scroll chevron for the duration of the capture, then revert:
#   printf '.down{display:none!important}' >> src/app.css
"$CHROME" --headless --use-angle=swiftshader-webgl --enable-unsafe-swiftshader \
  --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=12000 \
  --screenshot=og.png http://localhost:5173/?test
# square (cover + og-square) is the same call at --window-size=1700,1700
magick og.png -strip -quality 92 -sampling-factor 4:4:4 -colorspace sRGB static/og.jpg
```

Three flags are load-bearing, each learned the hard way:

- **`--force-device-scale-factor=1`.** Not 2. The sim caps `dpr` at 1.75 and
  gives a body a head once it clears `HEAD_PX` _device_ px, so supersampling
  draws more heads, thickens the core, and swallows the "e" of "pyre" into the
  eye. dpr 1 is the composition the site actually presents.
- **1700 for the square, not 3000.** The wordmark is
  `clamp(2.2rem, min(15vmax,14vw), 17rem)` but the vortex scales off
  `0.7·hypot(W,H)`, so past ~1700 the type hits its cap while the vortex keeps
  growing. Apple accepts 1400–3000; 1700 sits inside it with the mark still
  large enough to read at the ~55px list thumbnail.
- **`--use-angle=swiftshader-webgl --enable-unsafe-swiftshader`.** Headless has
  no GPU; without these the WebGL2 sim never initialises and you capture the
  bare gradient with no divers in it.

At 1:1 the eye is proportionally largest (wordmark:vortex 0.141 vs 0.169–0.177
at desktop aspect), so the square is the frame where all of this bites first.
Check the "e" of "pyre" before shipping any recapture — it is the letter that
goes first.
