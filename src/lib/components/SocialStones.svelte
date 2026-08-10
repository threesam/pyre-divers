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
            <path
              d="M11 5.6 Q5.6 5.9 5.5 11.4 L5.5 20.8 Q5.7 26.3 11.2 26.5 L21 26.4 Q26.4 26.2 26.5 20.7 L26.4 11 Q26.2 5.7 20.8 5.5 Z"
            />
            <circle cx="16" cy="16" r="5.4" />
            <circle class="ink" cx="21.5" cy="10.4" r="1.2" />
          {:else if s.icon === 'youtube'}
            <path
              d="M8.2 9 Q4.5 9.3 4.4 13 L4.4 19.1 Q4.6 22.8 8.1 23 L23.8 22.9 Q27.5 22.7 27.6 19 L27.5 12.8 Q27.3 9.2 23.7 9 Z"
            />
            <path class="ink" d="M13.7 12.7 L20.6 16.05 L13.7 19.4 Z" />
          {:else}
            <!-- the bird, not the letter: two crossed strokes at this size
                 read as a close button, and the filled X mark reads as a
                 serif letter. the silhouette is the only version legible on
                 a 27px stone. -->
            <path
              class="ink"
              d="M3.6 22.4 Q9.6 24 14.6 20.8 Q8.2 20.2 6.6 15.2 Q8.4 15.9 10.2 15.5 Q4.4 13.7 4.7 8.4 Q6.1 9.3 7.7 9.4 Q3.2 6 5.7 1.9 Q11 8.6 18.6 9.2 Q17.6 5.2 20.4 3.2 Q24 1 27 3.6 Q28.5 3.2 30 2.4 Q29.4 4 28 5 Q29.4 4.8 30.6 4.3 Q29.7 5.8 28.2 6.9 Q28.5 16.2 21.4 21.2 Q14 26 3.6 22.4 Z"
            />
          {/if}
        </svg>
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </li>
  {/each}
</ul>
