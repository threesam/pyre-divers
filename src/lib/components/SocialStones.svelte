<script lang="ts">
  import { FLAME_X, ROCKS, emberAt, setRockLit } from '$lib/page-fx';
  import { SHOW } from '$lib/links';

  // The social and listening links, stamped on the five stones ringing the
  // flame's mouth: the places to listen in the middle, the socials outside.
  //
  // The stones themselves are canvas (page-fx `rocks`), and #fire is
  // aria-hidden — correctly, it is decoration. Canvas cannot be focused,
  // tabbed to, or read out, so the links are real anchors laid over the
  // stones rather than hit-testing on the canvas. Screen readers and
  // keyboards get ordinary links; the painting stays decorative.
  //
  // COORDINATES COME FROM THE CANVAS, not from a copy of them. ROCKS is the
  // one place the stones are described; page-fx feeds it to mkRock and this
  // feeds it to CSS, so a stone cannot move out from under its own link.
  // `section` is position:relative and exactly 100dvh (app.css:52) and #fire
  // is inset:0 inside it, so a percentage of #join is the same coordinate
  // the canvas paints in.
  //
  // Below 1024px the card's frame reaches across the rightmost stone, so the
  // same anchors reflow into a plain row and the stones go back to being
  // unstamped. See the app.css breakpoint note for the arithmetic.
  //
  // Icons are drawn in the site's hand — uneven paths through the wobble-i
  // turbulence filter, the same device the card frame and button slab use.

  interface Social {
    name: string;
    /** null until the listing exists; the stone stays plain until then */
    href: string | null;
    /** which stone, as an index into ROCKS — the single source of geometry */
    rock: number;
    icon: 'instagram' | 'spotify' | 'youtube' | 'apple' | 'x';
  }

  // Everything else is DERIVED from ROCKS below — nothing about the stones
  // is written down twice. Listed left to right as they sit on the ring, so
  // the DOM order (tab order, and the row below 1024px) matches what you see.
  const SOCIALS: Social[] = [
    { name: 'instagram', href: SHOW.instagram, rock: 0, icon: 'instagram' },
    { name: 'spotify', href: SHOW.spotify, rock: 2, icon: 'spotify' },
    { name: 'youtube', href: SHOW.youtube, rock: 4, icon: 'youtube' },
    { name: 'apple podcasts', href: SHOW.apple, rock: 3, icon: 'apple' },
    { name: 'x', href: SHOW.x, rock: 1, icon: 'x' },
  ];

  /**
   * Everything positional, computed from the one source.
   *
   * `z` is the ROCKS index + 1: that array is in paint order, so the stone
   * drawn last is the one in front, and the target that should win the
   * pointer where they overlap. Derived, so it cannot disagree.
   *
   * `size` is the icon box in vh at ~68% of the stone's height. ry is a
   * fraction of viewport height, so the stone is `ry * 200` vh tall and
   * 68% of that is `ry * 136`.
   *
   * `ink` is the ember run sampled where this stone sits, so each icon
   * wears the shade its own outline already does.
   */
  // one event name per destination, shared with the episode page's links,
  // so a spotify click counts as `listen-spotify` wherever it happened and
  // `from` says which surface sent it
  const EVENT: Record<Social['icon'], string> = {
    instagram: 'follow-instagram',
    spotify: 'listen-spotify',
    youtube: 'watch-youtube',
    apple: 'listen-apple',
    x: 'follow-x',
  };

  const placed = SOCIALS.flatMap(({ href, ...s }) => {
    if (!href) {
      return [];
    }
    const r = ROCKS[s.rock];
    return {
      ...s,
      href,
      dx: r.dx,
      y: r.cy,
      rx: r.rx,
      ry: r.ry,
      z: s.rock + 1,
      size: r.ry * 136,
      ink: emberAt(r.dx),
    };
  });

  // Only light a stone when the icons are actually ON the stones. Below the
  // breakpoint they sit in a row, and lighting a rock nobody is pointing at
  // would be a lie.
  //
  // ASK THE LAYOUT, don't re-decide it. The anchors are position:absolute
  // only in the stone layout, so this reads the answer CSS already gave.
  // Repeating the 960 here in a matchMedia would be the breakpoint written
  // twice, and the two would drift apart in silence — hovering a stone that
  // never lights, or lighting a stone that is not under the pointer.
  const onStones = (el: Element) =>
    getComputedStyle(el).position === 'absolute';

  // ONE signal, not two. The stone is lit by these handlers and the icon has
  // to go dark at the same instant, so both read `lit`. Driving the icon
  // from CSS :hover/:focus-visible instead looks identical until the two
  // conditions disagree, and they do: clicking a link with a mouse fires
  // focus but not :focus-visible, and a touch screen past 960 fires
  // pointerenter with no :hover at all. Either way the stone lights, the
  // icon stays ember on an ember fill, and it vanishes.
  let lit = $state<number | null>(null);

  const light = (i: number, el: Element) => {
    if (!onStones(el)) return;
    lit = i;
    setRockLit(i);
  };
  const douse = () => {
    lit = null;
    setRockLit(null);
  };

  // litRock lives at module scope in page-fx, so it outlives this component
  // and the layout it was lit in. Three ways to strand a burning stone with
  // nothing pointing at it: navigating away mid-hover, and narrowing or
  // shortening the window mid-hover so the icons reflow off the stones and
  // no pointerleave ever fires. resize covers the last two without naming a
  // breakpoint — the next hover re-asks the layout anyway.
  $effect(() => {
    addEventListener('resize', douse);
    return () => {
      removeEventListener('resize', douse);
      douse();
    };
  });
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
        data-umami-event={EVENT[s.icon]}
        data-umami-event-from="home"
        class:lit={lit === s.rock}
        style="--x:{FLAME_X};--dx:{s.dx};--y:{s.y};--rx:{s.rx};--ry:{s.ry};--z:{s.z};--size:{s.size};--ink:{s.ink}"
        onpointerenter={(e) => light(s.rock, e.currentTarget)}
        onpointerleave={douse}
        onfocus={(e) => light(s.rock, e.currentTarget)}
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
          {:else if s.icon === 'spotify'}
            <!-- the badge is a filled disc with three dark arcs; drawn, it
                 inverts — an uneven ring and three ember strokes, each
                 shorter and flatter than the one above, the way sound
                 falls off -->
            <path
              d="M16.3 4.1 Q27.9 4.4 27.8 15.8 Q28.1 27.6 15.9 27.9 Q4.3 27.7 4.1 16.2 Q4.2 4.6 16.3 4.1 Z"
            />
            <path d="M8.9 12.9 Q16.2 9.7 23.2 13.5" />
            <path d="M10.2 17.1 Q16.1 14.8 21.8 17.8" />
            <path d="M11.5 21.2 Q16 19.6 20.2 21.9" />
          {:else if s.icon === 'apple'}
            <!-- the podcasts glyph: a head on a tapering stem, inside two
                 broadcast rings open at the bottom. the rings are arcs, not
                 circles, for the same reason the instagram lens is -->
            <path
              d="M8.7 22.7 Q3.6 17 6.4 10.6 Q9.8 4.3 16.2 4.4 Q22.7 4.2 25.9 10.9 Q28.5 17.2 23.5 22.9"
            />
            <path
              d="M11.9 19.5 Q9.4 16.2 11 12.6 Q13.1 9.3 16.1 9.4 Q19.6 9.2 21.1 12.9 Q22.6 16.4 20.2 19.6"
            />
            <path
              class="ink"
              d="M16.1 12.4 Q18.4 12.5 18.3 14.7 Q18.2 16.9 16 16.8 Q13.8 17 13.9 14.6 Q14 12.3 16.1 12.4 Z"
            />
            <path
              class="ink"
              d="M14.6 18.9 Q16 18.2 17.5 18.9 L16.8 27.2 Q16 27.8 15.3 27.2 Z"
            />
          {:else if s.icon === 'youtube'}
            <path
              d="M8.4 8.8 Q4.6 9.2 4.3 12.9 L4.5 19.3 Q4.4 22.9 8.3 23.2 L23.6 22.8 Q27.7 22.6 27.4 18.8 L27.6 12.9 Q27.2 9.1 23.5 8.9 Z"
            />
            <path
              class="ink"
              d="M13.6 12.6 Q17.2 14.2 20.7 16.1 Q17 17.9 13.8 19.5 Q13.5 16 13.6 12.6 Z"
            />
          {:else}
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
