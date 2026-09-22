import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { LISTMONK } from '$lib/subscribe';

// listmonk's own ids; anything else is a mangled link
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;
const valid = (p: { campaign: string; subscriber: string }) =>
  UUID.test(p.campaign) && UUID.test(p.subscriber);

export const load: PageServerLoad = ({ params }) => {
  if (!valid(params)) {
    error(404);
  }
};

export const actions: Actions = {
  // listmonk's unsubscribe form posts back to its own page; this is that
  // post, made server-side, so the email's link can land on the fire instead.
  // it drops the campaign's lists only, same as listmonk's button. the GET
  // above never unsubscribes: mail scanners open every link in an email
  default: async ({ params, fetch }) => {
    if (!valid(params)) {
      error(404);
    }
    const res = await fetch(
      `${LISTMONK.url}/subscription/${params.campaign}/${params.subscriber}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: '',
      },
    ).catch(() => null);
    // listmonk 404s an unknown campaign or subscriber; null is listmonk down
    return res?.ok ? { done: true } : fail(502, { failed: true });
  },
};
