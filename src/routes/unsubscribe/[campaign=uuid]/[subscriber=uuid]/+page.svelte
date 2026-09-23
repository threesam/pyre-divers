<script lang="ts">
  import { resolve } from '$app/paths';
  import Flame from '$lib/components/Flame.svelte';
  import { forgetJoined } from '$lib/subscribe';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  // off the list, so the episode page's bar may ask again in this browser
  $effect(() => {
    if (form?.done) {
      forgetJoined();
    }
  });
</script>

<svelte:head>
  <title>unsubscribe — pyre divers</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Flame>
  {#if form?.done}
    <h1><span class="fire-ink">you're out.</span></h1>
    <p>no more emails. the fire's still lit if you want back in.</p>
    <a class="ember" href={resolve('/')}>back to the fire →</a>
  {:else}
    <h1><span class="fire-ink">leaving the fire?</span></h1>
    <p>
      no more dives by email. the podcast keeps burning wherever you listen.
    </p>
    <form method="POST">
      <button class="join" type="submit">unsubscribe.</button>
    </form>
    {#if form?.failed}
      <p role="alert">didn't take. try again?</p>
    {/if}
    <a class="ember" href={resolve('/')}>never mind →</a>
  {/if}
</Flame>
