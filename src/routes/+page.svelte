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
      ><g stroke="#1a1a14" stroke-width="2.6" stroke-linecap="round" fill="none"
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
      two builders, live. no script. no polish. no edits. conversations with the
      ones who jumped before they were ready.
    </p>
    {#if !data.latest}
      <p>first dive: {LAUNCH.text}.</p>
    {/if}
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
  {#if data.latest}
    <!-- the dives: the newest as the call-out, the rest listed under it -->
    <div class="dives">
      <!-- eslint-disable svelte/no-navigation-without-resolve -- latestHref
           IS a resolve() result (see the script); the rule wants the call
           inline, but three of these share the one resolved base -->
      <div class="dive">
        <a
          class="dive-info"
          href={latestHref}
          data-umami-event="latest-dive"
          data-umami-event-to="episode"
        >
          <span class="dive-kicker">latest dive · no. {data.latest.number}</span
          >
          <span class="dive-title">{data.latest.title}.</span>
          <span class="dive-meta">{data.latest.minutes} min</span>
        </a>
        <div class="dive-links">
          <a
            href="{latestHref}#listen"
            data-umami-event="latest-dive"
            data-umami-event-to="listen">listen &rarr;</a
          >
          <a
            href="{latestHref}#transcript"
            data-umami-event="latest-dive"
            data-umami-event-to="read">read &rarr;</a
          >
        </div>
      </div>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
      {#if data.dives.length > 1}
        <ol class="dive-list" reversed>
          {#each data.dives.slice(1) as d (d.slug)}
            <li>
              <a href={resolve('/episodes/[slug]', { slug: d.slug })}
                >{d.title}</a
              >
            </li>
          {/each}
        </ol>
      {/if}
    </div>
  {/if}
  <SocialStones />
  <Sitters dives={data.dives} />
</section>
