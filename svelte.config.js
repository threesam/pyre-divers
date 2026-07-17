import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    // feed.xml is linked only via <link rel=alternate>, which the
    // prerender crawler doesn't follow — name it explicitly
    prerender: {
      entries: ['*', '/feed.xml'],
      // /episodes/[slug] legitimately builds zero pages until the podcast
      // db env lands — entries() enumerates from it at build time
      handleUnseenRoutes: 'ignore',
    },
  },
};

export default config;
