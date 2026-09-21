// The episode row + transcript in the podcast db (Neon) — the only thing the
// site reads. Run from the repo root with the prod DATABASE_URL:
//
//   vercel env pull .env.local --environment=production   (once; gitignored)
//   node --env-file=.env.local tools/episode/db.mjs draft assets/epN/publish/episode.json
//   node --env-file=.env.local tools/episode/db.mjs publish <slug>
//   node --env-file=.env.local tools/episode/db.mjs unpublish <slug>
//
// draft: upserts the row from the manifest and replaces its transcript, in one
//   transaction. never flips `published`, so re-running it on a live episode
//   only edits text/urls (the next deploy picks that up).
// publish: published = true, published_at = now. then fire the deploy hook —
//   nothing on the site changes until a build runs. if PYRE_DEPLOY_HOOK is in
//   the env it is fired here; otherwise see docs/episode-runbook.md.
import { dirname, resolve } from 'node:path';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

// a cli talks through stdout — this, rather than a no-console waiver
const say = (line) => process.stdout.write(`${line}\n`);

const [cmd, arg] = process.argv.slice(2);
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}
if (!arg) {
  throw new Error(
    'usage: db.mjs draft <episode.json> | publish <slug> | unpublish <slug>',
  );
}

// camel both ways: rows go in as episodeId, come back as publishedAt
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  transform: postgres.camel,
});
try {
  if (cmd === 'draft') {
    const ep = JSON.parse(readFileSync(arg, 'utf8'));
    const paras = JSON.parse(
      readFileSync(
        resolve(dirname(arg), ep.transcript ?? 'transcript.json'),
        'utf8',
      ),
    );
    await sql.begin(async (tx) => {
      const [row] = await tx`
        insert into episodes (slug, title, description, audio_url, duration_seconds,
                              youtube_url, spotify_url, apple_podcasts_url, published, published_at)
        values (${ep.slug}, ${ep.title}, ${ep.description}, ${ep.audioUrl}, ${ep.durationSeconds},
                ${ep.youtubeUrl ?? null}, ${ep.spotifyUrl ?? null}, ${ep.applePodcastsUrl ?? null},
                false, ${ep.publishAt ?? null})
        on conflict (slug) do update set
          title = excluded.title, description = excluded.description,
          audio_url = excluded.audio_url, duration_seconds = excluded.duration_seconds,
          youtube_url = excluded.youtube_url, spotify_url = excluded.spotify_url,
          apple_podcasts_url = excluded.apple_podcasts_url,
          -- a draft's planned date may move; a live episode's date may not
          published_at = case when episodes.published then episodes.published_at
                              else excluded.published_at end
        returning id, published, published_at`;
      await tx`delete from segments where episode_id = ${row.id}`;
      const rows = paras.map((p) => ({
        episodeId: row.id,
        start: p.start,
        end: p.end,
        speaker: p.speaker,
        text: p.text,
      }));
      await tx`insert into segments ${tx(rows, 'episodeId', 'start', 'end', 'speaker', 'text')}`;
      say(
        `#${row.id} ${ep.slug}: ${rows.length} transcript paragraphs, ${row.published ? 'LIVE' : 'draft'}, published_at ${row.publishedAt?.toISOString() ?? '-'}`,
      );
    });
  } else if (cmd === 'publish' || cmd === 'unpublish') {
    const on = cmd === 'publish';
    const [row] = await sql`
      update episodes set published = ${on},
        published_at = case when ${on} then now() else published_at end
      where slug = ${arg} returning id, published, published_at`;
    if (!row) {
      throw new Error(`no episode with slug ${arg}`);
    }
    say(
      `#${row.id} ${arg}: ${row.published ? 'LIVE' : 'unpublished'} (published_at ${row.publishedAt?.toISOString()})`,
    );
    if (process.env.PYRE_DEPLOY_HOOK) {
      const res = await fetch(process.env.PYRE_DEPLOY_HOOK, { method: 'POST' });
      say(`deploy hook: ${res.status}`);
    } else {
      say(
        'now fire the deploy hook — the site does not change until a build runs',
      );
    }
  } else {
    throw new Error(`unknown command ${cmd}`);
  }
} finally {
  await sql.end();
}
