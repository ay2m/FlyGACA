import { useEffect } from 'react';
import { useLocation } from 'react-router';
import i18n from '@/i18n';
import { canonicalUrl, hreflangAlternates, ogImageFor, ogLocale } from '@/lib/seo/seo';
import type { JsonLd } from '@/lib/seo/jsonld';

const LD_ATTR = 'data-managed-ld';

/** Write or remove the single route-managed JSON-LD script in <head>. */
function setJsonLd(data?: JsonLd | JsonLd[]) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[${LD_ATTR}]`);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute(LD_ATTR, '');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

// The route-managed robots meta carries its own attribute so it stays distinct
// from the *host-level* `<meta name="robots">` that main.tsx adds on mirror
// fronts — removing one must never clobber the other.
const ROBOTS_ATTR = 'data-page-robots';

/** Add `noindex, follow` for a route we keep out of the index, or remove it. */
function setRobots(noindex: boolean) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${ROBOTS_ATTR}]`);
  if (!noindex) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    el.setAttribute(ROBOTS_ATTR, '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', 'noindex, follow');
}

/** Drop all hreflang `<link rel="alternate">` (static or previously set). */
function clearAlternates() {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
}

const SUFFIX = 'Fly GACA';
const DEFAULT_TITLE = 'Fly GACA — Saudi Aviation Library';
const DEFAULT_DESC =
  'Fly GACA — an independent educational reference library of Saudi civil-aviation regulations (GACAR), charts and study tools. Not affiliated with GACA.';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang ? `link[rel="alternate"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface PageMetaOptions {
  /**
   * Keep this route out of the index (404 + session-gated pages). Emits
   * `<meta name="robots" content="noindex, follow">` and suppresses the
   * hreflang alternates + JSON-LD — we don't advertise language variants or
   * structured data for a page we're asking search engines to drop.
   */
  noindex?: boolean;
  /** og:type for the route. Article-like pages (guides, library docs) → 'article'. */
  ogType?: 'website' | 'article';
}

/**
 * Single-source head manager for the SPA. Each route sets its own title +
 * description; we mirror those into Open Graph + Twitter, and emit the canonical
 * URL, hreflang alternates and locale for the current path/language. Re-runs when
 * the language changes so og:locale + hreflang stay correct.
 */
export function usePageMeta(
  title?: string,
  description?: string,
  jsonLd?: JsonLd | JsonLd[],
  opts?: PageMetaOptions,
) {
  const { pathname } = useLocation();
  const noindex = opts?.noindex ?? false;
  const ogType = opts?.ogType ?? 'website';
  // Serialize the LD for a stable effect dependency (the object identity churns
  // every render, but its content only changes with the route/language).
  const jsonKey = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    function apply() {
      const fullTitle = title ? `${title} — ${SUFFIX}` : DEFAULT_TITLE;
      const desc = description ?? DEFAULT_DESC;
      // `pathname` is the logical (basename-stripped) path. In Arabic the page's
      // self-canonical is its real `/ar` document, so the hydrated head matches the
      // static Arabic snapshot the crawler read (and Google doesn't fold the Arabic
      // page into the English one). English/x-default stay on the clean path.
      const path = pathname;
      // `pathname` is basename-stripped, so the Arabic canonical is derived from
      // the active language, not the URL prefix — Arabic pages self-canonical to
      // their `/ar` URL, English to the clean path.
      const canonical = canonicalUrl(path, i18n.language);
      const image = ogImageFor(path);

      document.title = fullTitle;
      setMeta('meta[name="description"]', 'name', 'description', desc);
      setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
      setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
      setMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
      setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
      setMeta('meta[property="og:image"]', 'property', 'og:image', image);
      setMeta('meta[property="og:locale"]', 'property', 'og:locale', ogLocale(i18n.language));
      // Explicit Twitter tags (X otherwise falls back to og:*; explicit is the
      // documented best practice). They mirror the Open Graph values 1:1.
      setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

      setLink('canonical', canonical);
      setRobots(noindex);
      if (noindex) {
        clearAlternates();
        setJsonLd(undefined);
      } else {
        for (const alt of hreflangAlternates(path)) setLink('alternate', alt.href, alt.hreflang);
        setJsonLd(jsonLd);
      }
    }

    apply();
    i18n.on('languageChanged', apply);
    return () => {
      i18n.off('languageChanged', apply);
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', 'name', 'description', DEFAULT_DESC);
      setMeta('meta[property="og:title"]', 'property', 'og:title', DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', 'property', 'og:description', DEFAULT_DESC);
      setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
      setRobots(false);
      setJsonLd(undefined);
    };
    // jsonKey stands in for jsonLd's content in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, pathname, jsonKey, noindex, ogType]);
}

/** Shorthand for the common noindex-only case (session-gated pages, 404s) — avoids the `undefined, undefined` filler. */
export function useNoindexMeta(title?: string) {
  usePageMeta(title, undefined, undefined, { noindex: true });
}
