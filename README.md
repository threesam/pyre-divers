# pyre divers

Landing page for the Pyre Divers podcast — live, unpolished conversations with
the trailblazers making asymmetric bets. Two builders, one fire. First dive:
August 27, 2026, live on StreamYard.

SvelteKit (adapter-vercel), no runtime dependencies. The page is a canvas
whirlpool of thousands of tiny hand-drawn stick figures riding a log-spiral
current into a dark drain, over a three-point ember gradient (`src/lib/page-fx.js`
— WebGL draws the core instanced per frame, sized to the device; the Canvas2D
fallback bakes a small center pile; honors `prefers-reduced-motion`). Arriving
from threesam.com with
`?dive` opens on the garden's marigold so the hand-off reads as one scene.

Beyond the page:

- **Signup** — the email form posts to Listmonk's public API (`src/lib/subscribe.ts`,
  contract pinned by `test/subscribe.test.mjs`). Per-brand list; never cross-mailed.
- **/feed.xml** — RSS with iTunes/Google Play namespaces (`src/routes/feed.xml/+server.ts`),
  episodes from Postgres via drizzle (`src/lib/server/`).
- **/episodes/[slug]** — per-episode pages (404 until episodes exist).
- **AEO/SEO** — PodcastSeries + WebSite JSON-LD on the page; `static/llms.txt`,
  `static/robots.txt`, `static/sitemap.xml`, OG art in `static/`.
- **Social kit** — launch assets (StreamYard overlay, banners for YT/FB/IG/X/
  LinkedIn) in `assets/social/` — deliberately NOT under `static/`, since nothing
  serves them and `static/` is uploaded to the CDN on every deploy. Grab them
  from the repo when setting a channel up. The served art (`og.jpg`,
  `og-square.jpg`, `podcast-cover-3000.jpg`) lives in `static/` and is captured
  from the live splash; see the header comment in `src/routes/feed.xml`.

## Commands

npm (not pnpm here): `npm run dev` · `npm run build` / `npm run preview` ·
`npm run check` (sync + lint + svelte-check) · `npm test` (node --test) ·
`npm run format`.

Every commit leaves `npm run check && npm test && npm run build` green.
