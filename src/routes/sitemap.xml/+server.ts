// prerendered from the db like feed.xml, so each episode page — the one with
// the crawlable transcript — is listed by the same build that publishes it.
import type { RequestHandler } from './$types';
import { SITE } from '$lib/links';
import { listPublishedEpisodes } from '$lib/server/queries';

export const prerender = true;

const day = (date: Date | null) =>
  date ? `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>` : '';

export const GET: RequestHandler = async () => {
  const episodes = await listPublishedEpisodes();
  const urls = [
    `  <url><loc>${SITE}/</loc>${day(episodes[0]?.publishedAt ?? null)}</url>`,
    // slugs are [a-z0-9-] by construction, nothing to escape
    ...episodes.map(
      (e) =>
        `  <url><loc>${SITE}/episodes/${e.slug}</loc>${day(e.publishedAt)}</url>`,
    ),
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
