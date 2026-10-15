import type { PageServerLoad } from './$types';
import { listPublishedEpisodes } from '$lib/server/queries';

// every dive, newest first — the homepage shows only the latest and links
// here. prerendered like the rest, so the publish rebuild refreshes it.
export const prerender = true;

export const load: PageServerLoad = async () => {
  const episodes = await listPublishedEpisodes();
  return {
    dives: episodes.map((e) => ({
      slug: e.slug,
      title: e.title,
      number: e.number,
      description: e.description,
      minutes: Math.round((e.durationSeconds ?? 0) / 60),
    })),
  };
};
