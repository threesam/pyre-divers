import adapter from '@sveltejs/adapter-vercel';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      // feed.xml and sitemap.xml aren't linked from any page the prerender
      // crawler follows (<link rel=alternate>, robots.txt) — name them
      prerender: {
        entries: ['*', '/feed.xml', '/sitemap.xml'],
        // /episodes/[slug] legitimately builds zero pages until the podcast
        // db env lands — entries() enumerates from it at build time
        handleUnseenRoutes: 'ignore',
      },
    }),
  ],
});
