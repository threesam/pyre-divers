// the transcript as WebVTT, one cue per paragraph with the speaker as a voice
// tag. the feed points podcast apps at it (<podcast:transcript>), so apple,
// pocket casts and the rest can show the words in sync without generating
// their own. prerendered from the same rows as the page.
import type { EntryGenerator, RequestHandler } from './$types';
import { getEpisodeBySlug, listPublishedEpisodes } from '$lib/server/queries';
import { error } from '@sveltejs/kit';

export const prerender = true;

export const entries: EntryGenerator = async () =>
  (await listPublishedEpisodes()).map((episode) => ({ slug: episode.slug }));

const two = (n: number) => String(n).padStart(2, '0');
const stamp = (seconds: number) => {
  const ms = Math.round(seconds * 1000);
  const s = Math.floor(ms / 1000);
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}.${String(ms % 1000).padStart(3, '0')}`;
};
// cue text is markup: a bare `<` or `&` would start a tag or an entity
const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const GET: RequestHandler = async ({ params }) => {
  const result = await getEpisodeBySlug(params.slug);
  if (!result) {
    error(404, 'episode not found');
  }
  const cues = result.segments.map(
    (seg) =>
      `${stamp(seg.start)} --> ${stamp(seg.end)}\n${seg.speaker ? `<v ${seg.speaker}>` : ''}${escape(seg.text)}`,
  );
  return new Response(`WEBVTT\n\n${cues.join('\n\n')}\n`, {
    headers: { 'Content-Type': 'text/vtt; charset=utf-8' },
  });
};
