# pyre divers

Landing page for the Pyre Divers podcast — live, unpolished conversations with
the trailblazers making asymmetric bets. Two builders, one fire. First dive:
August 6, 2026, live on StreamYard.

SvelteKit (adapter-vercel), no runtime dependencies. The page is a canvas
whirlpool of thousands of tiny hand-drawn stick figures riding a log-spiral
current into a dark drain, over a three-point ember gradient (`src/lib/page-fx.js`
— the outer field animates; the ~8k bodies at the center are baked once into a
static layer; honors `prefers-reduced-motion`). Arriving from threesam.com with
`?dive` opens on the garden's marigold so the hand-off reads as one scene.

Beyond the page:

- **Signup** — the email form posts to Listmonk's public API (`src/lib/subscribe.ts`,
  contract pinned by `test/subscribe.test.mjs`). Per-brand list; never cross-mailed.
- **/feed.xml** — RSS with iTunes/Google Play namespaces (`src/routes/feed.xml/+server.ts`),
  episodes from Postgres via drizzle (`src/lib/server/`).
- **/episodes/[slug]** — per-episode pages (404 until episodes exist).
- **AEO/SEO** — PodcastSeries + WebSite JSON-LD on the page; `static/llms.txt`,
  `static/robots.txt`, `static/sitemap.xml`, OG art in `static/`.
- **Social kit** — every launch asset (podcast cover 3000×3000, StreamYard overlay,
  banners for YT/FB/IG/X/LinkedIn) in `static/assets/social/`.

## Commands

npm (not pnpm here): `npm run dev` · `npm run build` / `npm run preview` ·
`npm run check` (sync + lint + svelte-check) · `npm test` (node --test) ·
`npm run format`.

Every commit leaves `npm run check && npm test && npm run build` green.
