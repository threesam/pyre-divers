import type { EntryGenerator, PageServerLoad } from './$types';
import { getEpisodeBySlug, listPublishedEpisodes } from '$lib/server/queries';
import { error } from '@sveltejs/kit';

export const prerender = true;

// the prerenderer can't discover episode urls from the landing page —
// enumerate them straight from the db (empty today = no pages built).
export const entries: EntryGenerator = async () =>
  (await listPublishedEpisodes()).map((episode) => ({ slug: episode.slug }));

export const load: PageServerLoad = async ({ params }) => {
  const result = await getEpisodeBySlug(params.slug);
  if (!result) {
    error(404, 'episode not found');
  }
  return result;
};
