import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  // the moment that decides which episodes are live (src/lib/server/queries.ts).
  // baked in at compile, not read at runtime: kit's analyse and prerender
  // workers each import the server code, and must agree on what's published
  define: { BUILD_TIME: JSON.stringify(Date.now()) },
});
