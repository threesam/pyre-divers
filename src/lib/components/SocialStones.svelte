<script lang="ts">
  import { setRockLit } from '$lib/page-fx';

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
    /** index into page-fx `rocks`, which is ordered [left, right, centre] */
    rock: number;
    /** rock centre, normalized — width for x, height for y */
    x: number;
    y: number;
    /** icon box height in vh, ~62% of the stone it sits on */
    size: number;
    /**
     * The stone's own colour, sampled from the ember run the rocks are
     * outlined in — #f5b942 → #e25822 → #b91c1c spanning FLAME_X ± 0.12.
     * So the left stone wears the warm end and the right one the deep end,
     * exactly as their outlines already do.
     */
    ink: string;
    icon: 'instagram' | 'youtube' | 'bird';
  }

  // Handles assumed to be `pyredivers` on all three — correct here if not.
  const SOCIALS: Social[] = [
    {
      name: 'instagram',
      href: 'https://instagram.com/pyredivers',
      rock: 0,
      x: 1 / 3 - 0.045,
      y: 0.84,
      size: 3.4,
      ink: '#e97c2e',
      icon: 'instagram',
    },
    {
      name: 'youtube',
      href: 'https://youtube.com/@pyredivers',
      rock: 2,
      x: 1 / 3 + 0.008,
      y: 0.848,
      size: 4.1,
      ink: '#df5422',
      icon: 'youtube',
    },
    {
      name: 'x',
      href: 'https://x.com/pyredivers',
      rock: 1,
      x: 1 / 3 + 0.062,
      y: 0.838,
      size: 3,
      ink: '#cd391f',
      icon: 'bird',
    },
  ];

  // Only light a stone when the icons are actually ON the stones. Below the
  // breakpoint they sit in a row and lighting a rock nobody is pointing at
  // would be a lie.
  const onStones = () => matchMedia('(min-width: 960px)').matches;
  const light = (i: number) => onStones() && setRockLit(i);
  const douse = () => setRockLit(null);
</script>

<ul class="socials">
  {#each SOCIALS as s (s.name)}
    <li>
      <!-- eslint-disable svelte/no-navigation-without-resolve -- external absolute urls from SOCIALS; resolve() is for app routes -->
      <!-- block form: prettier splits this tag's attributes, so a
           disable-next-line would no longer cover the href line -->
      <a
        href={s.href}
        rel="me"
        aria-label="pyre divers on {s.name}"
        style="--x:{s.x};--y:{s.y};--size:{s.size};--ink:{s.ink}"
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
            <!-- the gap only has to clear the bar it passes behind: half a
                 2.7 stroke, near-perpendicular, so ~1.9 units either side
                 of the crossing. Wider than that and the stubs read as two
                 detached ticks beside a slash. -->
            <g class="cut">
              <path d="M9.6 6.2 Q16.4 15.8 23.2 25.7" />
              <path d="M22.9 6.3 Q20 10.3 17.1 14.4" />
              <path d="M14.9 17.6 Q12.1 21.7 9.2 25.6" />
            </g>
          {/if}
        </svg>
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </li>
  {/each}
</ul>
