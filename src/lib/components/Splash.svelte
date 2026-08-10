<script lang="ts">
  // Screen one: the whirlpool and the wordmark.
  import { initPageFx } from '$lib/page-fx';

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
  <!-- The only deliberate action on screen one, and until now the only one
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
