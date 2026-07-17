// the list (listmonk) — contract pinned by test/subscribe.test.mjs
export interface ListmonkConfig {
  url: string;
  list: string;
}
export type SubscribeState = 'invalid' | 'early' | 'joined' | 'failed';
export interface SubscribeResult {
  state: SubscribeState;
  message: string;
}
type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean }>;
export const LISTMONK: ListmonkConfig = {
  url: 'https://mail.sixtom.com',
  list: '5f4d8764-8e70-4e56-a7f2-4ac00157921d',
};
export async function subscribeFlow(
  email: string | null | undefined,
  cfg: ListmonkConfig | null,
  fetchFn: FetchLike,
): Promise<SubscribeResult> {
  const addr = (email || '').trim();
  if (!addr || !addr.includes('@')) {
    return { state: 'invalid', message: 'needs a real email.' };
  }
  if (!cfg || !cfg.url) {
    return {
      state: 'early',
      message: 'you\u2019re early. list opens with episode one.',
    };
  }
  try {
    // listmonk's public json api — caddy answers the preflight and scopes
    // allow-origin to this site, so the response is readable: real states
    const res = await fetchFn(`${cfg.url}/api/public/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // eslint-disable-next-line camelcase -- listmonk's wire format
      body: JSON.stringify({ email: addr, list_uuids: [cfg.list] }),
    });
    if (!res.ok) {
      return { state: 'failed', message: 'didn\u2019t take. try again?' };
    }
    return { state: 'joined', message: 'you\u2019re in. see you at the fire.' };
  } catch {
    return { state: 'failed', message: 'didn\u2019t take. try again?' };
  }
}
