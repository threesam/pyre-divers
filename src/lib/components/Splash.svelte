<script lang="ts">
  // Screen one: the whirlpool and the wordmark. `look` picks one of the two
  // finished treatments (see $lib/looks) — it drives BOTH the css, via the
  // data-look attribute the stylesheet keys off, and the sim, via the config
  // handed to initPageFx. They have to move together: the colours only work
  // against the matching core treatment.
  import { initPageFx } from '$lib/page-fx';
  import { DEFAULT_LOOK, LOOKS, type Look } from '$lib/looks';

  let { look = DEFAULT_LOOK }: { look?: Look } = $props();

  $effect(() => {
    // detach the sim kickoff from the hydration flush — separate tasks
    // keep each under the long-task line on throttled cpus
    const t = setTimeout(() => initPageFx(LOOKS[look]), 0);
    return () => clearTimeout(t);
  });
</script>

<section
  id="splash"
  data-look={look}
  aria-label="pyre divers — the whirlpool"
>
  <canvas id="sea" aria-hidden="true"></canvas>
  <h1 class="wordmark">
    <span class="line"
      ><span class="w">pyre</span> <span class="k">divers</span></span
    >
  </h1>
  <a class="down" href="#join" aria-label="scroll down — join the list">
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
