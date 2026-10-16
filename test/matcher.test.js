import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, matchStore, matchUrl, matchTitle, hostOf } from '../src/main/matcher.js';
import { DEFAULT_STORES, DEFAULT_IGNORE_TITLES, isBrowser } from '../src/main/stores.js';

const c = compile(DEFAULT_STORES, DEFAULT_IGNORE_TITLES);

test('window titles of real shop pages match', () => {
  const cases = [
    ['Amazon.com: EDLME Modern Gorilla Sculptural Sofa : Home & Kitchen - Google Chrome', 'Amazon'],
    ['Amazon.ca : gorilla couch - Google Chrome', 'Amazon'],
    ['Amazon.co.uk Shopping Basket - Personal - Microsoft Edge', 'Amazon'],
    ['Gorilla Couch for sale | eBay - Google Chrome', 'eBay'],
    ['Диван горила - купити недорого | AliExpress — Mozilla Firefox', 'AliExpress'],
    ['Gorilla Couch - Temu - Google Chrome', 'Temu'],
    ['Диван-горила – купити в Києві | ROZETKA - Google Chrome', 'Rozetka'],
    ['Диван горила, ціна 8511 грн — Prom.ua (ID#123456) - Google Chrome', 'Prom.ua'],
    ['Диван: 5 000 грн. - Меблі Київ на Olx - Google Chrome', 'OLX'],
    ['Диван купити в Епіцентрі К - Google Chrome', 'Епіцентр'],
    ['Ноутбук ASUS – купити у Фокстроті - Google Chrome', 'Фокстрот'],
    ['Смартфон — купити в інтернет-магазині COMFY - Google Chrome', 'Comfy'],
    ['Desktop Duck on Steam - Google Chrome', 'Steam'],
    ['Desktop Duck у Steam - Google Chrome', 'Steam'],
    ['Threshold Sofa : Target - Google Chrome', 'Target'],
  ];
  for (const [title, store] of cases) assert.equal(matchTitle(title, c), store, title);
});

test('innocent titles do not match', () => {
  const cases = [
    'gorilla couch amazon.com - Google Search - Google Chrome',
    'диван amazon.com - Пошук Google - Google Chrome',
    'Amazon.com earnings beat expectations - YouTube - Google Chrome',
    'Розетка — Вікіпедія - Google Chrome',
    'Як замінити розетку своїми руками - Google Chrome',
    'Епіцентр землетрусу - новини - Google Chrome',
    'Joomla 5 templates - Google Chrome',
    'Amazon rainforest facts - Google Chrome',
    'New Tab - Google Chrome',
    'Steam Community :: Desktop Duck - Google Chrome',
    'Inbox (3) - me@gmail.com - Gmail - Google Chrome',
  ];
  for (const title of cases) assert.equal(matchTitle(title, c), null, title);
});

test('ignore words are whole words, so "Climbing" is not "Bing"', () => {
  assert.equal(matchTitle('Climbing Shoes - Amazon.com - Google Chrome', c), 'Amazon');
});

test('URLs match by domain, including country TLDs and subdomains', () => {
  assert.equal(matchUrl('https://www.amazon.ca/dp/B0GWRT/', c), 'Amazon');
  assert.equal(matchUrl('https://smile.amazon.co.uk/gp/cart', c), 'Amazon');
  assert.equal(matchUrl('https://rozetka.com.ua/ua/divan/p123/', c), 'Rozetka');
  assert.equal(matchUrl('https://prom.ua/ua/p123-divan.html', c), 'Prom.ua');
  assert.equal(matchUrl('https://www.olx.ua/d/uk/obyavlenie/divan.html', c), 'OLX');
  assert.equal(matchUrl('https://epicentrk.ua/ua/shop/divan.html', c), 'Епіцентр');
  assert.equal(matchUrl('https://store.steampowered.com/app/123/Desktop_Duck/', c), 'Steam');
});

test('URLs that only look like shops do not match', () => {
  assert.equal(matchUrl('https://console.aws.amazon.com/ec2', c), null);
  assert.equal(matchUrl('https://www.google.com/search?q=amazon.com', c), null);
  assert.equal(matchUrl('https://notamazon.com/', c), null);
  assert.equal(matchUrl('https://amazonaws.com/', c), null);
  assert.equal(matchUrl('https://www.google.com.ua/search?q=rozetka', c), null);
  assert.equal(matchUrl('https://steamcommunity.com/app/123', c), null);
  assert.equal(matchUrl('chrome://newtab/', c), null);
});

test('a known URL beats a suspicious title', () => {
  assert.equal(matchStore({ url: 'https://www.google.com/search?q=x', title: 'Amazon.com - Google Search' }, c), null);
  assert.equal(matchStore({ url: 'https://www.amazon.com/dp/1', title: 'Loading...' }, c), 'Amazon');
  assert.equal(matchStore({ title: 'Amazon.com: cart' }, c), 'Amazon');
});

test('user-defined stores work', () => {
  const custom = compile([{ name: 'Zara', domains: ['zara.com'], keywords: ['ZARA'] }]);
  assert.equal(matchStore({ title: 'Dresses | ZARA Россия' }, custom), 'Zara');
  assert.equal(matchStore({ url: 'https://www.zara.com/ru/' }, custom), 'Zara');
});

test('hostOf ignores non-web schemes and junk', () => {
  assert.equal(hostOf('https://WWW.Amazon.com./x'), 'www.amazon.com');
  assert.equal(hostOf('file:///C:/x.html'), null);
  assert.equal(hostOf('not a url'), null);
});

test('browser detection by exe path or app name', () => {
  assert.ok(isBrowser({ name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }));
  assert.ok(isBrowser({ name: 'Microsoft Edge', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' }));
  assert.ok(isBrowser({ name: 'Firefox', path: '/usr/lib/firefox/firefox' }));
  assert.ok(isBrowser({ name: 'Safari', path: '/Applications/Safari.app' }));
  assert.ok(isBrowser({ name: 'Arc', path: '/Applications/Arc.app' }));
  assert.ok(!isBrowser({ name: 'Discord', path: 'C:\\Users\\u\\AppData\\Local\\Discord\\app-1.0\\Discord.exe' }));
  assert.ok(!isBrowser({ name: 'Steam', path: 'C:\\Program Files (x86)\\Steam\\steam.exe' }));
  assert.ok(!isBrowser({ name: 'Visual Studio Code', path: 'C:\\Code.exe' }));
  assert.ok(!isBrowser(null));
});
