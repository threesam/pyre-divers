// the podcast feed, prerendered at build. ported from solve-for-x
// podcast.xml — episodes without audioUrl are skipped (enclosures are
// mandatory), so the feed stays valid-but-empty until real audio exists.
import { Feed } from 'feed';
import type { RequestHandler } from './$types';
import { listPublishedEpisodes } from '$lib/server/queries';

export const prerender = true;

const SITE = 'https://pyredivers.com';
// apple wants 1400–3000px square, rgb, jpeg or png; og-square is 1200 and
// would be rejected outright. Captured from the live splash at a 1:1 viewport
// — see tools/README for the exact flags, two of which are load-bearing:
//   · 1700px, not 3000. The wordmark is clamp(…, 17rem) but the sim scales
//     off 0.7·hypot(W,H), so past ~1700 the type caps while the vortex keeps
//     growing and the mark shrinks into it. 1700 is inside apple's range.
//   · device-scale-factor 1. The sim caps dpr at 1.75 and gives a body a head
//     at HEAD_PX device px, so supersampling draws MORE heads, thickens the
//     core, and swallows the "e" of "pyre" into the eye.
// jpeg over png: a smooth gradient over thousands of tiny figures is ~6.7MB
// as png and ~1MB as jpeg, at PSNR 40.6dB — no ringing even on the wordmark.
const COVER = `${SITE}/podcast-cover.jpg`;

export const GET: RequestHandler = async () => {
  const published = await listPublishedEpisodes();

  const feed = new Feed({
    title: 'pyre divers',
    description:
      'two builders, live and unedited. conversations with the ones who jumped before they were ready.',
    id: SITE,
    link: SITE,
    language: 'en-us',
    image: COVER,
    favicon: `${SITE}/og-square.jpg`,
    copyright: `pyre divers, ${new Date().getFullYear()}`,
    podcast: true,
    category: 'Technology',
    author: {
      name: "Salvatore D'Angelo",
      // apple mails this address to verify feed ownership at submission, so it
      // has to be one that reads — and one tied to the show, not to sam.
      email: 'sam@pyredivers.com',
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

  // the `feed` package emits <image> and <googleplay:image> but never
  // <itunes:image>, and has no typed option for <itunes:explicit> or
  // <itunes:type> — all three are required or expected by apple and spotify,
  // so inject them rather than fight the extension api. Without itunes:image
  // apple rejects the feed at submission.
  const rss = feed
    .rss2()
    .replace(
      '</channel>',
      [
        `  <itunes:image href="${COVER}"/>`,
        '  <itunes:explicit>false</itunes:explicit>',
        '  <itunes:type>episodic</itunes:type>',
        '</channel>',
      ].join('\n'),
    );

  return new Response(rss, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
