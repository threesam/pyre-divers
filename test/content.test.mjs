// the episode files are the site's only data and get hand-edited (a youtubeUrl
// added, a date fixed), so a malformed one should fail here, not at build.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const dir = new URL('../content/episodes/', import.meta.url);

for (const name of readdirSync(dir)) {
  test(`content/episodes/${name}`, () => {
    const ep = JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
    assert.equal(`${ep.slug}.json`, name, 'file is named after its slug');
    for (const key of ['title', 'description', 'audioUrl']) {
      assert.equal(typeof ep[key], 'string', key);
    }
    assert.ok(Number.isInteger(ep.durationSeconds), 'durationSeconds');
    assert.ok(
      ep.publishedAt === null || !Number.isNaN(Date.parse(ep.publishedAt)),
      'publishedAt is a date or null',
    );
    assert.ok(ep.segments.length > 0, 'has a transcript');
    for (const s of ep.segments) {
      assert.ok(
        s.start <= s.end && typeof s.text === 'string',
        JSON.stringify(s),
      );
    }
  });
}
