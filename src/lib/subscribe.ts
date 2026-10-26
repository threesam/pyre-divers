// the list (listmonk) — contract pinned by test/subscribe.test.mjs
type SubscribeState = 'invalid' | 'joined' | 'failed';
interface SubscribeResult {
  state: SubscribeState;
  message: string;
}
type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean }>;
export const LISTMONK = { url: 'https://mail.sixtom.com' };
// a signup from either form hides the episode page's bar in this browser,
// and unsubscribing brings it back. Storage can throw (some private modes);
// then the bar just shows again.
const JOINED_KEY = 'pyre:joined';
export function rememberJoined(): void {
  try {
    localStorage.setItem(JOINED_KEY, '1');
  } catch {
    // no storage: nothing to remember it in
  }
}
export function forgetJoined(): void {
  try {
    localStorage.removeItem(JOINED_KEY);
  } catch {
    // no storage: nothing to forget
  }
}
export function hasJoined(): boolean {
  try {
    return localStorage.getItem(JOINED_KEY) === '1';
  } catch {
    return false;
  }
}
export async function subscribeFlow(
  email: string | null | undefined,
  fetchFn: FetchLike,
): Promise<SubscribeResult> {
  const addr = (email || '').trim();
  if (!addr || !addr.includes('@')) {
    return { state: 'invalid', message: 'needs a real email.' };
  }
  try {
    // the site's own route adds it (src/routes/subscribe): the list takes no
    // signups from listmonk's public api, where a bot had been filling it
    const res = await fetchFn('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addr }),
    });
    if (!res.ok) {
      return { state: 'failed', message: 'didn\u2019t take. try again?' };
    }
    return { state: 'joined', message: 'you\u2019re in. see you at the fire.' };
  } catch {
    return { state: 'failed', message: 'didn\u2019t take. try again?' };
  }
}
