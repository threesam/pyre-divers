// build-time reads of the podcast db. no DATABASE_URL (today) = the site
// prerenders with zero episodes and a valid empty feed; when the worker's
// deploy hook fires a rebuild with the env set, episodes appear.
import { asc, desc, eq } from 'drizzle-orm';
import { episodes, segments } from './schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '$env/dynamic/private';
import postgres from 'postgres';

let client: ReturnType<typeof drizzle> | null | undefined;

function getDb() {
  if (client === undefined) {
    client = env.DATABASE_URL
      ? drizzle(postgres(env.DATABASE_URL, { max: 1, prepare: false }))
      : null;
  }
  return client;
}

export function listPublishedEpisodes() {
  const db = getDb();
  if (!db) {
    return Promise.resolve([]);
  }
  return db
    .select()
    .from(episodes)
    .where(eq(episodes.published, true))
    .orderBy(desc(episodes.publishedAt));
}

export async function getEpisodeBySlug(slug: string) {
  const db = getDb();
  if (!db) {
    return null;
  }
  const [episode] = await db
    .select()
    .from(episodes)
    .where(eq(episodes.slug, slug))
    .limit(1);
  if (!episode || !episode.published) {
    return null;
  }
  const episodeSegments = await db
    .select()
    .from(segments)
    .where(eq(segments.episodeId, episode.id))
    .orderBy(asc(segments.start));
  return { episode, segments: episodeSegments };
}
