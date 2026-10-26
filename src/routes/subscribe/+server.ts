import { EMAIL, joinList } from '$lib/server/signup';
import { LISTMONK } from '$lib/subscribe';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

// both signup forms post here; the rest of the site is static
export const prerender = false;

const LIST_ID = 8; // pyre divers
const MAX_EMAIL = 254;

export const POST: RequestHandler = async ({ request, url, fetch }) => {
  // the forms post from this site. A script posting from anywhere else is
  // turned away. ponytail: an origin header is easy to fake; if a bot starts
  // posting here (umami's seat-joined count falls behind the list's growth),
  // put a proof-of-work check in front, such as altcha
  if (request.headers.get('origin') !== url.origin) {
    return json({ ok: false }, { status: 403 });
  }
  const sent = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email =
    typeof sent.email === 'string' ? sent.email.trim().toLowerCase() : '';
  if (email.length > MAX_EMAIL || !EMAIL.test(email)) {
    return json({ ok: false }, { status: 400 });
  }
  const ok = await joinList(
    email,
    {
      url: LISTMONK.url,
      user: 'pyre-signup',
      token: env.LISTMONK_SIGNUP_TOKEN ?? '',
      list: LIST_ID,
    },
    fetch,
  ).catch(() => false);
  return json({ ok }, { status: ok ? 200 : 502 });
};
