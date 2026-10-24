import type { EntryGenerator, PageServerLoad } from './$types';
import { getEpisodeBySlug, listPublishedEpisodes } from '$lib/server/queries';
import { error } from '@sveltejs/kit';

export const prerender = true;

// the prerenderer can't discover episode urls from the landing page —
// enumerate them straight from the episode files.
export const entries: EntryGenerator = () =>
  listPublishedEpisodes().map((episode) => ({ slug: episode.slug }));

export const load: PageServerLoad = ({ params }) => {
  const result = getEpisodeBySlug(params.slug);
  if (!result) {
    error(404, 'episode not found');
  }
  return { ...result, number: result.episode.number };
};
