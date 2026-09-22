import type { Actions } from './$types';
import { LISTMONK } from '$lib/subscribe';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
  // listmonk's unsubscribe form posts back to its own page; this is that
  // post, made server-side, so the email's link can land on the fire instead.
  // it drops the campaign's lists only, same as listmonk's button. the page
  // itself (GET) never unsubscribes: mail scanners open every link in an email
  default: async ({ params, fetch }) => {
    const res = await fetch(
      `${LISTMONK.url}/subscription/${params.campaign}/${params.subscriber}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: '',
      },
    ).catch(() => null);
    // listmonk 404s an unknown subscriber; null is listmonk down
    return res?.ok ? { done: true } : fail(502, { failed: true });
  },
};
