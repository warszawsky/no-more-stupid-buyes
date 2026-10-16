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
  { name: 'AliExpress', domains: ['aliexpress.com', 'aliexpress.us'], keywords: ['AliExpress', 'Aliexpress'] },
  { name: 'Temu', domains: ['temu.com'], keywords: ['| Temu', '- Temu', 'Temu |'] },
  { name: 'SHEIN', domains: ['shein.com', 'shein.co.uk'], keywords: ['SHEIN'] },
  { name: 'Etsy', domains: ['etsy.com'], keywords: ['| Etsy', '- Etsy'] },
  { name: 'Walmart', domains: ['walmart.com', 'walmart.ca'], keywords: ['Walmart.com', 'Walmart.ca'] },
  { name: 'Target', domains: ['target.com'], keywords: [': Target'] },
  { name: 'Best Buy', domains: ['bestbuy.com', 'bestbuy.ca'], keywords: ['| Best Buy', '- Best Buy'] },
  { name: 'iHerb', domains: ['iherb.com'], keywords: ['iHerb'] },
  { name: 'ASOS', domains: ['asos.com'], keywords: ['| ASOS'] },
  { name: 'Joom', domains: ['joom.com'], keywords: ['Joom'] },
  // Ukraine. Plain words that are also ordinary nouns ("Розетка" is a socket,
  // "Епіцентр" an epicentre) are left out of the title keywords on purpose.
  { name: 'Rozetka', domains: ['rozetka.com.ua'], keywords: ['ROZETKA', 'Rozetka'] },
  { name: 'Prom.ua', domains: ['prom.ua'], keywords: ['Prom.ua', 'PROM.UA'] },
  { name: 'OLX', domains: ['olx.*'], keywords: ['OLX', 'Olx'] },
  { name: 'Епіцентр', domains: ['epicentrk.ua'], keywords: ['Епіцентр К', 'Епіцентрі К', 'Epicentr K', 'epicentrk.ua'] },
  { name: 'Comfy', domains: ['comfy.ua'], keywords: ['COMFY', 'Comfy.ua'] },
  { name: 'Фокстрот', domains: ['foxtrot.com.ua'], keywords: ['Фокстрот', 'FOXTROT', 'Foxtrot'] },
  { name: 'АЛЛО', domains: ['allo.ua'], keywords: ['АЛЛО', 'Allo.ua', 'allo.ua'] },
  { name: 'MOYO', domains: ['moyo.ua'], keywords: ['MOYO', 'Moyo.ua'] },
  { name: 'Kasta', domains: ['kasta.ua'], keywords: ['Kasta', 'KASTA'] },
  { name: 'MAKEUP', domains: ['makeup.com.ua'], keywords: ['MAKEUP.com.ua', 'Makeup.com.ua'] },
  { name: 'EVA', domains: ['eva.ua'], keywords: ['EVA.UA', 'eva.ua'] },
  { name: 'Intertop', domains: ['intertop.ua'], keywords: ['INTERTOP', 'Intertop'] },
  { name: 'Answear', domains: ['answear.ua'], keywords: ['Answear', 'ANSWEAR'] },
  { name: 'Shafa', domains: ['shafa.ua'], keywords: ['Shafa.ua', 'SHAFA'] },
  { name: 'Steam', domains: ['store.steampowered.com'], keywords: [' on Steam', ' у Steam', ' в Steam'] },
];

// Title keyword matches are ignored on these pages (case-insensitive), so
// googling "amazon.com gorilla couch" or watching a review doesn't count.
export const DEFAULT_IGNORE_TITLES = [
  'Google Search', 'Пошук Google', 'Поиск в Google', 'Bing', 'DuckDuckGo',
  'YouTube', 'Wikipedia', 'Вікіпедія', 'Википедия', 'Reddit', 'Twitch', 'ChatGPT', 'Claude',
];

const BROWSER_EXES = new Set([
  'chrome', 'msedge', 'firefox', 'opera', 'opera_gx', 'brave', 'vivaldi',
  'arc', 'safari', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable',
  'microsoft-edge', 'zen', 'librewolf', 'floorp', 'waterfox', 'thorium', 'whale', 'naver whale',
]);
const BROWSER_NAMES = /chrome|edge|firefox|opera|brave|vivaldi|safari|chromium|^arc$|zen browser|librewolf|floorp|waterfox|thorium/i;

export function isBrowser(owner) {
  if (!owner) return false;
  const exe = (owner.path || '').split(/[\\/]/).pop().toLowerCase().replace(/\.(exe|app)$/, '');
  return BROWSER_EXES.has(exe) || BROWSER_NAMES.test(owner.name || '');
}
