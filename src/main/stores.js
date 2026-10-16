// Default shops. `domains` are checked when the real URL is known (browser
// extension, or macOS); `keywords` are case-sensitive and checked against the
// window title, which is all we get from Windows. A trailing `.*` in a domain
// means "any country TLD" (amazon.de, amazon.co.uk, ...).
//
// Users can add their own entries or disable these in settings.json.

const AMAZON_TLDS = [
  'com', 'ca', 'co.uk', 'de', 'fr', 'it', 'es', 'nl', 'se', 'pl', 'com.tr', 'com.au',
  'co.jp', 'in', 'com.br', 'com.mx', 'ae', 'sa', 'sg', 'eg', 'com.be',
];

export const DEFAULT_STORES = [
  {
    name: 'Amazon',
    domains: ['amazon.*'],
    excludeDomains: ['aws.amazon.com', 'developer.amazon.com', 'sellercentral.amazon.*', 'read.amazon.*', 'music.amazon.*'],
    keywords: AMAZON_TLDS.map(t => `Amazon.${t}`),
  },
  { name: 'eBay', domains: ['ebay.*'], keywords: ['| eBay'] },
  { name: 'AliExpress', domains: ['aliexpress.com', 'aliexpress.ru', 'aliexpress.us'], keywords: ['AliExpress', 'Aliexpress'] },
  { name: 'Temu', domains: ['temu.com'], keywords: ['| Temu', '- Temu', 'Temu |'] },
  { name: 'SHEIN', domains: ['shein.com', 'shein.co.uk'], keywords: ['SHEIN'] },
  { name: 'Etsy', domains: ['etsy.com'], keywords: ['| Etsy', '- Etsy'] },
  { name: 'Walmart', domains: ['walmart.com', 'walmart.ca'], keywords: ['Walmart.com', 'Walmart.ca'] },
  { name: 'Target', domains: ['target.com'], keywords: [': Target'] },
  { name: 'Best Buy', domains: ['bestbuy.com', 'bestbuy.ca'], keywords: ['| Best Buy', '- Best Buy'] },
  { name: 'iHerb', domains: ['iherb.com'], keywords: ['iHerb'] },
  { name: 'ASOS', domains: ['asos.com'], keywords: ['| ASOS'] },
  { name: 'Joom', domains: ['joom.com', 'joom.ru'], keywords: ['Joom'] },
  { name: 'OZON', domains: ['ozon.ru', 'ozon.kz', 'ozon.by'], keywords: ['OZON', 'Ozon.ru'] },
  { name: 'Wildberries', domains: ['wildberries.ru', 'wildberries.by', 'wildberries.kz', 'wb.ru'], keywords: ['Wildberries'] },
  { name: 'Яндекс Маркет', domains: ['market.yandex.ru', 'market.yandex.kz'], keywords: ['Яндекс Маркет', 'Яндекс.Маркет', 'Yandex Market'] },
  { name: 'Мегамаркет', domains: ['megamarket.ru'], keywords: ['Мегамаркет', 'МегаМаркет'] },
  { name: 'Lamoda', domains: ['lamoda.ru', 'lamoda.kz', 'lamoda.by'], keywords: ['Lamoda', 'LAMODA'] },
  { name: 'Авито', domains: ['avito.ru'], keywords: ['Авито', 'Avito'] },
  { name: 'М.Видео', domains: ['mvideo.ru'], keywords: ['М.Видео'] },
  { name: 'Эльдорадо', domains: ['eldorado.ru'], keywords: ['Эльдорадо'] },
  { name: 'DNS', domains: ['dns-shop.ru'], keywords: ['DNS Shop', 'ДНС'] },
  { name: 'Ситилинк', domains: ['citilink.ru'], keywords: ['Ситилинк'] },
  { name: 'Kaspi', domains: ['kaspi.kz'], keywords: ['Kaspi.kz', 'Kaspi Магазин'] },
  { name: 'Rozetka', domains: ['rozetka.com.ua'], keywords: ['ROZETKA', 'Rozetka'] },
  { name: 'Steam', domains: ['store.steampowered.com'], keywords: [' on Steam', ' в Steam'] },
];

// Title keyword matches are ignored on these pages (case-insensitive), so
// googling "amazon.com gorilla couch" or watching a review doesn't count.
export const DEFAULT_IGNORE_TITLES = [
  'Google Search', 'Поиск в Google', 'Яндекс: нашлось', '— Яндекс:', 'Bing', 'DuckDuckGo',
  'YouTube', 'Wikipedia', 'Википедия', 'Reddit', 'Twitch', 'ChatGPT', 'Claude',
];

const BROWSER_EXES = new Set([
  'chrome', 'msedge', 'firefox', 'opera', 'opera_gx', 'brave', 'vivaldi', 'browser', 'yandex',
  'arc', 'safari', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable',
  'microsoft-edge', 'zen', 'librewolf', 'floorp', 'waterfox', 'thorium', 'whale', 'naver whale',
]);
const BROWSER_NAMES = /chrome|edge|firefox|opera|brave|vivaldi|yandex|яндекс|safari|chromium|^arc$|zen browser|librewolf|floorp|waterfox|thorium/i;

export function isBrowser(owner) {
  if (!owner) return false;
  const exe = (owner.path || '').split(/[\\/]/).pop().toLowerCase().replace(/\.(exe|app)$/, '');
  return BROWSER_EXES.has(exe) || BROWSER_NAMES.test(owner.name || '');
}
