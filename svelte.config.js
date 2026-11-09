import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    // every page's css is ~13-20KB raw: inline it, so first paint doesn't
    // wait on a stylesheet round trip and the wordmark's font is found in the
    // html itself (lighthouse's render-blocking + dependency-chain audits)
    inlineStyleThreshold: 24 * 1024,
    // feed.xml and sitemap.xml aren't linked from any page the prerender
    // crawler follows (<link rel=alternate>, robots.txt) — name them
    prerender: {
      entries: ['*', '/feed.xml', '/sitemap.xml'],
      // /episodes/[slug] legitimately builds zero pages until the podcast
      // db env lands — entries() enumerates from it at build time
      handleUnseenRoutes: 'ignore',
    },
  },
};

export default config;
