import test from 'node:test';
import assert from 'node:assert/strict';
import { Watcher } from '../src/main/watcher.js';
import { compile } from '../src/main/matcher.js';
import { DEFAULT_STORES, DEFAULT_IGNORE_TITLES } from '../src/main/stores.js';
import { punish } from '../src/main/punish.js';

const compiled = compile(DEFAULT_STORES, DEFAULT_IGNORE_TITLES);
const chrome = { name: 'Google Chrome', path: 'C:\\chrome.exe' };
const shop = { title: 'Amazon.com: Gorilla couch - Google Chrome', owner: chrome, bounds: { x: 0, y: 0, width: 800, height: 600 } };
const news = { title: 'News - Google Chrome', owner: chrome };

function setup(bridge = null) {
  let win = news;
  const events = [];
  const w = new Watcher({ getWindow: async () => win, getCompiled: () => compiled, bridge });
  w.on('change', s => events.push(s));
  return { w, events, show: next => { win = next; } };
}

test('needs two shop polls in a row to start and two misses to end', async () => {
  const { w, events, show } = setup();
  show(shop);
  await w.tick();
  assert.equal(events.length, 0);
  await w.tick();
  assert.equal(events.length, 1);
  assert.equal(events[0].active, true);
  assert.equal(events[0].store, 'Amazon');
  assert.equal(events[0].source.kind, 'window');

  show(news);
  await w.tick();
  assert.equal(events.length, 1, 'one miss is a flicker, not leaving');
  await w.tick();
  assert.equal(events.length, 2);
  assert.equal(events[1].active, false);
});

test('a non-browser window with a shop-like title is ignored', async () => {
  const { w, events, show } = setup();
  show({ title: 'Amazon.com invoice.pdf - Adobe Acrobat', owner: { name: 'Acrobat', path: 'C:\\Acrobat.exe' } });
  await w.tick(); await w.tick(); await w.tick();
  assert.equal(events.length, 0);
});

test('snooze ends an active session and suppresses detection', async () => {
  const { w, events, show } = setup();
  show(shop);
  await w.tick(); await w.tick();
  w.snooze(60_000);
  assert.equal(events.at(-1).active, false);
  await w.tick(); await w.tick(); await w.tick();
  assert.equal(events.length, 2);
  w.resume();
  await w.tick(); await w.tick();
  assert.equal(events.at(-1).active, true);
});

test('extension URL wins over the window title', async () => {
  const client = { readyState: 1 };
  let tab = { url: 'https://www.google.com/search?q=amazon.com', tabId: 7, focused: true, client };
  const bridge = { focusedTab: () => tab };
  const { w, events, show } = setup(bridge);
  show(shop); // title says Amazon, but the real tab is Google
  await w.tick(); await w.tick();
  assert.equal(events.length, 0);

  tab = { url: 'https://www.ozon.ru/product/1', tabId: 9, focused: true, client };
  show(news);
  await w.tick(); await w.tick();
  assert.equal(events.at(-1).store, 'OZON');
  assert.deepEqual(events.at(-1).source, { kind: 'extension', client, tabId: 9 });
});

test('punish closes via the extension when it can, else sends keys', async () => {
  const sent = [];
  const bridge = { closeTab: (client, id) => { sent.push(id); return !!client; } };
  let keys = 0;
  const sendKeys = async () => { keys++; return true; };

  assert.equal(await punish({ source: { kind: 'extension', client: {}, tabId: 3 } }, { action: 'close-tab', bridge, sendKeys }), 'extension');
  assert.deepEqual(sent, [3]);
  assert.equal(keys, 0);

  assert.equal(await punish({ source: { kind: 'window' } }, { action: 'close-tab', bridge, sendKeys }), 'keys');
  assert.equal(keys, 1);

  assert.equal(await punish({ source: { kind: 'window' } }, { action: 'nothing', bridge, sendKeys }), 'nothing');
  assert.equal(keys, 1);
});
