<script lang="ts">
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
  // Below 769px the canvas is display:none and there are no stones at all,
  // so the same three anchors reflow into a plain row under the card.
  //
  // Icon paths are drawn in the site's hand: quadratic curves so the edges
  // bow, round caps, ~2.4 stroke on a 32 viewBox — the same language as the
  // stones (drawRock uses quadraticCurveTo for exactly this reason).

  interface Social {
    name: string;
    href: string;
    /** rock centre, normalized — width for x, height for y */
    x: number;
    y: number;
    /** icon box height in vh, ~62% of the stone it sits on */
    size: number;
    path: string;
  }

  // Handles assumed to be `pyredivers` on all three — correct here if not.
  const SOCIALS: Social[] = [
    {
      name: 'instagram',
      href: 'https://instagram.com/pyredivers',
      x: 1 / 3 - 0.045,
      y: 0.84,
      size: 3.4,
      path: 'instagram',
    },
    {
      name: 'youtube',
      href: 'https://youtube.com/@pyredivers',
      x: 1 / 3 + 0.008,
      y: 0.848,
      size: 4.1,
      path: 'youtube',
    },
    {
      name: 'x',
      href: 'https://x.com/pyredivers',
      x: 1 / 3 + 0.062,
      y: 0.838,
      size: 3,
      path: 'x',
    },
  ];
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
        style="--x:{s.x};--y:{s.y};--size:{s.size}"
      >
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          {#if s.path === 'instagram'}
            <path
              d="M11 5.6 Q5.6 5.9 5.5 11.4 L5.5 20.8 Q5.7 26.3 11.2 26.5 L21 26.4 Q26.4 26.2 26.5 20.7 L26.4 11 Q26.2 5.7 20.8 5.5 Z"
            />
            <circle cx="16" cy="16" r="5.4" />
            <circle class="ink" cx="21.5" cy="10.4" r="1.2" />
          {:else if s.path === 'youtube'}
            <path
              d="M8.2 9 Q4.5 9.3 4.4 13 L4.4 19.1 Q4.6 22.8 8.1 23 L23.8 22.9 Q27.5 22.7 27.6 19 L27.5 12.8 Q27.3 9.2 23.7 9 Z"
            />
            <path class="ink" d="M13.7 12.7 L20.6 16.05 L13.7 19.4 Z" />
          {:else}
            <path d="M8.4 7.8 Q16.4 15.6 23.9 24.4" />
            <path d="M23.9 7.9 Q15.6 16.2 8.1 24.3" />
          {/if}
        </svg>
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </li>
  {/each}
</ul>
