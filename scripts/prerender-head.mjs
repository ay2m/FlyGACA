/**
 * Browserless head-prerender — the GUARANTEED SEO layer.
 *
 * For every indexable route it writes dist/<route>/index.html: a copy of the
 * built shell with the per-route <head> baked in (title, description, canonical,
 * the en/ar/x-default hreflang set, Open Graph, and a JSON-LD item) and the home
 * hero stripped on non-home routes so a no-JS crawler never sees homepage content
 * on every path. Pure Node string work — no browser — so it runs anywhere `npm run
 * build` runs, including a build machine with no Chromium, and it is part of that
 * build, so it can never be skipped on a deploy. (The original reason was a hosting
 * buildpack that could not run headless Chromium. That host is gone, but the
 * property is still the point: this layer must never depend on a browser.)
 *
 * It is the floor; scripts/prerender.mjs (Playwright, full-body) is an optional
 * enhancement that overwrites these files with hydrated snapshots on hosts that
 * have a browser (Vercel buildCommand, `npm run deploy`).
 *
 * Route set + URL/JSON-LD shapes mirror scripts/build-sitemap.mjs and
 * src/lib/{seo,jsonld}.ts. Keep them in sync (guarded by tests/jsonld.test.ts).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL ?? 'https://flygaca.com').replace(/\/$/, '');
const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

const shellPath = join(root, 'dist/index.html');
if (!existsSync(shellPath)) {
  console.warn('prerender-head: dist/index.html missing — run after vite build. Skipping.');
  process.exit(0);
}
const shell = readFileSync(shellPath, 'utf8');

// --- Pure URL/meta helpers (mirror src/lib/seo/seo.ts) -----------------------------
const SUFFIX = 'Fly GACA';
const DEFAULT_TITLE = 'Fly GACA — Saudi Aviation Library';
const DEFAULT_DESC =
  'Fly GACA — an independent educational reference library of Saudi civil-aviation regulations (GACAR), charts and study tools. Not affiliated with GACA.';
const OG_SECTIONS = new Set(['tools', 'guides', 'library', 'study', 'pricing']);

// English lives at clean paths; the Arabic variant lives under /ar. Mirrors
// src/lib/seo/seo.ts so the no-JS head layer matches the runtime head.
const AR_PREFIX = '/ar';
const normalizePath = (p) => {
  const clean = (p || '/').split(/[?#]/)[0];
  const lead = clean.startsWith('/') ? clean : `/${clean}`;
  return lead.length > 1 ? lead.replace(/\/+$/, '') : '/';
};
// The Arabic document's real path mirrors src/lib/seo/seo.ts localePath/canonicalUrl:
// `/` → `/ar`, `/library` → `/ar/library`; English/x-default stay on the clean path.
const stripArPrefix = (p) => {
  const n = normalizePath(p);
  if (n === AR_PREFIX) return '/';
  if (n.startsWith(`${AR_PREFIX}/`)) return n.slice(AR_PREFIX.length);
  return n;
};
const canonicalUrl = (p, lang = 'en') => {
  const clean = stripArPrefix(p);
  const path = lang === 'ar' ? (clean === '/' ? AR_PREFIX : `${AR_PREFIX}${clean}`) : clean;
  return `${SITE}${path}`;
};
const ogLocale = (lang) => (lang === 'ar' ? 'ar_SA' : 'en_US');
const ogImageFor = (p) => {
  const section = normalizePath(p).split('/')[1] ?? '';
  return OG_SECTIONS.has(section) ? `${SITE}/img/og-${section}.png` : `${SITE}/img/og-card.png`;
};
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --- JSON-LD builders (mirror src/lib/seo/jsonld.ts) -------------------------------
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;
const CTX = 'https://schema.org';
const orgNode = () => ({
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Fly GACA',
  legalName: 'BDA Company International',
  url: SITE,
  logo: { '@type': 'ImageObject', url: `${SITE}/img/icon-512.png` },
});
const articleLd = (type, { title, description, path, dateModified, lang = 'en' }) => {
  const url = canonicalUrl(path, lang);
  return {
    '@context': CTX,
    '@type': type,
    headline: title,
    ...(description ? { description } : {}),
    ...(dateModified ? { datePublished: dateModified, dateModified } : {}),
    inLanguage: lang,
    url,
    mainEntityOfPage: url,
    image: `${SITE}/img/og-card.png`,
    author: orgNode(),
    isPartOf: { '@id': SITE_ID },
    publisher: orgNode(),
  };
};
const softwareAppLd = ({ title, description, path, lang = 'en' }) => ({
  '@context': CTX,
  '@type': 'SoftwareApplication',
  name: title,
  ...(description ? { description } : {}),
  url: canonicalUrl(path, lang),
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
  publisher: { '@id': ORG_ID },
});
const courseLd = ({ title, description, path, lang = 'en' }) => ({
  '@context': CTX,
  '@type': 'Course',
  name: title,
  ...(description ? { description } : {}),
  inLanguage: lang,
  url: canonicalUrl(path, lang),
  provider: orgNode(),
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
  hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
});
const airportLd = ({ name, icao, iata, path, lat, lon, elevationFt, country }) => ({
  '@context': CTX,
  '@type': 'Airport',
  name,
  icaoCode: icao,
  ...(iata ? { iataCode: iata } : {}),
  url: canonicalUrl(path),
  ...(typeof lat === 'number' && typeof lon === 'number'
    ? {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: lat,
          longitude: lon,
          ...(typeof elevationFt === 'number' ? { elevation: `${elevationFt} ft` } : {}),
        },
      }
    : {}),
  ...(country ? { address: { '@type': 'PostalAddress', addressCountry: country } } : {}),
});
// The full Organization node (About.tsx emits this alongside the AboutPage, so
// the entity is complete on the page that is *about* the publisher). Localized
// description; everything else is stable identity.
const organizationLd = (bundle) => ({
  '@context': CTX,
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Fly GACA',
  legalName: 'BDA Company International',
  alternateName: 'شركة بدع الدولية',
  url: SITE,
  logo: `${SITE}/img/icon-512.png`,
  description: tIn(bundle, 'metaDesc.about'),
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Riyadh',
    postalCode: '12965',
    addressCountry: 'SA',
  },
  areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
  identifier: { '@type': 'PropertyValue', propertyID: 'SA-CR', value: '7030976893' },
  vatID: '311415259500003',
  taxID: '311415259500003',
  sameAs: [
    'https://x.com/flygacax',
    'https://www.snapchat.com/@flygaca',
    'https://www.facebook.com/flygaca',
    'https://www.instagram.com/flygaca',
    'https://www.linkedin.com/company/flygaca',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'i@flygaca.com',
    contactType: 'customer support',
    availableLanguage: ['en', 'ar'],
  },
});
const breadcrumbLd = (items, lang = 'en') => ({
  '@context': CTX,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: canonicalUrl(c.path, lang),
  })),
});
const itemListLd = (items, lang = 'en') => ({
  '@context': CTX,
  '@type': 'ItemList',
  numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    url: canonicalUrl(it.path, lang),
  })),
});
const faqLd = (items) => ({
  '@context': CTX,
  '@type': 'FAQPage',
  mainEntity: items.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});
const definedTermSetLd = ({ name, description, path, terms, lang = 'en' }) => {
  const url = canonicalUrl(path, lang);
  return {
    '@context': CTX,
    '@type': 'DefinedTermSet',
    name,
    ...(description ? { description } : {}),
    url,
    inLanguage: lang,
    hasDefinedTerm: terms.map((tm) => ({
      '@type': 'DefinedTerm',
      name: tm.term,
      description: tm.def,
      inDefinedTermSet: url,
    })),
  };
};
const aboutPageLd = ({ title, description, path, lang = 'en' }) => ({
  '@context': CTX,
  '@type': 'AboutPage',
  name: title,
  ...(description ? { description } : {}),
  url: canonicalUrl(path, lang),
  inLanguage: lang,
  isPartOf: { '@id': SITE_ID },
  mainEntity: { '@id': ORG_ID },
  publisher: orgNode(),
});

/**
 * The crumb trail for a static route, mirroring what the page renders. Library
 * leaves sit under the Library hub; everything else is Home → page. Kept in step
 * with the visible <Breadcrumbs/> so the structured trail and the on-page one
 * never disagree.
 */
function crumbsFor(norm, title, bundle) {
  const home = { name: tIn(bundle, 'nav.breadcrumbHome'), path: '/' };
  if (norm.startsWith('/library/'))
    return [home, { name: tIn(bundle, 'nav.library'), path: '/library' }, { name: title, path: norm }];
  return [home, { name: title, path: norm }];
}

// Pages whose visible copy is a genuine Q&A block (mirrors the runtime call
// sites). The FAQPage node must quote the same text the page shows, so each key
// points at the exact array the component renders.
const FAQ_KEYS = {
  '/': 'home.adel.demos',
  '/about': 'about.faq',
  '/pricing': 'pricing.faq',
  '/schools': 'schools.faq',
  '/support': 'support.faq',
};

// The self-paced, GACAR-grounded study modes are Courses (mirrors src/pages/study/*).
const COURSE_ROUTES = new Set([
  '/study/quiz',
  '/study/flashcards',
  '/study/groundschool',
  '/study/exam',
  '/study/paths',
]);

// --- Build the route → SEO descriptor maps -------------------------------------
const en = readJson('src/i18n/en.json');
// Arabic bundle drives the parallel `arSeo` map — the crawler-facing Arabic
// snapshots written to dist/ar/<path>/index.html. Arabic meta is authored (never
// machine-translated), so we read the same keys straight from ar.json.
const ar = readJson('src/i18n/ar.json');
const tIn = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// Arabic defaults for content routes that carry no i18n meta key (legal/util
// pages). English keeps its constant defaults above.
const DEFAULT_TITLE_AR = tIn(ar.meta, 'home') ?? DEFAULT_TITLE;
const DEFAULT_DESC_AR = tIn(ar.metaDesc, 'home') ?? DEFAULT_DESC;

// Arabic descriptors for the covered set (static + tools + guides + top library
// docs). Long-tail corpus stays English-only, capped by AR_CORPUS_MAX — the SAME
// cap scripts/build-sitemap.mjs uses, so head-hreflang and sitemap-hreflang agree.
const AR_CORPUS_MAX = Number(process.env.AR_CORPUS_MAX ?? 60);

const PRIVATE = new Set([
  '/account',
  '/dashboard',
  '/currency',
  '/logbook',
  '/records',
  '/settings',
  '/checkout',
  '/checkout/return',
  // Cohort dashboard for school admins — the page itself calls useNoindexMeta,
  // so snapshotting it would ship a crawlable copy of a noindex route.
  '/business/admin',
]);
// /signin and /signup redirect to /account — keep them out of the snapshots too.
// /hud redirects to /tools now the Airspace HUD is retired (docs/DESIGN-airspace-hud-v2.md);
// the hosts' SPA fallback still serves it, so the client router does the redirect.
const REDIRECTS = new Set(['/guides', '/study', '/signin', '/signup', '/hud']);

// Static pages: route → the i18n keys its copy comes from. A bare string is the
// common case — the key under `<bundle>.meta` / `<bundle>.metaDesc`. Pages whose
// runtime copy lives elsewhere (legal, support) name their keys explicitly so the
// snapshot ships the SAME strings usePageMeta sets after hydration.
const LEGAL_DOCS = ['disclaimer', 'terms', 'privacy', 'refund', 'safety'];
// Mirrors LAST_UPDATED in src/pages/legal/LegalPage.tsx.
const LEGAL_UPDATED = '2026-07-27';
const STATIC_META = {
  '/': 'home',
  '/library': 'library',
  '/library/charts': 'charts',
  '/library/map': 'libraryMap',
  '/library/glossary': 'glossary',
  '/tools': 'tools',
  '/chat': 'chat',
  '/learn': 'learn',
  '/pricing': 'pricing',
  '/schools': 'schools',
  '/developers': 'developers',
  '/about': 'about',
  '/updates': 'updates',
  '/offline': 'offline',
  // SupportPage renders `support.intro` as its description, not metaDesc.support.
  '/support': { titleKey: 'support.title', descKey: 'support.intro' },
  '/study/quiz': 'quiz',
  '/study/flashcards': 'flashcards',
  '/study/groundschool': 'groundschool',
  '/study/exam': 'exam',
  '/study/paths': 'paths',
  '/study/packs': 'packs',
  '/study/sheets': 'sheets',
  ...Object.fromEntries(
    LEGAL_DOCS.map((doc) => [
      `/${doc}`,
      { titleKey: `legal.${doc}.title`, descKey: `legal.${doc}.intro`, dateModified: LEGAL_UPDATED },
    ]),
  ),
};

// Route sources are enumerated once — the *routes* are identical across languages;
// only the copy (from the bundle) and the JSON-LD url/inLanguage (from `lang`) differ.
const routerPaths = [...read('src/router.tsx').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
const toolIds = [
  ...read('src/lib/tools.ts').matchAll(/\bt\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*'live'/g),
].map((m) => m[1]);
const guidesSrc = read('src/pages/guides/guides.ts');
const guideSlugs = [
  ...guidesSrc.match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g),
].map((m) => m[1]);
const draftGuides = new Set(
  [...(guidesSrc.match(/GUIDE_STATUS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '').matchAll(/'([^']+)':\s*'draft'/g)].map(
    (m) => m[1],
  ),
);
// LIVE packs only — `soon` packs have no detail route (mirrors build-sitemap.mjs).
const livePackIds = [
  ...read('src/lib/prepCatalog.ts').matchAll(/\bid:\s*'([^']+)'[\s\S]*?status:\s*'([^']+)'/g),
]
  .filter((m) => m[2] === 'live')
  .map((m) => m[1]);
// Review dates from GUIDE_UPDATED (src/pages/guides/guides.ts) — same table the
// sitemap reads for <lastmod>, so freshness signals agree across the two.
const guideUpdated = Object.fromEntries(
  [
    ...(guidesSrc.match(/GUIDE_UPDATED[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '').matchAll(
      /'([^']+)':\s*'(\d{4}-\d{2}-\d{2})'/g,
    ),
  ].map((m) => [m[1], m[2]]),
);

/**
 * Content/UI descriptors (static pages + tools + guides) for one language bundle.
 * Titles/descriptions come from `bundle`; JSON-LD url + inLanguage from `lang`.
 * The library reader corpus is English-only and appended separately (its bodies
 * are regulation text — see SEO-PLAN 0.3 route scope).
 * @returns {Map<string, {title?:string, description?:string, jsonLd?:object, ogType?:string}>}
 */
function contentDescriptors(bundle, lang) {
  const map = new Map();
  const put = (path, desc) => map.set(normalizePath(path), desc);

  for (const p of routerPaths) {
    if (p.includes(':') || p === '*') continue;
    const norm = normalizePath(p === '/' ? '/' : `/${p.replace(/^\//, '')}`);
    if (PRIVATE.has(norm) || REDIRECTS.has(norm)) continue;
    const entry = STATIC_META[norm];
    const spec = typeof entry === 'string' ? { titleKey: `meta.${entry}`, descKey: `metaDesc.${entry}` } : entry;
    const title = spec ? tIn(bundle, spec.titleKey) : undefined;
    const description = spec ? tIn(bundle, spec.descKey) : undefined;

    // Every node the runtime emits for this route, so the no-JS floor carries the
    // same graph a JS client gets — breadcrumbs and FAQs especially, which used
    // to exist only after hydration (i.e. never, for the crawlers that matter).
    const ld = [];
    if (COURSE_ROUTES.has(norm)) ld.push(courseLd({ title, description, path: norm, lang }));
    if (spec?.dateModified)
      ld.push(articleLd('Article', { title, description, path: norm, lang, dateModified: spec.dateModified }));
    if (norm === '/about') {
      ld.push(aboutPageLd({ title, description, path: norm, lang }));
      ld.push(organizationLd(bundle));
    }
    const faqItems = FAQ_KEYS[norm] ? tIn(bundle, FAQ_KEYS[norm]) : undefined;
    if (Array.isArray(faqItems) && faqItems.length && faqItems.every((x) => x?.q && x?.a))
      ld.push(faqLd(faqItems));
    if (norm === '/library/glossary') {
      const terms = tIn(bundle, 'glossary.terms');
      if (Array.isArray(terms) && terms.length)
        ld.push(
          definedTermSetLd({
            name: tIn(bundle, 'glossary.title'),
            description,
            path: norm,
            terms,
            lang,
          }),
        );
    }
    // Hub pages enumerate their leaves, so a crawler reads them as a catalog
    // rather than a wall of links (mirrors ToolsIndex/LearnHub at runtime).
    if (norm === '/tools')
      ld.push(
        itemListLd(
          toolIds.map((id) => ({ name: tIn(bundle, `tools.items.${id}.name`), path: `/tools/${id}` })),
          lang,
        ),
      );
    if (norm === '/learn')
      ld.push(
        itemListLd(
          guideSlugs
            .filter((slug) => !draftGuides.has(slug))
            .map((slug) => ({
              name: tIn(bundle, `guides.items.${slug}.name`),
              path: `/guides/${slug}`,
            })),
          lang,
        ),
      );
    if (norm !== '/' && title) ld.push(breadcrumbLd(crumbsFor(norm, title, bundle), lang));

    put(norm, { title, description, ...(ld.length ? { jsonLd: ld } : {}) });
  }

  for (const id of toolIds) {
    const path = `/tools/${id}`;
    const title = tIn(bundle, `tools.items.${id}.name`);
    const description = tIn(bundle, `tools.items.${id}.blurb`);
    put(path, {
      title,
      description,
      jsonLd: [
        softwareAppLd({ title, description, path, lang }),
        breadcrumbLd(
          [
            { name: tIn(bundle, 'nav.breadcrumbHome'), path: '/' },
            { name: tIn(bundle, 'nav.tools'), path: '/tools' },
            { name: title, path },
          ],
          lang,
        ),
      ],
    });
  }

  for (const slug of guideSlugs) {
    if (draftGuides.has(slug)) continue;
    const path = `/guides/${slug}`;
    const title = tIn(bundle, `guides.items.${slug}.name`);
    const description = tIn(bundle, `guides.items.${slug}.blurb`);
    const faqs = tIn(bundle, `guides.items.${slug}.faqs`);
    put(path, {
      title,
      description,
      jsonLd: [
        articleLd('Article', { title, description, path, lang, dateModified: guideUpdated[slug] }),
        breadcrumbLd(
          [
            { name: tIn(bundle, 'nav.breadcrumbHome'), path: '/' },
            { name: tIn(bundle, 'nav.learn'), path: '/learn' },
            { name: title, path },
          ],
          lang,
        ),
        ...(Array.isArray(faqs) && faqs.length ? [faqLd(faqs)] : []),
      ],
      ogType: 'article',
    });
  }

  // Exam-prep pack detail pages. Their copy is authored in both bundles
  // (study.packCatalog.<id>), so unlike the aerodromes these are bilingual —
  // mirrors src/pages/study/PackDetail.tsx.
  for (const id of livePackIds) {
    const path = `/study/packs/${id}`;
    const title = tIn(bundle, `study.packCatalog.${id}.name`);
    const description = tIn(bundle, `study.packCatalog.${id}.desc`);
    put(path, { title, description, jsonLd: courseLd({ title, description, path, lang }) });
  }

  // Every indexable route must resolve real copy. One that doesn't would ship the
  // homepage title + description on its own URL — duplicate meta across the site,
  // invisible unless someone opens the snapshot. Checked after every source has
  // contributed (tools/guides/packs supply their own titles), so this only fires
  // for a route nothing covers.
  const missing = [...map].filter(([, d]) => !d.title).map(([path]) => path);
  if (missing.length) {
    console.error(
      `prerender-head: no ${lang} title for ${missing.length} route(s): ${missing.join(', ')}\n` +
        '  Add a STATIC_META entry (and the i18n keys in BOTH bundles), or list the route as PRIVATE/REDIRECT.',
    );
    process.exit(1);
  }
  return map;
}

/**
 * Library reader corpus → title, per-doc description + TechArticle, for one
 * language. The regulation *bodies* are English either way, but the Arabic
 * snapshot must still self-describe as Arabic: its own `/ar` URL, `inLanguage:
 * 'ar'` and the Arabic verify-at-GACA line — otherwise dist/ar/library/* ships
 * English JSON-LD under an `<html lang="ar">` document.
 */
function corpusDescriptors(bundle, lang) {
  const map = new Map();
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
  // Same template src/pages/library/Document.tsx feeds usePageMeta, so the
  // snapshot description matches the hydrated one byte for byte (and every doc
  // gets its own, instead of them all sharing the site default).
  const verify = tIn(bundle, 'document.verifyAtGaca');
  for (const [base, file] of [
    ['/library', 'public/data/gacar-index.json'],
    ['/library/reference', 'public/data/reference-index.json'],
    ['/library/handbook', 'public/data/ebooks-index.json'],
  ]) {
    const idx = readJson(file);
    // Fall back to the index's generated date when a doc carries no date-shaped
    // effectiveDate/revision — mirrors src/pages/library/Document.tsx at runtime.
    const fallback = isDate(idx.generated) ? idx.generated.slice(0, 10) : undefined;
    for (const d of idx.documents) {
      const path = `${base}/${d.slug}`;
      const dateModified = isDate(d.effectiveDate)
        ? d.effectiveDate.slice(0, 10)
        : isDate(d.revision)
          ? d.revision.slice(0, 10)
          : fallback;
      const description = `${d.title} — ${verify}`;
      map.set(normalizePath(path), {
        title: d.title,
        description,
        jsonLd: articleLd('TechArticle', { title: d.title, description, path, lang, dateModified }),
        ogType: 'article',
      });
    }
  }
  return map;
}

const LABEL = 'prerender-head';
// Only ICAOs the runtime can actually resolve: AerodromeDetail looks the code up
// in airports.json, then airports-extra.json, and renders a noindex "not found"
// page when neither has it. A curated ICAO missing from both would otherwise be
// advertised in the sitemap and snapshotted as a dead URL, so drop it here —
// loudly, since it means the aerodrome index and the airport data have drifted.
function resolvableIcaos() {
  const known = new Set(
    ['public/data/airports.json', 'public/data/airports-extra.json'].flatMap((f) =>
      readJson(f).airports.map((a) => a.icao),
    ),
  );
  const all = readJson('public/data/aerodromes-index.json').documents;
  const missing = all.filter((d) => !known.has(d.icao)).map((d) => d.icao);
  if (missing.length)
    console.warn(
      `${LABEL}: ${missing.length} curated aerodrome(s) not in airports data — skipped: ${missing.join(', ')}`,
    );
  return all.filter((d) => known.has(d.icao));
}

/**
 * Aerodrome detail pages (English only, like the sitemap's en/x-default-only
 * entries for them). Copy mirrors src/pages/tools/procedures/AerodromeDetail.tsx:
 * the CalcShell title is `ICAO — name` and its `intro` (the description) is
 * "city, country". Facts come from airports.json, falling back to the curated
 * index for the handful of fields it alone carries.
 */
function aerodromeDescriptors() {
  const map = new Map();
  const byIcao = new Map(readJson('public/data/airports.json').airports.map((a) => [a.icao, a]));
  for (const d of resolvableIcaos()) {
    const a = byIcao.get(d.icao);
    const name = a?.name_en ?? d.name;
    const city = a?.city_en ?? d.city;
    const country = a?.country_en ?? d.country;
    const path = `/tools/aerodromes/${d.icao}`;
    map.set(normalizePath(path), {
      title: `${d.icao} — ${name}`,
      description: [city, country].filter(Boolean).join(', ') || undefined,
      jsonLd: airportLd({
        name,
        icao: d.icao,
        iata: a?.iata || d.iata,
        path,
        lat: a?.lat ?? d.lat,
        lon: a?.lon ?? d.lon,
        elevationFt: a?.elev_ft ?? d.elevation_ft,
        country,
      }),
    });
  }
  return map;
}

// English = content + all corpus (clean paths). Arabic = content + the top
// AR_CORPUS_MAX corpus docs, in the same parts→reference→handbook order — matching
// exactly the hreflang=ar set scripts/build-sitemap.mjs emits (the Arabic snapshot
// wraps the English GACAR text in Arabic chrome + RTL; check-prerender.mjs gates it).
const corpusEn = corpusDescriptors(en, 'en');
const corpusAr = corpusDescriptors(ar, 'ar');
const enSeo = new Map([...contentDescriptors(en, 'en'), ...corpusEn, ...aerodromeDescriptors()]);
const arSeo = contentDescriptors(ar, 'ar');
let arCorpusCount = 0;
for (const [path, desc] of corpusAr) {
  if (arCorpusCount >= AR_CORPUS_MAX) break;
  arSeo.set(path, desc);
  arCorpusCount++;
}

// --- Head transform ------------------------------------------------------------
/** Replace a tag matching `re` with `tag`, or insert `tag` before </head> if absent. */
// Matches the `ar` and `ar-SA` alternates (and any leading whitespace), so an
// uncovered route ships no Arabic alternate at all rather than the shell's.
const AR_ALTERNATE_RE = /\s*<link\s+rel="alternate"\s+hreflang="ar(?:-SA)?"[^>]*>/g;

function setTag(html, re, tag) {
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

// The Arabic home hero, built from ar.json (mirrors the English shell hero, whose
// copy tracks en.home.*). CTAs point at the Arabic documents so the Arabic home's
// internal links keep the crawler inside the Arabic set.
function arHero() {
  const h = ar.home;
  return `<div id="app-shell">
        <div class="s-inner">
          <p class="s-eyebrow">${esc(h.eyebrow)}</p>
          <h1>${esc(h.title)}</h1>
          <p class="s-sub">${esc(h.subtitle)}</p>
          <div class="s-cta">
            <a class="s-btn primary" href="/ar/library">${esc(h.ctaLibrary)}</a>
            <a class="s-btn ghost" href="/ar/chat">${esc(h.ctaChat)}</a>
          </div>
        </div>
      </div>`;
}

function render(path, d, lang = 'en') {
  const isAr = lang === 'ar';
  const fullTitle = d.title
    ? `${d.title} — ${SUFFIX}`
    : isAr
      ? DEFAULT_TITLE_AR
      : DEFAULT_TITLE;
  const desc = d.description ?? (isAr ? DEFAULT_DESC_AR : DEFAULT_DESC);
  // In Arabic the page self-canonicalizes to its own `/ar` document; x-default
  // always targets the clean, param-free URL.
  const canonical = canonicalUrl(path, lang);
  let html = shell;

  // Flip the document to Arabic/RTL so a no-JS crawler reads the /ar page as Arabic.
  if (isAr) html = html.replace(/<html[^>]*>/, '<html lang="ar" dir="rtl">');

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = setTag(
    html,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(desc)}" />`,
  );
  html = setTag(html, /<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
  // The hreflang cluster, gated on whether an Arabic document actually exists.
  //
  // Arabic covers the hubs, guides, tools and the top AR_CORPUS_MAX corpus docs;
  // the long tail and the aerodrome pages are English-only by design. Advertising
  // hreflang="ar" for a document that was never written points crawlers at a URL
  // with no object behind it, and Google discards the WHOLE cluster for the site
  // when the return tags don't resolve — including the ~170 pages where it is
  // correct. This must stay byte-identical to alternates() in build-sitemap.mjs,
  // which has always gated on the same set.
  const hasAr = arSeo.has(path);
  for (const [hreflang, href] of [
    ['en', canonicalUrl(path, 'en')],
    // Saudi Arabia is the primary market; bare `ar` stays for Arabic speakers
    // elsewhere (mirrors hreflangAlternates in src/lib/seo/seo.ts).
    ...(hasAr
      ? [
        ['ar', canonicalUrl(path, 'ar')],
        ['ar-SA', canonicalUrl(path, 'ar')],
      ]
      : []),
    ['x-default', canonicalUrl(path, 'en')],
  ]) {
    html = setTag(
      html,
      new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${hreflang}"[^>]*>`),
      `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`,
    );
  }
  // index.html ships a baseline `ar`/`ar-SA` pair for the home route, so an
  // uncovered route inherits it unless it is removed — setTag only rewrites tags,
  // it never deletes them.
  if (!hasAr) html = html.replace(AR_ALTERNATE_RE, '');

  const image = ogImageFor(path);
  html = setTag(html, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${d.ogType ?? 'website'}" />`);
  html = setTag(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(fullTitle)}" />`);
  html = setTag(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`);
  html = setTag(html, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  html = setTag(html, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`);
  // Both languages declare their locale, matching what usePageMeta sets at
  // runtime — so a scraper files the Arabic document under ar_SA and the English
  // one under en_US instead of guessing.
  html = setTag(html, /<meta\s+property="og:locale"[^>]*>/, `<meta property="og:locale" content="${ogLocale(lang)}" />`);
  // Explicit Twitter tags mirror the Open Graph values (see usePageMeta).
  html = setTag(html, /<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(fullTitle)}" />`);
  html = setTag(html, /<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(desc)}" />`);
  html = setTag(html, /<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${image}" />`);

  if (d.jsonLd) {
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json" data-managed-ld>${JSON.stringify(d.jsonLd)}</script>\n  </head>`,
    );
  }

  // Strip the home hero on non-home routes so crawlers don't read homepage
  // content on every path (the runtime script does the same once JS runs). On the
  // Arabic home, swap the English hero for the Arabic one.
  if (normalizePath(path) !== '/') {
    html = html.replace(/<div id="app-shell">[\s\S]*?<\/script>\s*/, '');
  } else if (isAr) {
    html = html.replace(/<div id="app-shell">[\s\S]*?<\/script>\s*/, arHero());
  }
  return html;
}

// Arabic siblings live at dist/ar/<path>/index.html — the real per-language
// documents Firebase can route to (it strips `?lang=`, so the query variant can
// never be a distinct file). These are the crawler-facing Arabic bodies;
// scripts/prerender.mjs later overwrites them with hydrated content where a
// browser is available.
/** Write a descriptor map to dist, under /ar for Arabic. Returns the count. */
function writeSnapshots(map, lang) {
  const arDir = lang === 'ar';
  let n = 0;
  for (const [path, d] of map) {
    let file;
    if (path === '/') {
      file = arDir ? join(root, 'dist/ar/index.html') : shellPath;
    } else {
      const rel = path.replace(/^\//, '');
      file = arDir
        ? join(root, 'dist/ar', rel, 'index.html')
        : join(root, 'dist', rel, 'index.html');
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, render(path, d, lang));
    n++;
  }
  return n;
}

const enWritten = writeSnapshots(enSeo, 'en');
const arWritten = writeSnapshots(arSeo, 'ar');
console.log(
  `prerender-head: wrote ${enWritten} en + ${arWritten} ar route snapshots (origin ${SITE})`,
);
