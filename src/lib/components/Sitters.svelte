<script lang="ts">
  import { FLAME_X, LOGS, SEAT } from '$lib/page-fx';
  import { SITTERS, type Sitter } from '$lib/sitters';
  import { resolve } from '$app/paths';
  import { tick } from 'svelte';

  // The people on the logs. The logs and the seated bodies are canvas
  // (page-fx `logs`, `drawSitter`); the heads are these buttons, stamped on
  // the shoulders — the SocialStones pattern: the painting stays decorative,
  // keyboards and screen readers get a button that opens a card.
  //
  // COORDINATES COME FROM THE CANVAS: LOGS and SEAT are the one description
  // of where a body sits, in viewport heights from FLAME_X, so a head cannot
  // drift off its shoulders. The button's bottom edge is the top of the neck.
  let { latest }: { latest: { slug: string; title: string } | null } = $props();

  const placed = SITTERS.map((s) => {
    const log = LOGS[s.log];
    return {
      ...s,
      dx: log.dx,
      y: log.cy - log.ry - SEAT.torso - SEAT.neck,
    };
  });

  let dialog: HTMLDialogElement;
  let who = $state<Sitter | null>(null);
  // wait for the card's content to render before opening, so the dialog
  // has a link to hand focus to; opened empty, focus lands on the dialog
  // itself and the browser paints its ring around the whole card
  const open = async (s: Sitter) => {
    who = s;
    await tick();
    dialog.showModal();
  };
  const dive = $derived(
    who?.episode ? { slug: who.episode, title: who.episode } : latest,
  );
</script>

<ul class="sitters">
  {#each placed as s (s.name)}
    <li>
      <button
        type="button"
        aria-label="about {s.name}"
        data-umami-event="sitter"
        data-umami-event-who={s.name}
        style="--x:{FLAME_X};--dx:{s.dx};--y:{s.y};--h:{s.h}"
        onclick={() => open(s)}
      >
        <img src={s.head} alt="" width={s.w} height="240" />
      </button>
    </li>
  {/each}
</ul>

<!-- native dialog: focus trap, escape, backdrop and inertness for free -->
<dialog
  class="sitter-card"
  bind:this={dialog}
  aria-labelledby="sitter-name"
  onclose={() => (who = null)}
>
  {#if who}
    <h2 id="sitter-name" class="fire">
      <span class="fire-ink">{who.name}.</span>
    </h2>
    <p>{who.full}, {who.role}.</p>
    <p>
      {#if who.url}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external url from SITTERS -->
        <a href={who.url}>{who.url.replace('https://', '')}</a>
      {/if}
      {#if dive}
        {#if who.url}·{/if}
        <a href={resolve('/episodes/[slug]', { slug: dive.slug })}
          >{who.role === 'host' ? 'latest dive' : 'their dive'}: {dive.title}.</a
        >
      {/if}
    </p>
    <form method="dialog"><button class="close">close</button></form>
  {/if}
</dialog>
