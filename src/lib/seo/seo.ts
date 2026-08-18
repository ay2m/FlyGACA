/**
 * Pure SEO URL helpers — canonical + hreflang for the bilingual SPA.
 *
 * English is served at clean, param-free paths; the Arabic variant lives under a
 * real `/ar/` locale prefix (e.g. `/ar/tools/crosswind`) so it exists as its own
 * crawlable, prerendered document on a static host. Each language URL is
 * self-canonical; both carry the same hreflang cluster (en → clean, ar → `/ar`,
 * x-default → clean).
 */
export const SITE_ORIGIN =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ??
  'https://flygaca.com';

export const OG_IMAGE = `${SITE_ORIGIN}/img/og-card.png`;

/** The path prefix under which the Arabic variant of every content route lives. */
export const AR_PREFIX = '/ar';

/** Normalize a router path: leading slash, no trailing slash (except root), no query/hash. */
export function normalizePath(path: string): string {
  const clean = (path || '/').split(/[?#]/)[0];
  const withLead = clean.startsWith('/') ? clean : `/${clean}`;
  return withLead.length > 1 ? withLead.replace(/\/+$/, '') : '/';
}

/** True if `pathname` is under the Arabic `/ar` document tree (`/ar`, `/ar/…`). A
 *  look-alike like `/archive` is not matched. */
export function isArabicPath(pathname: string): boolean {
  const p = normalizePath(pathname);
  return p === AR_PREFIX || p.startsWith(`${AR_PREFIX}/`);
}

/**
 * Strip a leading `/ar` segment to recover the logical path the router matches:
 * `/ar` and `/ar/` → `/`, `/ar/library` → `/library`; a non-`/ar` path (including
 * look-alikes like `/archive`) passes through unchanged. The router mounts under
 * `basename: '/ar'` for Arabic, so this mirrors what React Router strips at runtime.
 */
export function stripArPrefix(pathname: string): string {
  const p = normalizePath(pathname);
  if (p === AR_PREFIX) return '/';
  return p.startsWith(`${AR_PREFIX}/`) ? p.slice(AR_PREFIX.length) : p;
}

/**
 * Root-relative path for a logical `path` in `lang`. Arabic lives under a real
 * `/ar` prefix (`/` → `/ar`, `/library` → `/ar/library`) so Firebase — which
 * routes by path, never by `?lang=` query — can serve a distinct Arabic document
 * the AI crawlers actually read; English/x-default stay on the clean path. `path`
 * may be logical or already `/ar`-prefixed — the prefix is normalized away first.
 */
export function localePath(path: string, lang: string): string {
  const clean = stripArPrefix(path);
  if (lang !== 'ar') return clean;
  return clean === '/' ? AR_PREFIX : `${AR_PREFIX}${clean}`;
}

/** Origin-absolute canonical for a logical `path` in `lang`. English/x-default use
 *  the clean path; Arabic self-canonicalizes to its own `/ar` document. */
export function canonicalUrl(path: string, lang: string = 'en'): string {
  return `${SITE_ORIGIN}${localePath(path, lang)}`;
}

export interface Alternate {
  hreflang: string;
  href: string;
}

/**
 * hreflang alternates for a route: the English (clean) URL, the Arabic (`/ar`)
 * URL, and an x-default at the clean URL. Independent of the active language, so
 * the same cluster is emitted on both the English and Arabic documents. `path`
 * may be logical or `/ar`-prefixed — it is normalized to the clean path first.
 * Head + sitemap must emit this exact set (see scripts/build-sitemap.mjs,
 * scripts/prerender-head.mjs).
 */
export function hreflangAlternates(path: string): Alternate[] {
  const clean = stripArPrefix(path);
  return [
    { hreflang: 'en', href: canonicalUrl(clean, 'en') },
    { hreflang: 'ar', href: canonicalUrl(clean, 'ar') },
    { hreflang: 'x-default', href: canonicalUrl(clean, 'en') },
  ];
}

/**
 * The URL to `location.replace` to so the path prefix matches the language, or
 * `null` when they already agree (loop-safe). The single reconciler that moves an
 * old `?lang=ar` link, a stored Arabic choice, or an Arabic browser on a clean URL
 * onto `/ar` — and drops the now-redundant `?lang=` param. Pairs with the
 * basename-mounted router (src/router.tsx) and `resolveInitialLang` in i18n. Pure;
 * the actual `location.replace` lives in `main.tsx`.
 */
export function localeRedirect(
  loc: { pathname: string; search: string; hash: string },
  lang: string,
): string | null {
  const target = localePath(loc.pathname, lang);
  const params = new URLSearchParams(loc.search);
  const hadLang = params.has('lang');
  params.delete('lang');
  if (target === normalizePath(loc.pathname) && !hadLang) return null;
  const query = params.toString();
  return `${target}${query ? `?${query}` : ''}${loc.hash}`;
}

const OG_LOCALE: Record<string, string> = { en: 'en_US', ar: 'ar_SA' };
export function ogLocale(lang: string): string {
  return OG_LOCALE[lang] ?? 'en_US';
}

/** Sections that ship a dedicated social card (see scripts/build-og-images.mjs). */
const OG_SECTIONS = new Set(['tools', 'guides', 'library', 'study', 'pricing']);

/**
 * The Open Graph image for a path: a branded per-section card when one exists
 * (e.g. `/tools/...` → `og-tools.png`), otherwise the default site card. The
 * section is the first path segment, so leaf pages share their section's card.
 */
export function ogImageFor(path: string): string {
  const section = stripArPrefix(path).split('/')[1] ?? '';
  return OG_SECTIONS.has(section) ? `${SITE_ORIGIN}/img/og-${section}.png` : OG_IMAGE;
}

/**
 * Non-canonical production hosts that serve the *same* build under a different
 * brand/domain. Left indexable they split ranking signals and clutter the
 * branded SERP, so we fold them onto the canonical origin. Preview/staging
 * fronts (`*.vercel.app`, `*.web.app`, `*.netlify.app`, `*.pages.dev`),
 * `localhost`, and the native shell are intentionally excluded.
 */
const DUPLICATE_HOSTS = new Set(['captadel.com', 'www.captadel.com']);

/**
 * If `loc` is on a known duplicate host, the canonical URL to redirect to
 * (same path/query/hash on the canonical origin); otherwise `null`. Pure so the
 * decision is unit-testable; the actual `location.replace` lives in `main.tsx`.
 */
export function canonicalRedirect(loc: {
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
}): string | null {
  if (!DUPLICATE_HOSTS.has(loc.hostname)) return null;
  return `${SITE_ORIGIN}${loc.pathname}${loc.search}${loc.hash}`;
}

/**
 * Host suffixes of the *mirror* fronts that serve the same build for redundancy
 * (Firebase `*.web.app`, Vercel `*.vercel.app`, Netlify `*.netlify.app`,
 * Cloudflare `*.pages.dev`) plus their PR previews. They must stay live but must
 * NOT be indexed — otherwise Google treats them as duplicates of flygaca.com and
 * may pick one as canonical. `flygaca.com` and `localhost` (the prerender host)
 * are deliberately not matched, so neither the canonical site nor the baked
 * snapshots ever get a noindex.
 */
const MIRROR_HOST_SUFFIXES = ['.web.app', '.vercel.app', '.netlify.app', '.pages.dev'];

/** True if `hostname` is a non-canonical mirror/preview front that should noindex. */
export function isMirrorHost(hostname: string): boolean {
  return MIRROR_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}
