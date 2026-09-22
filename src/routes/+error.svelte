<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import Flame from '$lib/components/Flame.svelte';

  const lost = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{lost ? 'lost' : 'error'} — pyre divers</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Flame>
  <h1>
    <span class="fire-ink"
      >{lost ? 'lost in the smoke.' : 'something caught fire.'}</span
    >
  </h1>
  <p>
    {lost
      ? 'this page burned down, or never caught.'
      : 'not you. give it a minute and try again.'}
  </p>
  <a class="ember" href={resolve('/')}>back to the fire →</a>
</Flame>
