/**
 * Prerender coverage gate: every URL the sitemap promises to search engines must
 * exist in dist/ as *body-prerendered* HTML — not just the head-only snapshot.
 *
 * Why this exists (SEO-PLAN item 0.2): the AI crawlers that decide citations
 * (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) don't execute JavaScript, so
 * a page whose dist HTML lacks real body content does not exist to them. The
 * body prerender (scripts/prerender.mjs) is deliberately non-fatal — a Chromium
 * hiccup must never brick a deploy — which means, without this check, a coverage
 * regression (route cap exceeded, a route timing out, a new sitemap section the
 * prerenderer doesn't enumerate) ships silently. This script is the loud part:
 * it runs in the deploy path AFTER `npm run prerender` and fails the deploy when
 * the sitemap and the prerendered output disagree.
 *
 * Detection: prerender.mjs waits for the app's <footer> before snapshotting, and
 * the head-only floor (prerender-head.mjs) never emits one — so `<footer` in the
 * file is the "real body content" marker. Query-string hreflang variants
 * (?lang=en/ar) share the canonical file and are out of scope here (see
 * SEO-PLAN item 0.3 for Arabic body crawlability).
 *
 * Escape hatch: PRERENDER_COVERAGE_LENIENT=1 downgrades failures to warnings —
 * for emergency deploys only; the gap it hides is real and stays in production.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// The sitemap that actually shipped (dist/) is the contract; fall back to
// public/ so the script can also run standalone before a build copies it.
const sitemapPath = ['dist/sitemap.xml', 'public/sitemap.xml']
  .map((p) => join(root, p))
  .find((p) => existsSync(p));
if (!sitemapPath) {
  console.error(
    'check-prerender-coverage: no sitemap.xml found in dist/ or public/ — run the build first.',
  );
  process.exit(1);
}

const paths = [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname.replace(/\/$/, '') || '/')
  .sort();

const fileFor = (route) =>
  route === '/' ? join(dist, 'index.html') : join(dist, route.replace(/^\//, ''), 'index.html');

const missing = []; // no snapshot at all
const headOnly = []; // snapshot exists but has no rendered body
for (const route of paths) {
  const file = fileFor(route);
  if (!existsSync(file)) missing.push(route);
  else if (!readFileSync(file, 'utf8').includes('<footer')) headOnly.push(route);
}

// Drift the other way (body-prerendered routes the sitemap doesn't list, e.g.
// draft guides) is deliberate for some routes — report a count, never fail.
let extra = 0;
const inSitemap = new Set(paths);
(function walk(dir, route) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, `${route}/${name}`);
    else if (
      name === 'index.html' &&
      !inSitemap.has(route || '/') &&
      readFileSync(p, 'utf8').includes('<footer')
    )
      extra++;
  }
})(dist, '');

const bad = missing.length + headOnly.length;
const list = (label, arr) => {
  if (!arr.length) return;
  console.error(`  ${label} (${arr.length}):`);
  for (const r of arr.slice(0, 20)) console.error(`    ${r}`);
  if (arr.length > 20) console.error(`    … and ${arr.length - 20} more`);
};

console.log(
  `check-prerender-coverage: ${paths.length} sitemap URLs — ${paths.length - bad} body-prerendered, ` +
    `${headOnly.length} head-only, ${missing.length} missing` +
    (extra ? ` (+${extra} prerendered routes not in the sitemap — informational)` : ''),
);

if (bad > 0) {
  list('MISSING snapshot', missing);
  list('HEAD-ONLY (no rendered body — invisible to AI crawlers)', headOnly);
  console.error(
    '\n  Every sitemap URL must carry real body content for non-JS crawlers.\n' +
      '  Likely causes: PRERENDER_MAX too low for the corpus, a route timing out\n' +
      '  in scripts/prerender.mjs, or a sitemap section the prerenderer does not\n' +
      '  enumerate (keep build-sitemap.mjs and prerender.mjs route sets in sync).',
  );
  if (process.env.PRERENDER_COVERAGE_LENIENT) {
    console.warn('check-prerender-coverage: LENIENT set — shipping WITH the gap above.');
  } else {
    process.exit(1);
  }
}
