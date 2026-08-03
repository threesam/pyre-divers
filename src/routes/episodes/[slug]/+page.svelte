<script lang="ts">
  // Epilogue, imported on this route only — it is the one page with long-form
  // text, and the landing page should not carry four @font-face blocks it never
  // paints. Regular and bold, each with an italic: transcripts need to mark
  // speakers and emphasis, which the single-weight brand face cannot do.
  import '@fontsource/epilogue/400.css';
  import '@fontsource/epilogue/400-italic.css';
  import '@fontsource/epilogue/700.css';
  import '@fontsource/epilogue/700-italic.css';
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const episode = $derived(data.episode);
  const segments = $derived(data.segments);
  const canonicalUrl = $derived(
    `https://pyredivers.com/episodes/${episode.slug}`,
  );

  function formatTimestamp(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // escape `<` so stray episode text can't close the json-ld script element —
  // json never legitimately contains a raw `<`. (solve-for-x pattern.)
  function jsonLdScript(value: object) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
  }

  const episodeJsonLd = $derived({
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: episode.title,
    description: episode.description,
    datePublished: episode.publishedAt,
    url: canonicalUrl,
    associatedMedia: episode.audioUrl
      ? { '@type': 'MediaObject', contentUrl: episode.audioUrl }
      : undefined,
    partOfSeries: {
      '@type': 'PodcastSeries',
      '@id': 'https://pyredivers.com/#podcast',
      name: 'pyre divers',
    },
  });
</script>

<svelte:head>
  <title>{episode.title} — pyre divers</title>
  <meta name="description" content={episode.description} />
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:type" content="video.episode" />
  <meta property="og:title" content={episode.title} />
  <meta property="og:description" content={episode.description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content="https://pyredivers.com/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={episode.title} />
  <meta name="twitter:description" content={episode.description} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- json-stringified + `<`-escaped, not raw html -->
  {@html `<script type="application/ld+json">${jsonLdScript(episodeJsonLd)}<` +
    `/script>`}
</svelte:head>

<main class="episode">
  <a class="back" href={resolve('/')}>&larr; back to the fire</a>

  <h1>{episode.title}</h1>
  <p class="desc">{episode.description}</p>

  {#if episode.videoUrl}
    <div class="player">
      <!-- the full transcript is right below the player -->
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={episode.videoUrl} controls preload="metadata"></video>
    </div>
  {:else if episode.youtubeUrl}
    <!-- eslint-disable svelte/no-navigation-without-resolve -- external youtube url from the db -->
    <!-- block form: prettier splits this tag's attributes, so a
         disable-next-line would no longer cover the href line -->
    <p>
      <a
        class="watch"
        href={episode.youtubeUrl}
        data-umami-event="watch-youtube">watch on youtube</a
      >
    </p>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {/if}

  {#if segments.length}
    <section class="transcript" aria-label="transcript">
      <h2>transcript.</h2>
      {#each segments as segment (segment.id)}
        <p class="segment">
          <span class="t">{formatTimestamp(segment.start)}</span>
          {#if segment.speaker}<span class="who">{segment.speaker}:</span>{/if}
          {segment.text}
        </p>
      {/each}
    </section>
  {/if}
</main>

<style>
  /* Epilogue is the reading face, and it lives HERE rather than globally: this
     is the only route with long-form text. A transcript is thousands of words
     in a 42rem column with speakers to mark, and Pyre Display — the brand face
     the landing page wears — ships one weight and no italic, so there is
     nothing to mark them with. Loading it per-route keeps the landing page's
     critical css free of four @font-face blocks it would never use.
     Headings stay on the brand face; only the prose changes. Epilogue's bold
     and italic ship for when transcript copy carries markup — no rule for
     strong/b here yet, because nothing emits any and svelte-check is held to
     --fail-on-warnings, which counts an unused selector. */
  .desc,
  .segment {
    font-family: 'Epilogue', ui-sans-serif, system-ui, sans-serif;
  }

  .episode {
    max-width: 42rem;
    margin: 0 auto;
    padding: 3.5rem 1.25rem 5rem;
    min-height: 100dvh;
  }
  .back {
    color: #7d745f;
    text-decoration: none;
    font-size: 0.85rem;
  }
  .back:hover {
    color: #b7ad9d;
  }
  h1 {
    margin: 1.2rem 0 0;
    font-size: clamp(1.6rem, 5vw, 2.2rem);
    /* 400, not 700: this is Pyre Display, which ships a single weight, so 700
       would be engine-synthesised and thicken differently per browser. */
    font-weight: 400;
    letter-spacing: -0.01em;
    background: linear-gradient(100deg, #f5b942 10%, #e25822 50%, #b91c1c 90%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    width: fit-content;
  }
  .desc {
    margin: 0.9rem 0 0;
    color: #b7ad9d;
    line-height: 1.55;
  }
  .player {
    margin-top: 2rem;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 60px 8px 50px 8px / 8px 50px 8px 60px;
    border: 2px solid #57492f;
  }
  .player video {
    width: 100%;
    height: 100%;
  }
  .watch {
    color: #f5b942;
  }
  .transcript {
    margin-top: 3rem;
  }
  .transcript h2 {
    font-size: 1.1rem;
    color: #e7e2da;
  }
  .segment {
    margin: 0.9rem 0 0;
    color: #b7ad9d;
    line-height: 1.6;
  }
  .t {
    color: #7d745f;
    font-size: 0.78rem;
    margin-right: 0.5rem;
  }
  .who {
    color: #e7e2da;
    margin-right: 0.35rem;
  }
</style>
