import type { PageServerLoad } from './$types';
import { listPublishedEpisodes } from '$lib/server/queries';

// read at prerender. publishing an episode fires the deploy hook, and that
// rebuild is what swaps the pre-launch line on the card for a link to the
// newest dive, and pins the series' json-ld startDate to the first one.
export const load: PageServerLoad = async () => {
  const episodes = await listPublishedEpisodes();
  const first = episodes.at(-1);
  const dives = episodes.map((e) => ({
    slug: e.slug,
    title: e.title,
    number: e.number,
    minutes: Math.round((e.durationSeconds ?? 0) / 60),
  }));
  return {
    latest: dives[0] ?? null,
    dives,
    startDate: first?.publishedAt?.toISOString().slice(0, 10) ?? null,
  };
};
