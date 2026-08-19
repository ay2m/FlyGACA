/**
 * Browserless head-prerender — the GUARANTEED SEO layer.
 *
 * For every indexable route it writes dist/<route>/index.html: a copy of the
 * built shell with the per-route <head> baked in (title, description, canonical,
 * the en/ar/x-default hreflang set, Open Graph, and a JSON-LD item) and the home
 * hero stripped on non-home routes so a no-JS crawler never sees homepage content
 * on every path. Pure Node string work — no browser — so it runs reliably inside
 * Firebase App Hosting's Cloud Native Buildpack (where headless Chromium can't),
 * and it's part of `npm run build`, so it can never be skipped on a deploy.
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
]);
// /signin and /signup redirect to /account — keep them out of the snapshots too.
// /hud redirects to /tools now the Airspace HUD is retired (docs/DESIGN-airspace-hud-v2.md);
// the hosts' SPA fallback still serves it, so the client router does the redirect.
const REDIRECTS = new Set(['/guides', '/study', '/signin', '/signup', '/hud']);

// Static pages: route → i18n meta key (under <bundle>.meta / .metaDesc). Routes
// not listed still get canonical/hreflang/og injected, just keep the default title.
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
  '/support': 'support',
  '/study/quiz': 'quiz',
  '/study/flashcards': 'flashcards',
  '/study/groundschool': 'groundschool',
  '/study/exam': 'exam',
  '/study/paths': 'paths',
  '/study/packs': 'packs',
  '/study/sheets': 'sheets',
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
    const key = STATIC_META[norm];
    const title = key ? tIn(bundle.meta, key) : undefined;
    const description = key ? tIn(bundle.metaDesc, key) : undefined;
    put(norm, {
      title,
      description,
      ...(COURSE_ROUTES.has(norm)
        ? { jsonLd: courseLd({ title, description, path: norm, lang }) }
        : {}),
    });
  }

  for (const id of toolIds) {
    const path = `/tools/${id}`;
    const title = tIn(bundle, `tools.items.${id}.name`);
    const description = tIn(bundle, `tools.items.${id}.blurb`);
    put(path, { title, description, jsonLd: softwareAppLd({ title, description, path, lang }) });
  }

  for (const slug of guideSlugs) {
    if (draftGuides.has(slug)) continue;
    const path = `/guides/${slug}`;
    const title = tIn(bundle, `guides.items.${slug}.name`);
    const description = tIn(bundle, `guides.items.${slug}.blurb`);
    put(path, {
      title,
      description,
      jsonLd: articleLd('Article', { title, description, path, lang }),
      ogType: 'article',
    });
  }
  return map;
}

/** Library reader corpus (English only) → title (+ revision date) + TechArticle. */
function corpusDescriptors() {
  const map = new Map();
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
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
      map.set(normalizePath(path), {
        title: d.title,
        jsonLd: articleLd('TechArticle', { title: d.title, path, dateModified }),
        ogType: 'article',
      });
    }
  }
  return map;
}

// English = content + all corpus (clean paths). Arabic = content + the top
// AR_CORPUS_MAX corpus docs, in the same parts→reference→handbook order — matching
// exactly the hreflang=ar set scripts/build-sitemap.mjs emits (the Arabic snapshot
// wraps the English GACAR text in Arabic chrome + RTL; check-prerender.mjs gates it).
const corpus = corpusDescriptors();
const enSeo = new Map([...contentDescriptors(en, 'en'), ...corpus]);
const arSeo = contentDescriptors(ar, 'ar');
let arCorpusCount = 0;
for (const [path, desc] of corpus) {
  if (arCorpusCount >= AR_CORPUS_MAX) break;
  arSeo.set(path, desc);
  arCorpusCount++;
}

// --- Head transform ------------------------------------------------------------
/** Replace a tag matching `re` with `tag`, or insert `tag` before </head> if absent. */
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
  // The same hreflang cluster on every language variant: en (clean), ar (/ar),
  // x-default (clean). Mirrors src/lib/seo/seo.ts hreflangAlternates.
  for (const [hreflang, href] of [
    ['en', canonicalUrl(path, 'en')],
    ['ar', canonicalUrl(path, 'ar')],
    ['x-default', canonicalUrl(path, 'en')],
  ]) {
    html = setTag(
      html,
      new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${hreflang}"[^>]*>`),
      `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`,
    );
  }
  const image = ogImageFor(path);
  html = setTag(html, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${d.ogType ?? 'website'}" />`);
  html = setTag(html, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(fullTitle)}" />`);
  html = setTag(html, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`);
  html = setTag(html, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  html = setTag(html, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`);
  // The Arabic snapshot declares its locale so scrapers file it under ar_SA (the
  // English default already omits og:locale; usePageMeta sets it at runtime).
  if (isAr) html = setTag(html, /<meta\s+property="og:locale"[^>]*>/, `<meta property="og:locale" content="${ogLocale(lang)}" />`);
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
