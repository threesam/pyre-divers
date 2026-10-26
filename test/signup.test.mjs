import assert from 'node:assert/strict';
import { joinList } from '../src/lib/server/signup.ts';
import { test } from 'node:test';

const LM = {
  url: 'https://list.example.com',
  user: 'pyre-signup',
  token: 't0k',
  list: 8,
};
const reply = (status, body = {}) =>
  Promise.resolve({
    ok: status < 300,
    status,
    json: () => Promise.resolve(body),
  });

test('adds a new address to the list with the admin api', async () => {
  const calls = [];
  const ok = await joinList('sam@sixtom.com', LM, (url, init) => {
    calls.push({ url, init });
    return reply(200);
  });
  assert.equal(ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://list.example.com/api/subscribers');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'token pyre-signup:t0k');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.email, 'sam@sixtom.com');
  assert.deepEqual(body.lists, [8]);
});

test('an address already on another list gets this one added', async () => {
  const calls = [];
  const replies = [
    reply(409),
    reply(200, {
      data: {
        results: [
          { id: 41, email: 'other@x.com' },
          { id: 7, email: 'sam@sixtom.com' },
        ],
      },
    }),
    reply(200),
  ];
  const ok = await joinList('sam@sixtom.com', LM, (url, init) => {
    calls.push({ url, init });
    return replies.shift();
  });
  assert.equal(ok, true);
  assert.equal(
    calls[1].url,
    'https://list.example.com/api/subscribers?search=sam%40sixtom.com&per_page=20',
  );
  assert.equal(calls[2].url, 'https://list.example.com/api/subscribers/lists');
  assert.equal(calls[2].init.method, 'PUT');
  const body = JSON.parse(calls[2].init.body);
  assert.deepEqual(body.ids, [7]);
  assert.deepEqual(body.target_list_ids, [8]);
  assert.equal(body.action, 'add');
});

test('not ok when listmonk refuses', async () => {
  assert.equal(await joinList('sam@sixtom.com', LM, () => reply(403)), false);
});

test('not ok when the existing address cannot be found', async () => {
  const replies = [reply(409), reply(200, { data: { results: [] } })];
  assert.equal(
    await joinList('sam@sixtom.com', LM, () => replies.shift()),
    false,
  );
});
