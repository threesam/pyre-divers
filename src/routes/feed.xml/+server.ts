// the podcast feed, prerendered at build. ported from solve-for-x
// podcast.xml — episodes without audioUrl are skipped (enclosures are
// mandatory), so the feed stays valid-but-empty until real audio exists.
import { Feed } from 'feed';
import type { RequestHandler } from './$types';
import { listPublishedEpisodes } from '$lib/server/queries';

export const prerender = true;

const SITE = 'https://pyredivers.com';

export const GET: RequestHandler = async () => {
  const published = await listPublishedEpisodes();

  const feed = new Feed({
    title: 'pyre divers',
    description:
      'two builders, live and unedited. conversations with the ones who jumped before they were ready.',
    id: SITE,
    link: SITE,
    // TODO: swap for the real 3000x3000 cover before submitting to
    // apple/spotify — og-square is 1200 and directories want >=1400.
    image: `${SITE}/og-square.png`,
    favicon: `${SITE}/og-square.png`,
    copyright: `pyre divers, ${new Date().getFullYear()}`,
    podcast: true,
    category: 'Technology',
    author: {
      name: "Salvatore D'Angelo",
      email: 'salvatoredangelo@protonmail.com',
    },
  });

  for (const episode of published) {
    if (!episode.audioUrl || !episode.publishedAt) {
      continue;
    }
    feed.addItem({
      title: episode.title,
      id: `${SITE}/episodes/${episode.slug}`,
      link: `${SITE}/episodes/${episode.slug}`,
      description: episode.description,
      date: episode.publishedAt,
      enclosure: {
        url: episode.audioUrl,
        type: 'audio/mpeg',
        duration: episode.durationSeconds ?? undefined,
      },
    });
  }

  // the `feed` package has no typed option for <itunes:explicit>; apple and
  // spotify require it, so inject it rather than fight the extension api.
  const rss = feed
    .rss2()
    .replace(
      '</channel>',
      '  <itunes:explicit>false</itunes:explicit>\n</channel>',
    );

  return new Response(rss, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
