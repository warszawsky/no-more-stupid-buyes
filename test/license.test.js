import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// The extension is loaded straight from its folder, so it carries its own
// copy of the license, which must not drift from the real one.
test('extension/LICENSE is identical to LICENSE', () => {
  assert.equal(read('extension/LICENSE'), read('LICENSE'));
});

test('package metadata points at LICENSE, not MIT', () => {
  assert.equal(JSON.parse(read('package.json')).license, 'SEE LICENSE IN LICENSE');
  assert.equal(JSON.parse(read('package-lock.json')).packages[''].license, 'SEE LICENSE IN LICENSE');
});
