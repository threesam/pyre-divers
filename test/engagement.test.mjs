import assert from 'node:assert/strict';
import { crossed } from '../src/lib/engagement.js';
import { test } from 'node:test';

const MARKS = [25, 50, 75, 100];

test('gives nothing while no mark is reached', () => {
  assert.deepEqual(crossed(MARKS, 0, 24), []);
});

test('gives a mark the moment it is reached', () => {
  assert.deepEqual(crossed(MARKS, 24, 25), [25]);
});

test('gives every mark a jump passes, in order', () => {
  assert.deepEqual(crossed(MARKS, 10, 80), [25, 50, 75]);
});

test('never gives a mark twice', () => {
  assert.deepEqual(crossed(MARKS, 25, 49), []);
});

test('gives nothing on the way back up', () => {
  assert.deepEqual(crossed(MARKS, 80, 10), []);
});
