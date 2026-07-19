<script lang="ts">
  import { initPageFx } from '$lib/page-fx';

  $effect(() => {
    // detach the sim kickoff from the hydration flush — separate tasks
    // keep each under the long-task line on throttled cpus
    const t = setTimeout(initPageFx, 0);
    return () => clearTimeout(t);
  });

  const jsonLdTag = 'script';
  const jsonLd =
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
      "image": "https://pyredivers.com/og.png",
      "description": "live, unpolished conversations with the ones who jumped before they were ready. two builders, one fire.",
      "startDate": "2026-08-06",
      "inLanguage": "en",
      "genre": ["technology", "entrepreneurship", "philosophy"],
      "author": [
        { "@type": "Person", "name": "Salvatore D'Angelo", "url": "https://threesam.com" },
        { "@type": "Person", "name": "Steve Tullius" }
      ]
    }
  ]
}` +
    `</${jsonLdTag}>`;
</script>

<svelte:head>
  <title>pyre divers</title>
  <meta
    name="description"
    content="two builders, live and unedited. conversations with the ones who jumped before they were ready. first dive: august 2026."
  />
  <link rel="canonical" href="https://pyredivers.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="pyre divers" />
  <meta property="og:title" content="pyre divers" />
  <meta
    property="og:description"
    content="two builders, live and unedited. conversations with the ones who jumped before they were ready. first dive: august 2026."
  />
  <meta property="og:url" content="https://pyredivers.com/" />
  <meta property="og:image" content="https://pyredivers.com/og.png" />
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
    content="two builders, live and unedited. first dive: august 2026."
  />
  <meta name="twitter:image" content="https://pyredivers.com/og.png" />
  <link
    rel="alternate"
    type="application/rss+xml"
    title="pyre divers"
    href="https://pyredivers.com/feed.xml"
  />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- build-time constant json-ld, no user input -->
  {@html jsonLd}
</svelte:head>

<svg
  width="0"
  height="0"
  style="position:absolute"
  aria-hidden="true"
  focusable="false"
>
  <filter id="wobble-a" x="-8%" y="-40%" width="116%" height="180%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.011 0.045"
      numOctaves="2"
      seed="11"
      result="n"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="n"
      scale="5"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
  <filter id="wobble-b" x="-8%" y="-40%" width="116%" height="180%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.014 0.04"
      numOctaves="2"
      seed="4"
      result="n"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="n"
      scale="6"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
  <filter id="wobble-c" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.006 0.02"
      numOctaves="2"
      seed="23"
      result="n"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="n"
      scale="7"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
</svg>
<section id="splash" aria-label="pyre divers — the whirlpool">
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
<!-- dive arrival veil: shown only when the document arrived with ?dive
     (threesam.com hand-off — the `diving` class is set pre-paint in
     app.html). At handoff the garden shows only the little guy — no words —
     so arrival is just him on marigold, corner-anchored (one rule, every
     viewport); page-fx choreographs the squat → pop → converge → title.
     His arms are separate paths so the jump can articulate them: they
     pivot at the shoulder (16,13 in viewBox units — see .veil-diver .arm). -->
<div id="veil" aria-hidden="true">
  <span class="veil-diver"
    ><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"
      ><g
        stroke="#1a1a14"
        stroke-width="2.6"
        stroke-linecap="round"
        fill="none"
        ><circle cx="16" cy="7" r="3.4" /><path
          d="M16 10.5 L16 20 M16 20 L11 27 M16 20 L21 27"
        /><path class="arm arm-l" d="M16 13 L9 17" /><path
          class="arm arm-r"
          d="M16 13 L23 17"
        /></g
      ></svg
    ></span
  >
</div>
<section id="join">
  <canvas id="fire" aria-hidden="true"></canvas>
  <canvas id="rain" aria-hidden="true"></canvas>
  <div class="card">
    <h2 class="fire patch">
      <span class="fire-ink">come sit by the fire.</span>
    </h2>
    <p class="patch">
      two builders, live. no script. no polish. no edits. conversations with the
      ones who jumped before they were ready.
    </p>
    <p class="patch">first dive: august 2026.</p>
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
    <p class="tiny patch">no spam. one email when the fire’s lit.</p>
  </div>
</section>
