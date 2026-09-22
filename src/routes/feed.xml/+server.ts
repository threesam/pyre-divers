// the podcast feed, prerendered at build. ported from solve-for-x
// podcast.xml — episodes without audioUrl are skipped (enclosures are
// mandatory), so the feed stays valid-but-empty until real audio exists.
import { FEED, SITE } from '$lib/links';
import { Feed } from 'feed';
import type { RequestHandler } from './$types';
import { listPublishedEpisodes } from '$lib/server/queries';

export const prerender = true;

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
// as png and ~1MB as jpeg. Then down to 1400px (apple's floor) at q80 4:4:4:
// 440KB, under the 512KB apple caps show art at. Keep 4:4:4 — chroma
// subsampling smears the orange around every dark figure.
const COVER = `${SITE}/podcast-cover.jpg`;

// apple and spotify want the enclosure's exact byte length. the media host is
// the authority on that, so ask it at build rather than store a copy that can
// drift. a failed HEAD fails the build — vercel then keeps serving the last
// good feed instead of publishing an episode whose audio doesn't answer.
async function byteLength(url: string) {
  const res = await fetch(url, { method: 'HEAD' });
  const length = Number(res.headers.get('content-length'));
  if (!res.ok || !length) {
    throw new Error(`enclosure ${url}: HEAD ${res.status}, length ${length}`);
  }
  return length;
}

export const GET: RequestHandler = async () => {
  const published = await listPublishedEpisodes();

  const feed = new Feed({
    title: 'pyre divers',
    description:
      'two builders, live and unedited. conversations with the ones who jumped before they were ready.',
    id: SITE,
    link: SITE,
    // the feed's own address: <atom:link rel="self">, which validators and
    // podcast directories expect
    feed: FEED,
    language: 'en-us',
    image: COVER,
    favicon: `${SITE}/og-square.jpg`,
    copyright: `pyre divers, ${new Date().getFullYear()}`,
    podcast: true,
    category: 'Technology',
    author: {
      // the creator name apple and spotify show under the title — threesam,
      // the same name sam uses on every platform
      name: 'threesam',
      // apple mails this address to verify feed ownership at submission, so it
      // has to be one that reads — and one tied to the show, not to sam.
      email: 'sam@pyredivers.com',
    },
  });

  for (const episode of published) {
    if (!episode.audioUrl || !episode.publishedAt) {
      continue;
    }
    const link = `${SITE}/episodes/${episode.slug}`;
    feed.addItem({
      title: episode.title,
      id: link,
      link,
      description: episode.description,
      date: episode.publishedAt,
      // `audio`, not `enclosure`: the package only writes <itunes:duration>
      // for audio, and would print a plain enclosure with length="0" and a
      // stray duration attribute. the duration must be whole seconds.
      audio: {
        url: episode.audioUrl,
        type: 'audio/mpeg',
        length: await byteLength(episode.audioUrl),
        duration: episode.durationSeconds ?? undefined,
      },
      // the package has no typed option for these; `extensions` renders any
      // element by name (xml-js shape: _text / _attributes)
      extensions: [
        { name: 'itunes:episode', objects: { _text: String(episode.number) } },
        { name: 'itunes:episodeType', objects: { _text: 'full' } },
        // the transcript the apps show in sync (podcasting 2.0 namespace,
        // read by apple, pocket casts, overcast, fountain…)
        {
          name: 'podcast:transcript',
          objects: {
            _attributes: { url: `${link}/transcript.vtt`, type: 'text/vtt' },
          },
        },
      ],
    });
  }

  // the `feed` package emits <image> and <googleplay:image> but never
  // <itunes:image>, and has no typed option for <itunes:explicit> or
  // <itunes:type> — all three are required or expected by apple and spotify,
  // so inject them rather than fight the extension api. Without itunes:image
  // apple rejects the feed at submission.
  const rss = feed
    .rss2()
    // the namespace for <podcast:transcript> above
    .replace(
      '<rss version="2.0"',
      '<rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0"',
    )
    // apple wants an owner name next to the email; the package writes only
    // the email
    .replace(
      '<itunes:owner>',
      '<itunes:owner>\n            <itunes:name>threesam</itunes:name>',
    )
    // apple reads the category from a `text` attribute; the package writes it
    // as element text, which validators report as a missing category
    .replace(
      /<itunes:category>([^<]+)<\/itunes:category>/,
      '<itunes:category text="$1"/>',
    )
    .replace(
      '</channel>',
      [
        `  <itunes:image href="${COVER}"/>`,
        // the show is unfiltered by design (ep 1 has a swear in it) —
        // flagged at the channel so no episode can ship mislabeled
        '  <itunes:explicit>true</itunes:explicit>',
        '  <itunes:type>episodic</itunes:type>',
        '</channel>',
      ].join('\n'),
    );

  return new Response(rss, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
