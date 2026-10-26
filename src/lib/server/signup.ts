// the list's only way in (contract pinned by test/signup.test.mjs). The pyre
// divers list is private in listmonk, so its public signup api refuses it: in
// october 2026 a bot posted 33 addresses straight to that api, none of them
// through the page. This adds an address with listmonk's admin api instead,
// as an api user that can manage subscribers on this one list.
interface Listmonk {
  url: string;
  user: string;
  token: string;
  list: number;
}
interface Reply {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}
type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<Reply>;
interface Found {
  data?: { results?: { id: number; email: string }[] };
}

const EXISTS = 409;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinList(
  email: string,
  lm: Listmonk,
  fetchFn: FetchLike,
): Promise<boolean> {
  const api = (path: string, method: string, body?: object): Promise<Reply> =>
    fetchFn(`${lm.url}/api${path}`, {
      method,
      headers: {
        Authorization: `token ${lm.user}:${lm.token}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

  /* eslint-disable camelcase -- listmonk's wire format */
  const made = await api('/subscribers', 'POST', {
    email,
    name: email.split('@')[0],
    status: 'enabled',
    lists: [lm.list],
    preconfirm_subscriptions: true,
  });
  if (made.status !== EXISTS) {
    return made.ok;
  }
  // already on another of the box's lists: add this one to theirs. A
  // blocklisted address stays unsubscribed, listmonk sees to that
  const found = await api(
    `/subscribers?search=${encodeURIComponent(email)}&per_page=20`,
    'GET',
  );
  if (!found.ok) {
    return false;
  }
  const { data } = (await found.json()) as Found;
  const id = data?.results?.find((s) => s.email.toLowerCase() === email)?.id;
  if (id === undefined) {
    return false;
  }
  const added = await api('/subscribers/lists', 'PUT', {
    ids: [id],
    action: 'add',
    target_list_ids: [lm.list],
    status: 'confirmed',
  });
  /* eslint-enable camelcase */
  return added.ok;
}
