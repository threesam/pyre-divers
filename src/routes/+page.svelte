<script lang="ts">
  import Splash from '$lib/components/Splash.svelte';
  import SocialStones from '$lib/components/SocialStones.svelte';
  import Sitters from '$lib/components/Sitters.svelte';
  import { resolve } from '$app/paths';
  import { FEED, HOSTS, SAME_AS } from '$lib/links';
  import { SCENE_W } from '$lib/page-fx';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // the planned first dive, shown only until an episode is published
  const LAUNCH = { iso: '2026-09-23', text: 'september 23' };

  // the latest dive's own page — three links point there (title, listen,
  // read), so it's computed once rather than resolved three times
  const latestHref = $derived(
    data.latest ? resolve('/episodes/[slug]', { slug: data.latest.slug }) : '',
  );

  const jsonLdTag = 'script';
  const jsonLd = $derived(
    `<${jsonLdTag} type="application/ld+json">` +
      `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://pyredivers.com/#website",
      "url": "https://pyredivers.com/",
      "name": "pyre divers",
      "description": "two builders, live and unedited. conversations with the ones who jumped before they were ready.",
      "inLanguage": "en"
    },
    {
      "@type": "PodcastSeries",
      "@id": "https://pyredivers.com/#podcast",
      "name": "pyre divers",
      "url": "https://pyredivers.com/",
      "image": ["https://pyredivers.com/podcast-cover.jpg", "https://pyredivers.com/og.jpg"],
      "description": "live, unpolished conversations with the ones who jumped before they were ready. two builders, one fire.",
      "startDate": "${data.startDate ?? LAUNCH.iso}",
      "inLanguage": "en",
      "genre": ["technology", "entrepreneurship", "philosophy"],
      "webFeed": "${FEED}",
      "sameAs": ${JSON.stringify(SAME_AS)},
      "author": ${JSON.stringify(HOSTS)}
    }
  ]
}` +
      `</${jsonLdTag}>`,
  );
</script>

<svelte:head>
  <title>pyre divers</title>
  <meta
    name="description"
    content="two builders, live and unedited. conversations with the ones who jumped before they were ready. new dives every wednesday."
  />
  <link rel="canonical" href="https://pyredivers.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="pyre divers" />
  <meta property="og:title" content="pyre divers" />
  <meta
    property="og:description"
    content="two builders, live and unedited. conversations with the ones who jumped before they were ready. new dives every wednesday."
  />
  <meta property="og:url" content="https://pyredivers.com/" />
  <meta property="og:image" content="https://pyredivers.com/og.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta
    property="og:image:alt"
    content="a whirlpool of tiny hand-drawn stick figures on an ember gradient, with the wordmark: pyre divers"
  />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="pyre divers" />
  <meta
    name="twitter:description"
    content="two builders, live and unedited. new dives every wednesday."
  />
  <meta name="twitter:image" content="https://pyredivers.com/og.jpg" />
  <link
    rel="alternate"
    type="application/rss+xml"
    title="pyre divers"
    href="https://pyredivers.com/feed.xml"
  />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- build-time json-ld; the one interpolation is an iso date -->
  {@html jsonLd}
</svelte:head>

<main>
  <Splash />
  <!-- dive arrival veil: shown only when the document arrived with ?dive
     (threesam.com hand-off — the `diving` class is set pre-paint in
     app.html). At handoff the garden shows only the little guy — no words —
     so arrival is just him on marigold, corner-anchored (one rule, every
     viewport); page-fx choreographs the squat → pop → converge → title.

     THE SKELETON (viewBox units — origins live in .veil-diver rules):
       head (16,7) · spine 16,10.5→20 · shoulder (16,13) · hip (16,20)
       elbows (12.5,15)/(19.5,15) · hands (9,17)/(23,17)
       knees (13.5,23.5)/(18.5,23.5) · feet (11,27)/(21,27)
     Two joints per limb, straight by default, all chained top-down:
     arms shoulder → elbow → hand, legs hip → knee → foot. The torso
     (head + spine + arms) leans about the hip; legs are siblings of the
     torso so a lean doesn't swing them. page-fx drives everything as
     per-joint rotation keyframes on one clock. -->
  <div id="veil" aria-hidden="true">
    <span class="veil-diver"
      ><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"
        ><g
          stroke="#1a1a14"
          stroke-width="2.6"
          stroke-linecap="round"
          fill="none"
          ><g class="torso"
            ><circle cx="16" cy="7" r="3.4" /><path d="M16 10.5 L16 20" /><g
              class="arm arm-l"
              ><path d="M16 13 L12.5 15" /><g class="fore fore-l"
                ><path d="M12.5 15 L9 17" /></g
              ></g
            ><g class="arm arm-r"
              ><path d="M16 13 L19.5 15" /><g class="fore fore-r"
                ><path d="M19.5 15 L23 17" /></g
              ></g
            ></g
          ><g class="thigh thigh-l"
            ><path d="M16 20 L13.5 23.5" /><g class="shin shin-l"
              ><path d="M13.5 23.5 L11 27" /></g
            ></g
          ><g class="thigh thigh-r"
            ><path d="M16 20 L18.5 23.5" /><g class="shin shin-r"
              ><path d="M18.5 23.5 L21 27" /></g
            ></g
          ></g
        ></svg
      ></span
    >
  </div>
  <!-- screen two: every dive. The newest is the big call-out, the rest a
       compact list under it, newest first. -->
  <section id="dives" aria-labelledby="dives-h">
    <h2 id="dives-h" class="dives-h">the dives.</h2>
    {#if data.latest}
      <!-- eslint-disable svelte/no-navigation-without-resolve -- latestHref
         IS a resolve() result (see the script); the rule wants the call
         inline, but three of these share the one resolved base -->
      <article class="featured">
        <p class="kicker">
          latest dive · no. {data.latest.number}{#if data.latest.minutes}
            · {data.latest.minutes} min{/if}
        </p>
        <h3 class="featured-title">
          <a
            href={latestHref}
            data-umami-event="latest-dive"
            data-umami-event-to="episode">{data.latest.title}.</a
          >
        </h3>
        <p class="featured-desc">{data.latest.description}</p>
        <div class="actions">
          <a
            class="act listen"
            href="{latestHref}#listen"
            data-umami-event="latest-dive"
            data-umami-event-to="listen">listen &rarr;</a
          >
          <a
            class="act"
            href="{latestHref}#transcript"
            data-umami-event="latest-dive"
            data-umami-event-to="read">read &rarr;</a
          >
        </div>
      </article>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
      {#if data.dives.length > 1}
        <ol class="earlier" reversed aria-label="earlier dives">
          {#each data.dives.slice(1) as d (d.slug)}
            <li>
              <a
                class="row"
                href={resolve('/episodes/[slug]', { slug: d.slug })}
                data-umami-event="earlier-dive"
                data-umami-event-episode={d.number}
              >
                <span class="row-no">no. {d.number}</span>
                <span class="row-title">{d.title}</span>
                {#if d.minutes}<span class="row-len">{d.minutes} min</span>{/if}
              </a>
            </li>
          {/each}
        </ol>
      {/if}
    {:else}
      <p class="featured-desc">first dive: {LAUNCH.text}.</p>
    {/if}
  </section>
  <!-- --u is the scene unit the canvas lays the fire out in (page-fx SCENE_W):
     a viewport height, or less where the viewport is narrower than the
     scene. This is the pre-script value; page-fx overwrites it with the unit
     it measured. (--b, the flame's mouth, is set in app.css per layout.) -->
  <section id="join" style="--u:min(100svh, {100 / SCENE_W}vw)">
    <canvas id="fire" aria-hidden="true"></canvas>
    <canvas id="rain" aria-hidden="true"></canvas>
    <div class="card">
      <h2 class="fire">
        <span class="fire-ink">come sit by the fire.</span>
      </h2>
      <p>
        we record live. save me a seat and you'll get the link to the next dive.
      </p>
      <form id="join-form" novalidate>
        <div class="fieldwrap">
          <input
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="your@email.com"
            aria-label="email address"
            required
          />
        </div>
        <button class="join" type="submit">save me a seat.</button>
      </form>
    </div>
    <SocialStones />
    <Sitters dives={data.dives} />
  </section>
</main>

<style>
  /* screen two, every dive. app.css sizes each section as one clipped
     screen (the scenes); this one is a list, so it sizes to its content 
     and grows past a screen */
  #dives {
    height: auto;
    overflow: visible;
    max-width: 64rem;
    margin: 0 auto;
    padding: 3.5rem 1.25rem 4rem;
    display: grid;
    align-content: center;
    gap: 1.5rem;
  }
  .dives-h {
    margin: 0;
    font-size: clamp(1.6rem, 5vw, 2.2rem);
    letter-spacing: -0.01em;
    width: fit-content;
  }
  /* the ember gradient, clipped to the text */
  .dives-h,
  .featured-title a {
    background: linear-gradient(100deg, #f5b942 10%, #e25822 50%, #c31e1e 90%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  /* the newest dive: the landing's hand-drawn ember slab, a size up */
  .featured {
    display: grid;
    gap: 0.6rem;
    padding: 1.4rem 1.5rem 1.6rem;
    border: 1.5px solid #e25822;
    border-radius: 60px 8px 50px 8px / 8px 50px 8px 60px;
    background: rgba(16, 18, 10, 0.95);
  }
  .kicker {
    margin: 0;
    font-size: 0.85rem;
    color: #b7ad9d;
  }
  .featured-title {
    margin: 0;
    font-size: clamp(2.2rem, 9vw, 3.6rem);
    line-height: 1.05;
    letter-spacing: -0.01em;
  }
  .featured-title a {
    text-decoration: none;
  }
  .featured-title a:hover {
    text-decoration: underline;
    text-decoration-color: #e25822;
  }
  .featured-title a:focus-visible,
  .act:focus-visible,
  .row:focus-visible {
    outline: 2px solid #f5b942;
    outline-offset: 3px;
  }
  .featured-desc {
    margin: 0;
    max-width: 38rem;
    color: #b7ad9d;
    font-size: 1rem;
    line-height: 1.55;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.4rem;
  }
  /* 44px+ slabs: listen is the ember fill, read the outline */
  .act {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0 1.3rem;
    border: 1.5px solid #e25822;
    border-radius: 200px 14px 180px 14px / 14px 180px 14px 200px;
    color: #f5b942;
    font-size: 1.05rem;
    text-decoration: none;
  }
  .act:hover {
    border-color: #f5b942;
  }
  .listen {
    border-color: transparent;
    background: linear-gradient(100deg, #f5b942, #e25822);
    color: #1c1917;
    font-weight: 700;
  }
  .listen:hover {
    border-color: transparent;
    background: linear-gradient(100deg, #f8c75f, #ea6a35);
  }
  /* the rest: one row each, the whole row the link, so forty dives are
     still a short list */
  .earlier {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid #2c2a1f;
  }
  .row {
    display: grid;
    grid-template-columns: 3.2rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    min-height: 3rem;
    box-sizing: border-box;
    padding: 0.35rem 0.25rem;
    border-bottom: 1px solid #2c2a1f;
    color: inherit;
    text-decoration: none;
  }
  .row:hover .row-title {
    text-decoration: underline;
  }
  .row-no,
  .row-len {
    font-size: 0.8rem;
    color: #b7ad9d;
    font-variant-numeric: tabular-nums;
  }
  .row-title {
    color: #f5b942;
    font-size: 1.1rem;
  }
  /* a full screen on desktop; on a phone the list is the height, so there
     is no dead band between it and the fire */
  @media (min-width: 769px) {
    #dives {
      min-height: 100svh;
      padding: 4.5rem 3.5rem;
    }
  }
</style>
