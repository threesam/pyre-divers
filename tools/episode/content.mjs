// The episode + its transcript as one committed file, content/episodes/<slug>.json
// — the only thing the site reads. Run from the repo root:
//
//   node tools/episode/content.mjs draft assets/epN/publish/episode.json
//   node tools/episode/content.mjs publish <slug>
//
// draft: writes the file from the manifest. `publishedAt` is the manifest's
//   `publishAt`; a build after that moment shows the episode, one before it
//   doesn't. re-running it on a live episode only edits text/urls: a live
//   episode's date never moves (it's the feed's pubDate).
// publish: publishedAt = now, for going live off-schedule.
// either way nothing changes on the site until a build runs: merge the commit
// (master deploys itself), and a scheduled episode goes out with the box's
// daily 11:01 UTC rebuild.
import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// a cli talks through stdout — this, rather than a no-console waiver
const say = (line) => process.stdout.write(`${line}\n`);
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const fileFor = (slug) => `content/episodes/${slug}.json`;
const write = (path, ep) => {
  writeFileSync(path, `${JSON.stringify(ep, null, 2)}\n`);
  say(
    `${path}: ${ep.segments.length} transcript paragraphs, publishedAt ${ep.publishedAt ?? '-'}`,
  );
};
// times to the millisecond: the transcript json carries float noise (9.110000000000003)
const ms = (t) => Math.round(t * 1000) / 1000;
const isLive = (ep) =>
  ep.publishedAt !== null && Date.parse(ep.publishedAt) <= Date.now();

const [cmd, arg] = process.argv.slice(2);
if (!arg) {
  throw new Error('usage: content.mjs draft <episode.json> | publish <slug>');
}

if (cmd === 'draft') {
  const ep = read(arg);
  const path = fileFor(ep.slug);
  const prev = existsSync(path) ? read(path) : null;
  const paras = read(resolve(dirname(arg), ep.transcript ?? 'transcript.json'));
  write(path, {
    slug: ep.slug,
    title: ep.title,
    description: ep.description,
    audioUrl: ep.audioUrl,
    durationSeconds: ep.durationSeconds,
    youtubeUrl: ep.youtubeUrl ?? null,
    spotifyUrl: ep.spotifyUrl ?? null,
    applePodcastsUrl: ep.applePodcastsUrl ?? null,
    publishedAt:
      prev && isLive(prev) ? prev.publishedAt : (ep.publishAt ?? null),
    segments: paras.map(({ start, end, speaker, text }) => ({
      start: ms(start),
      end: ms(end),
      speaker,
      text,
    })),
  });
} else if (cmd === 'publish') {
  const path = fileFor(arg);
  write(path, { ...read(path), publishedAt: new Date().toISOString() });
} else {
  throw new Error(`unknown command ${cmd}`);
}
