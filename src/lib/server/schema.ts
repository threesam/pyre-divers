// verbatim from solve-for-x src/lib/server/db/schema.ts — the worker on the
// box writes these tables; this site only ever reads them at prerender.
import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const episodes = pgTable(
  'episodes',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    videoUrl: text('video_url'),
    audioUrl: text('audio_url'),
    outroSongUrl: text('outro_song_url'),
    durationSeconds: integer('duration_seconds'),
    spotifyUrl: text('spotify_url'),
    applePodcastsUrl: text('apple_podcasts_url'),
    youtubeUrl: text('youtube_url'),
    published: boolean('published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('episodes_slug_idx').on(table.slug)],
);

export const segments = pgTable('segments', {
  id: serial('id').primaryKey(),
  episodeId: integer('episode_id')
    .notNull()
    .references(() => episodes.id, { onDelete: 'cascade' }),
  start: real('start').notNull(),
  end: real('end').notNull(),
  speaker: text('speaker'),
  text: text('text').notNull(),
});

export type Episode = typeof episodes.$inferSelect;
export type Segment = typeof segments.$inferSelect;
