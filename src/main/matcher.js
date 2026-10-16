// Decides whether the thing in front of the user is a shop. Pure functions,
// no Electron, so it is unit-tested directly (test/matcher.test.js).

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Keyword as a regex that doesn't fire inside a longer word ("Ozon" must not
// match "Ozone"). JS \b is ASCII-only, so use Unicode letter lookarounds.
// Russian words get a short case ending allowance ("на Яндекс Маркете").
function wordRegex(kw, flags) {
  const pre = /^[\p{L}\p{N}]/u.test(kw) ? '(?<![\\p{L}\\p{N}])' : '';
  const ending = /[а-яё]$/i.test(kw) ? '[а-яё]{0,3}' : '';
  const post = /[\p{L}\p{N}]$/u.test(kw) ? ending + '(?![\\p{L}\\p{N}])' : '';
  return new RegExp(pre + escape(kw) + post, flags);
}

function domainRegex(d) {
  // "amazon.*" -> amazon.<any tld>, "ozon.ru" -> exactly that, both with subdomains
  const body = d.endsWith('.*')
    ? escape(d.slice(0, -2)) + '\\.[a-z]{2,3}(?:\\.[a-z]{2})?'
    : escape(d);
  return new RegExp(`(?:^|\\.)${body}$`, 'i');
}

export function hostOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.hostname.replace(/\.$/, '') : null;
  } catch {
    return null;
  }
}

export function compile(stores, ignoreTitles = []) {
  return {
    stores: stores.map(s => ({
      name: s.name,
      domains: (s.domains || []).map(domainRegex),
      exclude: (s.excludeDomains || []).map(domainRegex),
      keywords: (s.keywords || []).map(k => wordRegex(k, 'u')),
    })),
    ignore: ignoreTitles.map(k => wordRegex(k, 'iu')),
  };
}

export function matchUrl(url, compiled) {
  const host = hostOf(url);
  if (!host) return null;
  for (const s of compiled.stores) {
    if (s.exclude.some(r => r.test(host))) continue;
    if (s.domains.some(r => r.test(host))) return s.name;
  }
  return null;
}

export function matchTitle(title, compiled) {
  if (!title || compiled.ignore.some(r => r.test(title))) return null;
  for (const s of compiled.stores) {
    if (s.keywords.some(r => r.test(title))) return s.name;
  }
  return null;
}

// A known URL is authoritative: if we have one, the title is not consulted,
// so a Google results page titled "Amazon.com gorilla couch" stays innocent.
export function matchStore({ url, title }, compiled) {
  if (url) return matchUrl(url, compiled);
  return matchTitle(title, compiled);
}
