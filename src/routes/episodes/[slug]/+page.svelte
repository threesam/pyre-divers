<script lang="ts">
  // Epilogue, imported on this route only — it is the one page with long-form
  // text, and the landing page should not carry four @font-face blocks it never
  // paints. Regular and bold, each with an italic: transcripts need to mark
  // speakers and emphasis, which the single-weight brand face cannot do.
  import '@fontsource/epilogue/400.css';
  import '@fontsource/epilogue/400-italic.css';
  import '@fontsource/epilogue/700.css';
  import '@fontsource/epilogue/700-italic.css';
  import { tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import SubscribeBar from '#lib/components/SubscribeBar.svelte';
  import { FEED, HOSTS, SITE } from '#lib/links.js';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const episode = $derived(data.episode);
  const segments = $derived(data.segments);
  const canonicalUrl = $derived(`${SITE}/episodes/${episode.slug}`);
  const OG_IMAGE = `${SITE}/og.jpg`;
  // iso 8601 duration for json-ld: 2285 s -> PT38M5S
  const isoDuration = (s: number) => `PT${Math.floor(s / 60)}M${s % 60}S`;

  function formatTimestamp(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // listening, not just loading: one `play` per visit, then `listened` as
  // the share actually heard crosses each quarter. Heard, not the playhead's
  // position: a transcript click jumps, and a jump to 30:00 is not 75% of an
  // episode listened to. `played` is the browser's own record of the ranges
  // that played, seeks excluded. 95, not 100 — the tail is outro music, and a
  // finished episode shouldn't hinge on its last seconds.
  const MARKS = [25, 50, 75, 95];
  // also docks the player at the top: once it's playing, its pause control
  // has to stay in reach of a reader deep in the transcript
  let started = $state(false);
  let bar: SubscribeBar | undefined = $state();
  let nextMark = 0;
  function onplay() {
    if (cueAt >= 0) {
      seek(cueAt);
    }
    if (!started) {
      started = true;
      window.umami?.track('play', { episode: episode.slug });
    }
  }
  function ontimeupdate(e: Event & { currentTarget: HTMLAudioElement }) {
    const { played, duration } = e.currentTarget;
    let heard = 0;
    for (let i = 0; i < played.length; i++) {
      heard += played.end(i) - played.start(i);
    }
    const pct = (heard / duration) * 100;
    while (nextMark < MARKS.length && pct >= MARKS[nextMark]) {
      window.umami?.track('listened', {
        episode: episode.slug,
        pct: MARKS[nextMark],
      });
      // a quarter in is the moment to ask; the bar decides whether it can
      bar?.nudge();
      nextMark++;
    }
  }

  // descript-style: a transcript segment plays the episode from where it
  // starts. preload is none, so a first click finds nothing loaded, and that
  // one waits for metadata. Setting currentTime before it does start playback
  // in the right place, but it isn't a seek: chromium and webkit both record
  // `played` as 0 to there, and a cold jump to 18:05 would log a quarter heard.
  let player: HTMLMediaElement | undefined = $state();
  let now = $state(0);
  // a moment a clip linked to (see the afterNavigate below); -1 = none
  let cueAt = $state(-1);
  // the segment under the playhead: the last one to start at or before it.
  // A cued moment stands in for the playhead until it plays
  const current = $derived.by(() => {
    const at = cueAt >= 0 ? cueAt : now > 0 ? now : -1;
    return at >= 0 ? segments.findLastIndex((s) => s.start <= at) : -1;
  });
  const minutes = $derived(
    episode.durationSeconds ? Math.round(episode.durationSeconds / 60) : 0,
  );

  function seek(t: number) {
    // a seek of any kind uses up the clip's cue
    cueAt = -1;
    const media = player;
    if (!media) {
      return;
    }
    if (media.readyState > 0) {
      media.currentTime = t;
    } else {
      media.addEventListener(
        'loadedmetadata',
        () => {
          media.currentTime = t;
        },
        { once: true },
      );
    }
    // a click is a user gesture, so play() is allowed; a rejection here is an
    // interrupted load, not something to surface
    media.play().catch(() => undefined);
  }

  // one listener for every segment. The timestamp button is the keyboard path
  // (its click bubbles here); a pointer can land anywhere in the text.
  function onpick(e: MouseEvent) {
    const target = e.target as Element;
    const segment = target.closest<HTMLElement>('[data-start]');
    if (!segment) {
      return;
    }
    // a drag to copy a quote isn't a seek; the button always is. A
    // double-click on a word still seeks: its first click can't know a second
    // is coming, and waiting to find out would slow every click (and can lose
    // the user gesture iOS wants for play()). Click-anywhere is the point.
    if (!target.closest('button') && getSelection()?.toString()) {
      return;
    }
    seek(Number(segment.dataset.start));
  }

  // a clip links to its moment: /episodes/x#t=600 (or ?t=600). Nothing can
  // play without a tap, so the moment is cued: the player docks at the top,
  // the line being said is marked and scrolled to, and the first play starts
  // there, through seek() so the skipped part isn't logged as heard.
  // afterNavigate, not onMount: it runs on arrival too, but after the
  // router's own scroll, which would otherwise put a client-side arrival
  // back at the top (#t=600 is no element's id).
  // A same-page #t= change is a native hash navigation that afterNavigate
  // never sees, so hashchange cues too. No t clears the cue: this component
  // is reused from one episode to the next.
  // Already playing: a new moment is a seek, not a cue. A router back/forward
  // keeps its restored scroll; a hash-only one can't be told from a fresh
  // #t= link (both fire popstate), so it shows the moment its address names.
  async function cue(url: URL, scroll = true) {
    const raw =
      /^#t=(\d+(?:\.\d+)?)$/.exec(url.hash)?.[1] ?? url.searchParams.get('t');
    const t = Number(raw);
    if (!raw || !Number.isFinite(t) || t < 0) {
      cueAt = -1;
      return;
    }
    if (player && !player.paused) {
      seek(t);
      return;
    }
    cueAt = t;
    if (scroll) {
      // after the cue docks the player and the transcript's font is in:
      // either one reflows the page, and a scroll begun before it centres
      // the line in a layout that then shifts under it
      await tick();
      await document.fonts.ready;
      const i = segments.findLastIndex((s) => s.start <= t);
      document
        .querySelectorAll<HTMLElement>('.segment')
        [i]?.scrollIntoView({ block: 'center' });
    }
  }
  afterNavigate(({ to, type }) => {
    if (to) {
      cue(to.url, type !== 'popstate');
    }
  });
  // the scrubber is a seek too: a time picked by hand beats the clip's cue
  // (seek() clears the cue before it moves the playhead, so its own seeking
  // finds nothing to clear)
  function onseeking() {
    cueAt = -1;
  }

  // escape `<` so stray episode text can't close the json-ld script element —
  // json never legitimately contains a raw `<`. (solve-for-x pattern.)
  function jsonLdScript(value: object) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
  }

  const episodeJsonLd = $derived({
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    '@id': canonicalUrl,
    name: episode.title,
    description: episode.description,
    url: canonicalUrl,
    datePublished: episode.publishedAt,
    episodeNumber: data.number,
    duration: episode.durationSeconds
      ? isoDuration(episode.durationSeconds)
      : undefined,
    inLanguage: 'en',
    image: OG_IMAGE,
    author: HOSTS,
    associatedMedia: episode.audioUrl
      ? {
          '@type': 'AudioObject',
          contentUrl: episode.audioUrl,
          encodingFormat: 'audio/mpeg',
          duration: episode.durationSeconds
            ? isoDuration(episode.durationSeconds)
            : undefined,
        }
      : undefined,
    partOfSeries: {
      '@type': 'PodcastSeries',
      '@id': `${SITE}/#podcast`,
      name: 'pyre divers',
      url: `${SITE}/`,
      webFeed: FEED,
    },
  });
</script>

<svelte:window onhashchange={() => cue(new URL(location.href))} />

<svelte:head>
  <title>{episode.title} — pyre divers</title>
  <meta name="description" content={episode.description} />
  <link rel="canonical" href={canonicalUrl} />
  <!-- article, not video.episode: this is an audio episode with its transcript -->
  <meta property="og:type" content="article" />
  {#if episode.publishedAt}
    <meta
      property="article:published_time"
      content={episode.publishedAt.toISOString()}
    />
  {/if}
  <meta property="og:site_name" content="pyre divers" />
  <meta property="og:title" content={episode.title} />
  <meta property="og:description" content={episode.description} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={OG_IMAGE} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta
    property="og:image:alt"
    content="a whirlpool of tiny hand-drawn stick figures on an ember gradient, with the wordmark: pyre divers"
  />
  {#if episode.audioUrl}
    <meta property="og:audio" content={episode.audioUrl} />
    <meta property="og:audio:type" content="audio/mpeg" />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={episode.title} />
  <meta name="twitter:description" content={episode.description} />
  <meta name="twitter:image" content={OG_IMAGE} />
  <link
    rel="alternate"
    type="application/rss+xml"
    title="pyre divers"
    href={FEED}
  />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- json-stringified + `<`-escaped, not raw html -->
  {@html `<script type="application/ld+json">${jsonLdScript(episodeJsonLd)}<` +
    `/script>`}
</svelte:head>

<main class="episode">
  <a class="back" href={resolve('/')}>&larr; back to the fire</a>

  <!-- the length up front: the native player reads 0:00 / 0:00 until it
       loads, and preload stays none (the file is ~40MB) -->
  <p class="kicker">
    no. {data.number}{#if minutes}&nbsp;· {minutes} min{/if}
  </p>
  <h1>{episode.title}</h1>
  <p class="desc">{episode.description}</p>

  {#if episode.videoUrl}
    <div class="player" id="listen">
      <!-- the full transcript is right below the player -->
      <!-- ponytail: video doesn't dock like the audio does, since no episode
           has one yet. Pin the player (or go picture-in-picture) when one
           does. playsinline: an iPhone would otherwise take a transcript tap
           fullscreen, over the transcript -->
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={episode.videoUrl}
        controls
        playsinline
        preload="metadata"
        bind:this={player}
        bind:currentTime={now}
        {onplay}
        {onseeking}
      ></video>
    </div>
  {:else if episode.audioUrl}
    <!-- preload none: the file is ~40MB, and most visitors come to read -->
    <audio
      id="listen"
      class="listen"
      class:docked={started || cueAt >= 0}
      src={episode.audioUrl}
      controls
      preload="none"
      bind:this={player}
      bind:currentTime={now}
      {onplay}
      {onseeking}
      {ontimeupdate}
    ></audio>
  {/if}

  {#if episode.youtubeUrl || episode.spotifyUrl || episode.applePodcastsUrl}
    <!-- eslint-disable svelte/no-navigation-without-resolve -- external urls from the db -->
    <!-- block form: prettier splits these tags' attributes, so a
         disable-next-line would no longer cover the href lines -->
    <p class="elsewhere">
      {#if episode.youtubeUrl}<a
          class="watch"
          href={episode.youtubeUrl}
          data-umami-event="watch-youtube"
          data-umami-event-from="episode">watch on YouTube</a
        >{/if}
      {#if episode.spotifyUrl}<a
          class="watch"
          href={episode.spotifyUrl}
          data-umami-event="listen-spotify"
          data-umami-event-from="episode">Spotify</a
        >{/if}
      {#if episode.applePodcastsUrl}<a
          class="watch"
          href={episode.applePodcastsUrl}
          data-umami-event="listen-apple"
          data-umami-event-from="episode">Apple Podcasts</a
        >{/if}
    </p>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {/if}

  {#if segments.length}
    <!-- ponytail: segments come from transcribing the episode's audio, so a
         transcript always has a player to seek. keyboard: every segment's
         timestamp is a real button, and its click bubbles to this handler -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <section
      class="transcript"
      id="transcript"
      aria-label="transcript"
      onclick={onpick}
    >
      <h2>transcript.</h2>
      {#each segments as segment, i (segment.id)}
        <p class="segment" class:now={i === current} data-start={segment.start}>
          <button
            type="button"
            class="t"
            aria-label="play from {formatTimestamp(segment.start)}"
            >{formatTimestamp(segment.start)}</button
          >
          {#if segment.speaker}<span class="who">{segment.speaker}:</span>{/if}
          {segment.text}
        </p>
      {/each}
    </section>
  {/if}

  <!-- last in main: it sticks to the bottom for as long as main is on screen -->
  <SubscribeBar bind:this={bar} />
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
    min-height: 100svh;
  }
  .back {
    /* 44px tall, so a thumb lands on it; the text stays small */
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
  .kicker {
    margin: 0.6rem 0 0;
    font-size: 0.78rem;
    color: #b7ad9d;
  }
  h1 {
    margin: 0.2rem 0 0;
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
  .listen {
    display: block;
    width: 100%;
    margin-top: 2rem;
    /* native controls in the page's dark palette, not a white slab */
    color-scheme: dark;
  }
  /* playing: the player rides the top of the screen, pause in reach from
     anywhere in the transcript. The page colour behind and around it, so
     text scrolling under doesn't show through past the native controls. */
  .listen.docked {
    position: sticky;
    top: 0.5rem;
    z-index: 1;
    background: #10120a;
    box-shadow: 0 0 0 0.5rem #10120a;
  }
  /* a segment focused from below must not land under the docked player */
  :global(html:has(audio.docked)) {
    scroll-padding-top: 5rem;
  }
  /* the native controls' own focus ring is faint on the dark scheme */
  .listen:focus-visible {
    outline: 2px solid #f5b942;
    outline-offset: 3px;
  }
  .elsewhere {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.2rem;
    margin: 0.6rem 0 0;
  }
  .watch {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    color: #f5b942;
  }
  .transcript {
    margin-top: 3rem;
    /* app.css sizes every section as one clipped screen (the landing's
       scenes). A transcript is long-form: it has to grow, or everything past
       the first screen is cut off and can't be scrolled to. */
    height: auto;
    overflow: visible;
  }
  .transcript h2 {
    font-size: 1.1rem;
    color: #e7e2da;
  }
  .segment {
    margin: 0.9rem 0 0;
    color: #b7ad9d;
    line-height: 1.6;
    cursor: pointer;
    /* the now-playing rule lives in the gutter, so marking a segment moves
       no text */
    border-left: 2px solid transparent;
    padding-left: 0.75rem;
    margin-left: calc(-0.75rem - 2px);
  }
  /* hover-capable pointers only: a phone keeps a tapped segment in :hover,
     which would read as a second now-playing mark */
  @media (hover: hover) {
    .segment:hover {
      color: #d6cfc4;
    }
    .t:hover {
      color: #f5b942;
    }
  }
  .segment.now {
    color: #e7e2da;
    border-left-color: #e25822;
  }
  /* a button dressed as the muted timestamp it replaced. The ::after widens
     the target to 44px without moving the text */
  .t {
    position: relative;
    font: inherit;
    font-size: 0.78rem;
    color: #877d67;
    background: none;
    border: none;
    padding: 0.3rem 0.25rem;
    margin: 0 0.25rem 0 -0.25rem;
    cursor: pointer;
  }
  .t::after {
    content: '';
    position: absolute;
    inset: 50% auto auto 50%;
    width: max(100%, 2.75rem);
    height: 2.75rem;
    transform: translate(-50%, -50%);
  }
  .segment.now .t {
    color: #f5b942;
  }
  .t:focus-visible {
    outline: 2px solid #f5b942;
    outline-offset: 1px;
  }
  .who {
    color: #e7e2da;
    margin-right: 0.35rem;
  }
</style>
