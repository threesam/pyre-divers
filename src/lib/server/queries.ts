// build-time reads of the podcast db. no DATABASE_URL = the site prerenders
// with zero episodes and a valid empty feed; publishing an episode flips its
// row and fires the deploy hook, and the rebuild picks it up.
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

// PREVIEW_DRAFTS=1 builds unpublished rows too, so an episode page and its
// feed item can be read locally before the row flips. never set on vercel —
// there, only published rows exist as far as the site is concerned.
const preview = () => env.PREVIEW_DRAFTS === '1';

// newest first. `number` counts from the oldest — the feed's <itunes:episode>
// and the page's json-ld episodeNumber both read it here, so they agree.
export async function listPublishedEpisodes() {
  const db = getDb();
  if (!db) {
    return [];
  }
  const rows = await db
    .select()
    .from(episodes)
    .where(preview() ? undefined : eq(episodes.published, true))
    .orderBy(desc(episodes.publishedAt));
  return rows.map((row, i) => ({ ...row, number: rows.length - i }));
}

export async function getEpisodeBySlug(slug: string) {
  const db = getDb();
  const episode = (await listPublishedEpisodes()).find((e) => e.slug === slug);
  if (!db || !episode) {
    return null;
  }
  const episodeSegments = await db
    .select()
    .from(segments)
    .where(eq(segments.episodeId, episode.id))
    .orderBy(asc(segments.start));
  return { episode, segments: episodeSegments };
}
