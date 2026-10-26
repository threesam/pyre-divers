import assert from 'node:assert/strict';
import { subscribeFlow } from '../src/lib/subscribe.ts';
import { test } from 'node:test';

test('rejects an empty email', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('   ', () => {
    throw new Error('must not fetch');
  });
  assert.equal(res.state, 'invalid');
  assert.equal(res.message, 'needs a real email.');
});

test('rejects an email without an @', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam.sixtom.com', () => {
    throw new Error('must not fetch');
  });
  assert.equal(res.state, 'invalid');
});

test("posts the trimmed email as json to the site's own route", async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const calls = [];
  const fetchFn = (url, opts) => {
    calls.push({ url, opts });
    return Promise.resolve({ ok: true });
  };
  await subscribeFlow('  sam@sixtom.com  ', fetchFn);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/subscribe');
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].opts.mode, undefined);
  assert.deepEqual(JSON.parse(calls[0].opts.body), { email: 'sam@sixtom.com' });
});

test('joined only when the api says ok', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', () =>
    Promise.resolve({ ok: true }),
  );
  assert.equal(res.state, 'joined');
  assert.equal(res.message, 'you’re in. see you at the fire.');
});

test('failed when the api rejects the request', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', () =>
    Promise.resolve({ ok: false, status: 400 }),
  );
  assert.equal(res.state, 'failed');
});

test('failed when the network throws', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', () =>
    Promise.reject(new Error('offline')),
  );
  assert.equal(res.state, 'failed');
});
