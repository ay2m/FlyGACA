/**
 * Generate public/sitemap.xml + public/robots.txt from the single route table
 * (src/router.tsx) plus the content indexes. Static routes are emitted as-is;
 * the dynamic library/guide routes are expanded from their data. Runs before
 * `vite build` so the fresh files get copied out of public/ into dist/.
 *
 * Override the canonical origin with SITE_URL (defaults to the product domain).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL ?? 'https://flygaca.com').replace(/\/$/, '');

const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// Every `path: '...'` from the route table — the single source of truth.
const routerPaths = [...read('src/router.tsx').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);

// Session-gated, user-private routes carry no SEO value — keep them out.
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
// The former Guides + Study hubs now redirect to /learn — don't index the redirects
// (their content + leaf pages live on, and `/learn` carries the hub priority).
// /signin and /signup redirect to /account — the same treatment.
const REDIRECTS = new Set(['/guides', '/study', '/signin', '/signup']);
const norm = (p) => (p === '/' ? '/' : `/${p.replace(/^\//, '')}`);

const today = new Date().toISOString().slice(0, 10);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);

const staticPaths = routerPaths
  .filter((p) => !p.includes(':') && p !== '*')
  .map(norm)
  .filter((p) => !PRIVATE.has(p) && !REDIRECTS.has(p));
// url -> lastmod (ISO date). Default everything to the build date; corpus pages
// override with their own freshness signal below.
const urls = new Map(['/', ...staticPaths].map((p) => [p, today]));

// The set of URLs with a real Arabic snapshot (dist/ar/<path>/index.html) — the
// only URLs allowed to declare an `hreflang="ar"` alternate. It mirrors
// scripts/prerender-head.mjs exactly: home + all static routes + guides, plus the
// top AR_CORPUS_MAX corpus docs in parts→reference→handbook order (dynamic detail
// pages — aerodromes, packs — are not prerendered, so they stay en/x-default only).
// Keep AR_CORPUS_MAX identical in both scripts or scripts/check-prerender.mjs fails.
const AR_CORPUS_MAX = Number(process.env.AR_CORPUS_MAX ?? 60);
const arCovered = new Set(['/', ...staticPaths]);

// Expand the dynamic routes we can enumerate from data, dating each entry from
// the source document's effectiveDate/revision (or the index's generated date).
const corpora = [
  ['/library', 'public/data/gacar-index.json'],
  ['/library/reference', 'public/data/reference-index.json'],
  ['/library/handbook', 'public/data/ebooks-index.json'],
];
let arCorpusCount = 0;
for (const [base, file] of corpora) {
  const idx = readJson(file);
  const fallback = isDate(idx.generated) ? idx.generated.slice(0, 10) : today;
  for (const d of idx.documents) {
    const lastmod = isDate(d.effectiveDate)
      ? d.effectiveDate.slice(0, 10)
      : isDate(d.revision)
        ? d.revision.slice(0, 10)
        : fallback;
    const u = `${base}/${d.slug}`;
    urls.set(u, lastmod);
    if (arCorpusCount < AR_CORPUS_MAX) {
      arCovered.add(u);
      arCorpusCount++;
    }
  }
}

const guidesSrc = read('src/pages/guides/guides.ts');
const guideSlugs = [
  ...guidesSrc.match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g),
].map((m) => m[1]);
// Drafts are unlisted — omit any guide whose GUIDE_STATUS entry is 'draft'.
const draftGuides = new Set(
  [
    ...(guidesSrc.match(/GUIDE_STATUS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '').matchAll(
      /'([^']+)':\s*'draft'/g,
    ),
  ].map((m) => m[1]),
);
for (const slug of guideSlugs) {
  if (!draftGuides.has(slug)) {
    urls.set(`/guides/${slug}`, today);
    arCovered.add(`/guides/${slug}`);
  }
}

// Aerodrome directory → one detail page per curated ICAO (the /tools/aerodromes/:icao
// route resolves each from airports.json). Dated from the index's generated date.
const aero = readJson('public/data/aerodromes-index.json');
const aeroDate = isDate(aero.generated) ? aero.generated.slice(0, 10) : today;
for (const d of aero.documents) urls.set(`/tools/aerodromes/${d.icao}`, aeroDate);

// Prep packs → one detail page per LIVE pack id (src/lib/prepCatalog.ts). Each pack
// literal declares `id: '<id>'` then `status: '<live|soon>'`; `soon` packs have no
// detail route, so only live packs go in the sitemap.
const packSrc = read('src/lib/prepCatalog.ts');
const livePackIds = [...packSrc.matchAll(/\bid:\s*'([^']+)'[\s\S]*?status:\s*'([^']+)'/g)]
  .filter((m) => m[2] === 'live')
  .map((m) => m[1]);
for (const id of livePackIds) urls.set(`/study/packs/${id}`, today);
// Not indexed by design: chart sheets and study sheets (selected by ?param on a
// single viewer page, no per-item URL) and the 1,736 definition terms (search-only).

// Highest-demand regulatory pages: the Part pages the corpus cross-references
// the most, from the real inbound-reference counts in regulations-lookup.json
// (index.referencedBy — how many other Parts cite each Part). Boosting their
// sitemap priority surfaces the load-bearing Parts to crawlers.
// Deliberately NOT emitted: per-section #fragment URLs — search engines
// normalize #fragments away to the base page, so clause-level "demand" is
// expressed as Part-page priority instead. The signal is thin today (the parser
// has processed a handful of Parts); it strengthens automatically as
// content/regulations/*.md grows, with no change here.
let highDemand = new Set();
try {
  const referencedBy = readJson('public/data/regulations-lookup.json').index?.referencedBy ?? {};
  highDemand = new Set(
    Object.entries(referencedBy)
      .filter(([, refs]) => Array.isArray(refs) && refs.length >= 2)
      .map(([slug]) => `/library/${slug}`),
  );
} catch {
  /* the lookup is optional — absent → no boost, sitemap still builds */
}

// Priority tiers: home → hubs / top-cited Parts → reference/guide content → tools → legal → rest.
const HUBS = new Set(['/library', '/tools', '/learn', '/guides', '/study']);
const LEGAL = new Set(['/disclaimer', '/terms', '/privacy', '/refund', '/safety']);
function priority(u) {
  if (u === '/') return '1.0';
  if (HUBS.has(u)) return '0.9';
  if (highDemand.has(u)) return '0.9'; // most cross-referenced Part pages
  if (u.startsWith('/library/') || u.startsWith('/guides/')) return '0.8';
  if (u.startsWith('/tools/')) return '0.7';
  if (LEGAL.has(u)) return '0.3';
  return '0.6';
}

// Per-URL hreflang alternates mirror src/lib/seo/seo.ts: English at the clean URL,
// Arabic at its real `/ar` document (only where a snapshot exists), and x-default
// at the clean URL. Head-hreflang (prerender-head.mjs) must stay byte-identical to
// this — check-prerender.mjs enforces the Arabic side.
const arLoc = (u) => `${SITE}/ar${u === '/' ? '' : u}`;
function alternates(u) {
  const loc = `${SITE}${u}`;
  const arLink = arCovered.has(u)
    ? `<xhtml:link rel="alternate" hreflang="ar" href="${arLoc(u)}"/>`
    : '';
  return (
    `<xhtml:link rel="alternate" hreflang="en" href="${loc}"/>` +
    arLink +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>`
  );
}

const urlEntry = (u, loc, lastmod) =>
  `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>` +
  `<priority>${priority(u)}</priority>${alternates(u)}</url>`;

// The Arabic `<url>` entries mirror `arCovered` exactly — the URLs with a real
// dist/ar/<path> snapshot (home + static + hubs + tools + non-draft guides + the
// top AR_CORPUS_MAX library docs). Iterating the same set keeps the emitted /ar
// locs, their reciprocal hreflang clusters and the on-disk snapshots in lockstep.
const sorted = [...urls.keys()].sort();
const arSorted = [...arCovered].sort();
const body = [
  ...sorted.map((u) => urlEntry(u, `${SITE}${u}`, urls.get(u))),
  ...arSorted.map((u) => urlEntry(u, arLoc(u), urls.get(u) ?? today)),
].join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;

// Fly GACA is an independent, educational Saudi civil-aviation library that wants
// to be crawled and cited. All agents are allowed; the AI answer engines and search
// crawlers below are listed explicitly to document that intent (a bot that matches
// its own group ignores the `*` group, so each must carry its own `Allow: /`). In
// 2026 being uncitable is fatal — never add a `Disallow` here to fence out a bot.
const CITATION_BOTS = [
  'GPTBot', // OpenAI training/index crawler
  'OAI-SearchBot', // ChatGPT search index
  'ChatGPT-User', // ChatGPT live user-triggered fetches
  'ClaudeBot', // Anthropic crawler
  'Claude-Web', // Anthropic live fetches
  'PerplexityBot', // Perplexity index crawler
  'Perplexity-User', // Perplexity live user-triggered fetches
  'Google-Extended', // Gemini / Vertex AI grounding opt-in
  'Applebot-Extended', // Apple Intelligence opt-in
  'Bingbot', // Bing / Copilot
];
const robots = `# Fly GACA — independent educational Saudi civil-aviation library.
# We want to be crawled and cited; every agent is allowed. See scripts/build-sitemap.mjs.
User-agent: *
Allow: /

# AI answer engines & search crawlers — explicitly welcomed (documents intent).
${CITATION_BOTS.map((ua) => `User-agent: ${ua}\nAllow: /\n`).join('\n')}
Sitemap: ${SITE}/sitemap.xml
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml);
writeFileSync(join(root, 'public/robots.txt'), robots);
console.log(
  `sitemap: ${sorted.length} en + ${arSorted.length} ar = ${sorted.length + arSorted.length} URLs (origin ${SITE})`,
);
