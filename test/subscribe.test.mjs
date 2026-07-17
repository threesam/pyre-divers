import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// The page is a single self-contained HTML file; tests run against the REAL
// shipped code by extracting the marked subscribeFlow block from index.html.
const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8',
);
const m = html.match(/\/\/ >>> subscribeFlow[\s\S]*?\n([\s\S]*?)\/\/ <<< subscribeFlow/);
// eslint-disable-next-line no-new-func -- evaluating the extracted page code is the point
const subscribeFlow = m ? new Function(`${m[1]}\nreturn subscribeFlow;`)() : null;

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
  const res = await subscribeFlow('sam@sixtom.com', { url: '', list: '' }, () => {
    throw new Error('must not fetch');
  });
  assert.equal(res.state, 'early');
  assert.equal(res.message, 'you’re early. list opens with episode one.');
});

test('posts the trimmed email and list uuid to the listmonk public API', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const calls = [];
  const fetchFn = (url, opts) => {
    calls.push({ url, opts });
    return Promise.resolve({ ok: true });
  };
  await subscribeFlow('  sam@sixtom.com  ', CFG, fetchFn);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://list.example.com/api/public/subscription');
  assert.equal(calls[0].opts.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].opts.body), {
    email: 'sam@sixtom.com',
    // eslint-disable-next-line camelcase -- listmonk's API field name
    list_uuids: ['uuid-123'],
  });
});

test('joined on a 2xx response', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', CFG, () => Promise.resolve({ ok: true }));
  assert.equal(res.state, 'joined');
  assert.equal(res.message, 'you’re in. see you at the fire.');
});

test('failed on a non-2xx response', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', CFG, () =>
    Promise.resolve({ ok: false, status: 500 }),
  );
  assert.equal(res.state, 'failed');
  assert.equal(res.message, 'didn’t take. try again?');
});

test('failed when the network throws', async () => {
  assert.ok(subscribeFlow, 'subscribeFlow not found in index.html');
  const res = await subscribeFlow('sam@sixtom.com', CFG, () =>
    Promise.reject(new Error('offline')),
  );
  assert.equal(res.state, 'failed');
});
