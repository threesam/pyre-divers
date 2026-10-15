<script lang="ts">
  import { resolve } from '$app/paths';
  import { FEED, SITE } from '$lib/links';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>all episodes — pyre divers</title>
  <meta
    name="description"
    content="every pyre divers episode, newest first. two builders, live and unedited."
  />
  <link rel="canonical" href="{SITE}/episodes" />
  <link
    rel="alternate"
    type="application/rss+xml"
    title="pyre divers"
    href={FEED}
  />
</svelte:head>

<main class="all">
  <a class="back" href={resolve('/')}>&larr; back to the fire</a>
  <h1>all episodes.</h1>

  {#if data.dives.length}
    <ol class="eps" reversed>
      {#each data.dives as d (d.slug)}
        <li>
          <a class="ep" href={resolve('/episodes/[slug]', { slug: d.slug })}>
            <span class="kicker">no. {d.number} · {d.minutes} min</span>
            <span class="title">{d.title}.</span>
            <span class="desc">{d.description}</span>
          </a>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="desc">the first dive is on its way.</p>
  {/if}
</main>

<style>
  /* the episode page's column and palette; each dive is the homepage's
     hand-drawn slab, the whole slab one link */
  .all {
    max-width: 42rem;
    margin: 0 auto;
    padding: 3.5rem 1.25rem 5rem;
    min-height: 100svh;
    box-sizing: border-box;
  }
  .back {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    color: #877d67;
    text-decoration: none;
    font-size: 0.85rem;
  }
  .back:hover {
    color: #b7ad9d;
  }
  h1 {
    margin: 0.6rem 0 0;
    font-size: clamp(1.6rem, 5vw, 2.2rem);
    font-weight: 400;
    letter-spacing: -0.01em;
    background: linear-gradient(100deg, #f5b942 10%, #e25822 50%, #b91c1c 90%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    width: fit-content;
  }
  .eps {
    list-style: none;
    margin: 2rem 0 0;
    padding: 0;
    display: grid;
    gap: 1rem;
  }
  .ep {
    display: grid;
    gap: 0.2rem;
    padding: 0.9rem 1.2rem 1rem;
    border: 1.5px solid #57492f;
    border-radius: 60px 8px 50px 8px / 8px 50px 8px 60px;
    color: inherit;
    text-decoration: none;
    transition: border-color 0.2s;
  }
  .ep:hover,
  .ep:focus-visible {
    border-color: #e25822;
  }
  .ep:focus-visible {
    outline: 2px solid #f5b942;
    outline-offset: 3px;
  }
  .kicker {
    font-size: 0.78rem;
    color: #b7ad9d;
  }
  .title {
    font-size: 1.5rem;
    line-height: 1.2;
    color: #f5b942;
  }
  .desc {
    color: #b7ad9d;
    font-size: 0.95rem;
    line-height: 1.55;
  }
</style>
