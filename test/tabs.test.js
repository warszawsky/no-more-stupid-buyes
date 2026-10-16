import test from 'node:test';
import assert from 'node:assert/strict';
import { tabCloseTarget } from '../src/main/tabs.js';

const maxed = { x: 0, y: 0, width: 1920, height: 1040 };

test('first of a few tabs: close button near the left of the strip', () => {
  const t = tabCloseTarget({ bounds: maxed, index: 0, count: 3, maximized: true, platform: 'win32' });
  assert.deepEqual(t, { x: 44 + 240 - 18, y: 16 });
});

test('tabs shrink when there are many, and the index moves the target right', () => {
  const a = tabCloseTarget({ bounds: maxed, index: 0, count: 30, platform: 'win32' });
  const b = tabCloseTarget({ bounds: maxed, index: 29, count: 30, platform: 'win32' });
  assert.ok(b.x > a.x);
  assert.ok(b.x < maxed.width - 150, 'last tab stays left of the window controls');
});

test('follows the window and clamps silly input', () => {
  const t = tabCloseTarget({ bounds: { x: 500, y: 200, width: 900, height: 700 }, index: 99, count: 2, platform: 'win32' });
  assert.ok(t.x > 500 && t.x < 1400);
  assert.equal(t.y, 224);
  assert.equal(tabCloseTarget({ bounds: null }), null);
  assert.equal(tabCloseTarget({ bounds: { x: 0, y: 0, width: 0, height: 0 } }), null);
});
