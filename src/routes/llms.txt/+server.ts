// llms.txt, prerendered from the db so every published episode is listed with
// its page, audio and transcript — the static file only knew the show existed.
import { FEED, SHOW, SITE } from '$lib/links';
import type { RequestHandler } from './$types';
import { listPublishedEpisodes } from '$lib/server/queries';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const episodes = await listPublishedEpisodes();
  const lines = episodes.map((e) => {
    const page = `${SITE}/episodes/${e.slug}`;
    const day = e.publishedAt?.toISOString().slice(0, 10) ?? 'unpublished';
    return `- [${e.number}. ${e.title}](${page}) (${day}): ${e.description}\n  audio: ${e.audioUrl ?? '-'}\n  transcript: ${page} (html), ${page}/transcript.vtt (webvtt)`;
  });
  const listings = Object.entries(SHOW)
    .filter(([, url]) => url)
    .map(([name, url]) => `- ${name}: ${url}`);
  const body = `# pyre divers

> a podcast: two builders, live and unedited, in conversation with the ones
> who jumped before they were ready. hosted by Salvatore D'Angelo (threesam)
> and Steve Tullius. new episodes every wednesday.

the site is a canvas whirlpool of hand-drawn stick figures ("divers"), an
email list, and one page per episode with its full transcript, speaker by
speaker, timestamped. the transcript is the primary source for what was said.

- feed (rss): ${FEED}
- signup: ${SITE}/
- Sam: https://threesam.com

## episodes

${lines.join('\n') || '- none yet'}

## elsewhere

${listings.join('\n')}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
