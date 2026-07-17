import assert from 'node:assert/strict';
import { subscribeFlow } from '../src/lib/subscribe.ts';
import { test } from 'node:test';

const CFG = { url: 'https://list.example.com', list: 'uuid-123' };

test('rejects an empty email', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('   ', CFG, () => {
    throw new Error('must not fetch');
  });
  assert.equal(res.state, 'invalid');
  assert.equal(res.message, 'needs a real email.');
});

test('rejects an email without an @', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam.sixtom.com', CFG, () => {
    throw new Error('must not fetch');
  });
  assert.equal(res.state, 'invalid');
});

test('reports early when no listmonk is configured', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow(
    'sam@sixtom.com',
    { url: '', list: '' },
    () => {
      throw new Error('must not fetch');
    },
  );
  assert.equal(res.state, 'early');
  assert.equal(res.message, 'you’re early. list opens with episode one.');
});

test('posts the trimmed email and list uuid as json to the public api', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const calls = [];
  const fetchFn = (url, opts) => {
    calls.push({ url, opts });
    return Promise.resolve({ ok: true });
  };
  await subscribeFlow('  sam@sixtom.com  ', CFG, fetchFn);
  assert.equal(calls.length, 1);
  // listmonk's public json api: caddy answers the preflight, response is readable
  assert.equal(
    calls[0].url,
    'https://list.example.com/api/public/subscription',
  );
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].opts.mode, undefined);
  assert.deepEqual(JSON.parse(calls[0].opts.body), {
    email: 'sam@sixtom.com',
    // eslint-disable-next-line camelcase -- listmonk's wire format
    list_uuids: ['uuid-123'],
  });
});

test('joined only when the api says ok', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', CFG, () =>
    Promise.resolve({ ok: true }),
  );
  assert.equal(res.state, 'joined');
  assert.equal(res.message, 'you’re in. see you at the fire.');
});

test('failed when the api rejects the request', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', CFG, () =>
    Promise.resolve({ ok: false, status: 400 }),
  );
  assert.equal(res.state, 'failed');
});

test('failed when the network throws', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', CFG, () =>
    Promise.reject(new Error('offline')),
  );
  assert.equal(res.state, 'failed');
});
