import { describe, expect, it } from 'vitest';
import {
  SITE_ORIGIN,
  AR_PREFIX,
  normalizePath,
  canonicalUrl,
  localePath,
  isArabicPath,
  stripArPrefix,
  hreflangAlternates,
  localeRedirect,
  ogLocale,
  ogImageFor,
  canonicalRedirect,
  isMirrorHost,
} from '@/lib/seo/seo';

describe('normalizePath', () => {
  it('strips query/hash and trailing slashes, keeps root', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/library/')).toBe('/library');
    expect(normalizePath('/tools/crosswind?foo=1#x')).toBe('/tools/crosswind');
    expect(normalizePath('tools')).toBe('/tools');
  });
});

describe('localePath + canonicalUrl', () => {
  it('English/default stays on the clean path', () => {
    expect(localePath('/library', 'en')).toBe('/library');
    expect(canonicalUrl('/library/part-1')).toBe(`${SITE_ORIGIN}/library/part-1`);
    expect(canonicalUrl('/library/part-1', 'en')).toBe(`${SITE_ORIGIN}/library/part-1`);
  });
  it('Arabic maps onto its real /ar document (root → /ar, no trailing slash)', () => {
    expect(localePath('/', 'ar')).toBe('/ar');
    expect(localePath('/library', 'ar')).toBe('/ar/library');
    expect(canonicalUrl('/', 'ar')).toBe(`${SITE_ORIGIN}/ar`);
    expect(canonicalUrl('/library/part-1?x=1#y', 'ar')).toBe(`${SITE_ORIGIN}/ar/library/part-1`);
  });
  it('never double-prefixes an already /ar-prefixed path', () => {
    expect(canonicalUrl('/ar/pricing', 'ar')).toBe(`${SITE_ORIGIN}${AR_PREFIX}/pricing`);
    expect(canonicalUrl('/ar/pricing', 'en')).toBe(`${SITE_ORIGIN}/pricing`);
  });
});

describe('isArabicPath + stripArPrefix', () => {
  it('detects the /ar document tree without matching look-alikes', () => {
    expect(isArabicPath('/ar')).toBe(true);
    expect(isArabicPath('/ar/library')).toBe(true);
    expect(isArabicPath('/')).toBe(false);
    expect(isArabicPath('/archive')).toBe(false);
  });
  it('strips the /ar prefix back to the logical path', () => {
    expect(stripArPrefix('/ar')).toBe('/');
    expect(stripArPrefix('/ar/')).toBe('/');
    expect(stripArPrefix('/ar/library/part-1')).toBe('/library/part-1');
    expect(stripArPrefix('/library')).toBe('/library');
    expect(stripArPrefix('/archive')).toBe('/archive');
  });
  it('localePath(ar) and stripArPrefix round-trip', () => {
    expect(stripArPrefix(localePath('/library', 'ar'))).toBe('/library');
  });
});

describe('hreflangAlternates', () => {
  it('emits en (clean), ar (/ar) and x-default (clean), language-independent', () => {
    const alts = hreflangAlternates('/chat');
    expect(alts.map((a) => a.hreflang)).toEqual(['en', 'ar', 'x-default']);
    expect(alts[0].href).toBe(`${SITE_ORIGIN}/chat`);
    expect(alts[1].href).toBe(`${SITE_ORIGIN}${AR_PREFIX}/chat`);
    expect(alts[2].href).toBe(`${SITE_ORIGIN}/chat`);
  });
  it('emits the same cluster whether given the clean or /ar path', () => {
    expect(hreflangAlternates('/ar/chat')).toEqual(hreflangAlternates('/chat'));
  });
});

describe('localeRedirect', () => {
  const loc = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });
  it('returns null when path prefix already matches the language (loop-safe)', () => {
    expect(localeRedirect(loc('/library'), 'en')).toBeNull();
    expect(localeRedirect(loc('/ar/library'), 'ar')).toBeNull();
    expect(localeRedirect(loc('/ar'), 'ar')).toBeNull();
  });
  it('moves a clean URL to /ar when the language is Arabic', () => {
    expect(localeRedirect(loc('/library'), 'ar')).toBe('/ar/library');
    expect(localeRedirect(loc('/'), 'ar')).toBe('/ar');
  });
  it('moves an /ar URL back to the clean path when the language is English', () => {
    expect(localeRedirect(loc('/ar/library'), 'en')).toBe('/library');
  });
  it('drops a legacy ?lang= param, preserving other query + hash', () => {
    expect(localeRedirect(loc('/library', '?lang=ar'), 'ar')).toBe('/ar/library');
    expect(localeRedirect(loc('/ar/library', '?lang=ar&ref=x', '#s'), 'ar')).toBe(
      '/ar/library?ref=x#s',
    );
  });
});

describe('ogLocale', () => {
  it('maps languages and defaults to en_US', () => {
    expect(ogLocale('ar')).toBe('ar_SA');
    expect(ogLocale('en')).toBe('en_US');
    expect(ogLocale('zz')).toBe('en_US');
  });
});

describe('ogImageFor', () => {
  it('returns the per-section card for a known section (incl. leaf pages)', () => {
    expect(ogImageFor('/tools')).toBe(`${SITE_ORIGIN}/img/og-tools.png`);
    expect(ogImageFor('/tools/crosswind?foo=1')).toBe(`${SITE_ORIGIN}/img/og-tools.png`);
    expect(ogImageFor('/guides/saudi-ppl-requirements')).toBe(`${SITE_ORIGIN}/img/og-guides.png`);
    expect(ogImageFor('/study/quiz')).toBe(`${SITE_ORIGIN}/img/og-study.png`);
  });
  it('falls back to the default card elsewhere', () => {
    expect(ogImageFor('/')).toBe(`${SITE_ORIGIN}/img/og-card.png`);
    expect(ogImageFor('/about')).toBe(`${SITE_ORIGIN}/img/og-card.png`);
  });
});

describe('canonicalRedirect', () => {
  it('folds a duplicate host onto the canonical origin, preserving path/query/hash', () => {
    expect(
      canonicalRedirect({
        hostname: 'captadel.com',
        pathname: '/pricing',
        search: '?lang=ar',
        hash: '#faq',
      }),
    ).toBe(`${SITE_ORIGIN}/pricing?lang=ar#faq`);
    expect(
      canonicalRedirect({ hostname: 'www.captadel.com', pathname: '/', search: '', hash: '' }),
    ).toBe(`${SITE_ORIGIN}/`);
  });

  it('returns null for the canonical host, previews, localhost and native', () => {
    for (const hostname of [
      'flygaca.com',
      'flygaca-app.web.app',
      'flygaca-app-git-x.vercel.app',
      'localhost',
    ]) {
      expect(canonicalRedirect({ hostname, pathname: '/tools', search: '', hash: '' })).toBeNull();
    }
  });
});

describe('isMirrorHost', () => {
  it('matches the mirror/preview fronts that must noindex', () => {
    for (const hostname of [
      'flygaca-app.web.app',
      'flygaca-app-git-claude-x.vercel.app',
      'flygaca.netlify.app',
      'flygaca.pages.dev',
    ]) {
      expect(isMirrorHost(hostname)).toBe(true);
    }
  });

  it('does NOT match the canonical host or the prerender host', () => {
    for (const hostname of ['flygaca.com', 'www.flygaca.com', 'localhost', '127.0.0.1']) {
      expect(isMirrorHost(hostname)).toBe(false);
    }
  });
});
