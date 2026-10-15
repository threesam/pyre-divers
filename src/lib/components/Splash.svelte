<script lang="ts">
  // Screen one: the whirlpool and the wordmark.
  import { initPageFx } from '$lib/page-fx';

  // the newest dive, so a stranger landing here from a clip has one line on
  // what this is and one tap to hear it, without scrolling past the swirl
  let {
    latest,
  }: { latest: { href: string; number: number; title: string } | null } =
    $props();

  $effect(() => {
    // detach the sim kickoff from the hydration flush — separate tasks
    // keep each under the long-task line on throttled cpus
    const t = setTimeout(() => initPageFx(), 0);
    return () => clearTimeout(t);
  });
</script>

<section id="splash" aria-label="pyre divers — the whirlpool">
  <canvas id="sea" aria-hidden="true"></canvas>
  <h1 class="wordmark">
    <span class="line"
      ><span class="w">pyre</span> <span class="k">divers</span></span
    >
  </h1>
  {#if latest}
    <!-- eslint-disable svelte/no-navigation-without-resolve -- href is a resolve() result from the page -->
    <a
      class="hero-play"
      href={latest.href}
      data-umami-event="hero-play"
      data-umami-event-episode={latest.number}
    >
      <span class="hero-line">two builders, live and unedited.</span>
      <span class="hero-go"
        >play no. {latest.number}: {latest.title} &rarr;</span
      >
    </a>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {/if}
  <!-- The chevron. Once the only deliberate action on screen one, and the only one
       untracked: the two events tagged in #75 sit on a join submit nobody has
       made yet and an episode page that 404s, so 30d of traffic produced
       exactly zero events. `data-umami-event` rather than a handler — umami's
       own delegated listener already does this, and the anchor still works
       with no JS. -->
  <a
    class="down"
    href="#join"
    aria-label="scroll down — join the list"
    data-umami-event="chevron-down"
  >
    <svg
      width="34"
      height="42"
      viewBox="0 0 34 42"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      ><path d="M5 4 L17 13 L29 4" /><path d="M5 15 L17 24 L29 15" /><path
        d="M5 26 L17 35 L29 26"
      /></svg
    >
  </a>
</section>
