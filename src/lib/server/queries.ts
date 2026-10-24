// build-time reads of the episodes, one committed file each
// (content/episodes/<slug>.json, written by tools/episode/content.mjs). an
// episode is live once its publishedAt has passed when the site builds, so a
// scheduled one goes out with the first build after its time: the box fires the
// deploy hook daily at 11:01 UTC, right after the usual Wednesday slot.
import { env } from '$env/dynamic/private';

interface Segment {
  start: number;
  end: number;
  speaker: string | null;
  text: string;
}

interface EpisodeFile {
  slug: string;
  title: string;
  description: string;
  audioUrl: string | null;
  durationSeconds: number | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  applePodcastsUrl: string | null;
  // ponytail: no episode has one yet; the page shows a player when it does
  videoUrl?: string | null;
  publishedAt: string | null;
  segments: Segment[];
}

const files = Object.values(
  import.meta.glob<EpisodeFile>('/content/episodes/*.json', {
    eager: true,
    import: 'default',
  }),
);

// PREVIEW_DRAFTS=1 builds unscheduled and future episodes too, so a page and
// its feed item can be read locally before they go out. never set on vercel.
const preview = () => env.PREVIEW_DRAFTS === '1';

// newest first, undated drafts on top. `number` counts from the oldest — the
// feed's <itunes:episode> and the page's json-ld episodeNumber both read it
// here, so they agree. "live" is judged at BUILD_TIME, one moment for the
// whole build, so a build running across an episode's minute can't list it in
// the feed but skip its page. built once, on first use (env is read then).
let published: ReturnType<typeof publish> | undefined;
export const listPublishedEpisodes = () => (published ??= publish());

function publish() {
  const rows = files
    // every field but the transcript, which only the episode page loads
    .map((file) => ({
      slug: file.slug,
      title: file.title,
      description: file.description,
      audioUrl: file.audioUrl,
      durationSeconds: file.durationSeconds,
      youtubeUrl: file.youtubeUrl,
      spotifyUrl: file.spotifyUrl,
      applePodcastsUrl: file.applePodcastsUrl,
      videoUrl: file.videoUrl ?? null,
      publishedAt:
        file.publishedAt === null ? null : new Date(file.publishedAt),
    }))
    .filter(
      (e) =>
        preview() ||
        (e.publishedAt !== null && e.publishedAt.getTime() <= BUILD_TIME),
    )
    .sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? Infinity) -
        (a.publishedAt?.getTime() ?? Infinity),
    );
  return rows.map((row, i) => ({ ...row, number: rows.length - i }));
}

export function getEpisodeBySlug(slug: string) {
  const episode = listPublishedEpisodes().find((e) => e.slug === slug);
  const file = files.find((f) => f.slug === slug);
  if (!episode || !file) {
    return null;
  }
  const segments = file.segments
    .map((s, id) => ({ ...s, id }))
    .sort((a, b) => a.start - b.start);
  return { episode, segments };
}
