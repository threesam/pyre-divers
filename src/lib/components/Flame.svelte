<script lang="ts">
  import type { Snippet } from 'svelte';
  import { mountFire } from '$lib/page-fx';

  // a one-screen page with the pyre burning under its copy — the 404 and the
  // unsubscribe page. the flame is the homepage's own (mountFire), placed by
  // this section's --b / --flame in app.css
  let { children }: { children: Snippet } = $props();
</script>

<section class="pyre">
  <canvas aria-hidden="true" {@attach (c) => mountFire(c, c.parentElement)}
  ></canvas>
  <div class="pyre-copy">
    {@render children()}
  </div>
</section>
