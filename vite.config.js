import adapter from '@sveltejs/adapter-vercel';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      // every page's css is ~13-20KB raw: inline it, so first paint doesn't
      // wait on a stylesheet round trip and the wordmark's font is found in the
      // html itself (lighthouse's render-blocking + dependency-chain audits)
      inlineStyleThreshold: 24 * 1024,
      // feed.xml and sitemap.xml aren't linked from any page the prerender
      // crawler follows (<link rel=alternate>, robots.txt) — name them
      prerender: {
        entries: ['*', '/feed.xml', '/sitemap.xml'],
        // /episodes/[slug] builds zero pages while no episode is live yet —
        // entries() enumerates the published files at build time
        handleUnseenRoutes: 'ignore',
      },
    }),
  ],
  // the moment that decides which episodes are live (src/lib/server/queries.ts).
  // baked in at compile, not read at runtime: kit's analyse and prerender
  // workers each import the server code, and must agree on what's published
  define: { BUILD_TIME: JSON.stringify(Date.now()) },
});
