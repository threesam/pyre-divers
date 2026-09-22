<script lang="ts">
  import { FLAME_X, LOGS, SEAT } from '$lib/page-fx';
  import { SITTERS } from '$lib/sitters';
  import { resolve } from '$app/paths';

  // The people on the logs. The logs and the seated bodies are canvas
  // (page-fx `logs`, `drawSitter`); the heads are these buttons, stamped on
  // the shoulders. Pointing at a head (or tabbing to it) raises a card with
  // who they are, where to find them and the dives they're in; on touch the
  // head is a toggle.
  //
  // COORDINATES COME FROM THE CANVAS: LOGS and SEAT are the one description
  // of where a body sits, in scene units (--u, see +page.svelte) from
  // FLAME_X / FLAME_BASE, so a head cannot drift off its shoulders. The
  // item's bottom edge is the top of the neck.
  type Dive = { slug: string; title: string; number: number };
  let { dives }: { dives: Dive[] } = $props();

  const placed = SITTERS.map((s) => {
    const log = LOGS[s.log];
    return {
      ...s,
      dx: log.dx,
      y: log.cy - log.ry - SEAT.torso - SEAT.neck,
      // which side of the fire: the card hangs outward on desktop, inward
      // on a phone (where outward is off screen)
      side: log.dx < 0 ? 'left' : 'right',
      // hosts are in every dive; a guest is in theirs
      in: s.episode ? dives.filter((d) => d.slug === s.episode) : dives,
    };
  });

  // the tap-to-toggle state (touch). hover and keyboard focus are pure css.
  let open = $state<string | null>(null);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') open = null;
  }}
/>

<ul class="sitters">
  {#each placed as s (s.name)}
    <li
      class="{s.side} {open === s.name ? 'open' : ''}"
      class:flip={s.flip}
      style="--x:{FLAME_X};--dx:{s.dx};--y:{s.y};--h:{s.h}"
    >
      <button
        type="button"
        class="head"
        aria-label="about {s.name}"
        aria-expanded={open === s.name}
        aria-controls="sitter-{s.name}"
        data-umami-event="sitter"
        data-umami-event-who={s.name}
        onclick={() => (open = open === s.name ? null : s.name)}
      >
        <img src={s.head} alt="" width={s.w} height="240" />
      </button>
      <div class="tag" id="sitter-{s.name}">
        <p class="who"><strong>{s.name}.</strong> {s.full}, {s.role}.</p>
        {#if s.links.length}
          <p class="links">
            {#each s.links as l, i (l.href)}
              {#if i}·{/if}
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external url from SITTERS -->
              <a href={l.href}>{l.label}</a>
            {/each}
          </p>
        {/if}
        {#if s.in.length}
          <p class="dives">
            {s.in.length === 1 ? 'dive' : 'dives'}:
            {#each s.in as d, i (d.slug)}
              {#if i}·{/if}
              <a href={resolve('/episodes/[slug]', { slug: d.slug })}
                >{d.number}. {d.title}</a
              >
            {/each}
          </p>
        {/if}
      </div>
    </li>
  {/each}
</ul>
