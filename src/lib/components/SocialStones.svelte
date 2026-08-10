<script lang="ts">
  import { ROCKS, setRockLit } from '$lib/page-fx';

  // The three social links, stamped on the three stones at the flame's mouth.
  //
  // The stones themselves are canvas (page-fx `rocks`), and #fire is
  // aria-hidden — correctly, it is decoration. Canvas cannot be focused,
  // tabbed to, or read out, so the links are real anchors laid over the
  // stones rather than hit-testing on the canvas. Screen readers and
  // keyboards get ordinary links; the painting stays decorative.
  //
  // COORDINATES ARE THE CANVAS'S OWN. Each rock's centre in page-fx is
  // (FLAME_X + dx, FLAME_BASE + dy) with FLAME_X = 1/3 and FLAME_BASE =
  // 0.82, normalized to viewport width and height. `section` is
  // position:relative and exactly 100dvh (app.css:52), and #fire is inset:0
  // inside it, so a percentage of #join is the same coordinate the canvas
  // draws in. If those constants ever move, these move with them — that is
  // the coupling, and it is written down here because nothing enforces it.
  //
  // Below 960px the card's frame reaches across the rightmost stone, so the
  // same three anchors reflow into a plain row and the stones go back to
  // being unstamped. See the app.css breakpoint note for the arithmetic.
  //
  // Icons are drawn in the site's hand: quadratic curves so the edges bow,
  // round caps, ~2.4 stroke on a 32 viewBox — the same language as the
  // stones (drawRock uses quadraticCurveTo for exactly this reason).

  interface Social {
    name: string;
    href: string;
    /** which stone, as an index into ROCKS — the single source of geometry */
    rock: number;
    /**
     * The stone's own colour, sampled from the ember run the rocks are
     * outlined in — #f5b942 → #e25822 → #b91c1c spanning FLAME_X ± 0.12.
     * So the left stone wears the warm end and the right one the deep end,
     * exactly as their outlines already do. Cosmetic: if a stone moved,
     * this would be a shade off, not wrong.
     */
    ink: string;
    icon: 'instagram' | 'youtube' | 'x';
  }

  // Position, size and stacking are all DERIVED from ROCKS below — nothing
  // about the stones is written down twice. Handles assumed to be
  // `pyredivers` on all three; correct here if not.
  const SOCIALS: Social[] = [
    {
      name: 'instagram',
      href: 'https://instagram.com/pyredivers',
      rock: 0,
      ink: '#e97c2e',
      icon: 'instagram',
    },
    {
      name: 'youtube',
      href: 'https://youtube.com/@pyredivers',
      rock: 2,
      ink: '#df5422',
      icon: 'youtube',
    },
    {
      name: 'x',
      href: 'https://x.com/pyredivers',
      rock: 1,
      ink: '#cd391f',
      icon: 'x',
    },
  ];

  /**
   * Everything positional, computed from the one source.
   *
   * `z` is the ROCKS index + 1: that array is in paint order, so the stone
   * drawn last is the one in front, and the target that should win the
   * pointer where they overlap. Derived, so it cannot disagree.
   *
   * `size` is the icon box in vh at ~62% of the stone's height. ry is a
   * fraction of viewport height, so the stone is `ry * 200` vh tall and
   * 62% of that is `ry * 124`.
   */
  const placed = SOCIALS.map((s) => {
    const r = ROCKS[s.rock];
    return {
      ...s,
      x: r.cx,
      y: r.cy,
      rx: r.rx,
      ry: r.ry,
      z: s.rock + 1,
      size: r.ry * 124,
    };
  });

  // Only light a stone when the icons are actually ON the stones. Below the
  // breakpoint they sit in a row and lighting a rock nobody is pointing at
  // would be a lie.
  //
  // DO NOT hoist this to a top-level `matchMedia(...)`. This page is
  // prerendered, component top level runs on the server, and matchMedia is
  // not defined there — the build dies with a 500 on /. Called from a
  // pointer handler it only ever runs in a browser.
  const onStones = () => matchMedia('(min-width: 960px)').matches;
  const light = (i: number) => onStones() && setRockLit(i);
  const douse = () => setRockLit(null);

  // litRock lives at module scope in page-fx, so it outlives this component.
  // Navigating to an episode page mid-hover would otherwise leave a stone
  // burning with nothing pointing at it.
  $effect(() => douse);
</script>

<ul class="socials">
  {#each placed as s (s.name)}
    <li>
      <!-- eslint-disable svelte/no-navigation-without-resolve -- external absolute urls from SOCIALS; resolve() is for app routes -->
      <!-- block form: prettier splits this tag's attributes, so a
           disable-next-line would no longer cover the href line -->
      <a
        href={s.href}
        rel="me"
        aria-label="pyre divers on {s.name}"
        style="--x:{s.x};--y:{s.y};--rx:{s.rx};--ry:{s.ry};--z:{s.z};--size:{s.size};--ink:{s.ink}"
        onpointerenter={() => light(s.rock)}
        onpointerleave={douse}
        onfocus={() => light(s.rock)}
        onblur={douse}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          {#if s.icon === 'instagram'}
            <!-- no two corners the same radius, no edge dead straight, and
                 the lens is four uneven arcs rather than a <circle> — a
                 perfect circle is the single thing that gives a drawn icon
                 away as generated -->
            <path
              d="M11.4 5.2 Q5.9 5.5 5.4 11 L5.6 20.6 Q5.4 26.2 11.4 26.6 L20.6 26.3 Q26.6 26 26.4 20.4 L26.6 11.2 Q26.2 5.6 20.9 5.4 Z"
            />
            <path
              d="M16.2 10.6 Q21.6 10.9 21.5 16.1 Q21.7 21.4 16 21.3 Q10.5 21.5 10.6 15.9 Q10.4 10.7 16.2 10.6 Z"
            />
            <circle class="ink" cx="21.6" cy="10.3" r="1.15" />
          {:else if s.icon === 'youtube'}
            <path
              d="M8.4 8.8 Q4.6 9.2 4.3 12.9 L4.5 19.3 Q4.4 22.9 8.3 23.2 L23.6 22.8 Q27.7 22.6 27.4 18.8 L27.6 12.9 Q27.2 9.1 23.5 8.9 Z"
            />
            <path
              class="ink"
              d="M13.6 12.6 Q17.2 14.2 20.7 16.1 Q17 17.9 13.8 19.5 Q13.5 16 13.6 12.6 Z"
            />
          {:else}
            <!-- THREE strokes, not two. The mark is one continuous bar
                 top-left to bottom-right, with the counter-diagonal BROKEN
                 where that bar crosses in front of it — an upper-right
                 stub and a lower-left stub. Draw it as two full crossing
                 strokes and you have a multiplication sign; the break is
                 the whole tell, and it survives being drawn by hand.

                 Flat caps for the same reason: round ends are the
                 universal close button, cut ends are the mark.

                 The bird was tried and dropped — a filled silhouette gives
                 the turbulence no line to disturb, so it stayed crisp
                 beside two icons that had visibly been drawn. Strokes take
                 the hand; fills don't. -->
            <!-- the letterform, not two strokes: bars with HORIZONTAL
                 terminal cuts, narrow and tall, and the counter-diagonal
                 broken where the main bar crosses in front. Perpendicular
                 caps and equal-length arms give you a multiplication sign;
                 these three things are what make it the mark.

                 Filled, and that is fine here even though the bird wasn't:
                 the bird was already organic, so displacing it read as
                 noise. This shape is all straight edges, and straight
                 edges that wobble read as drawn by hand. -->
            <g class="solid">
              <path d="M8 5 L11.2 5 L24 27 L20.8 27 Z" />
              <path d="M20.8 5 L24 5 L18.88 13.8 L15.68 13.8 Z" />
              <path d="M16.32 18.2 L11.2 27 L8 27 L13.12 18.2 Z" />
            </g>
          {/if}
        </svg>
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </li>
  {/each}
</ul>
