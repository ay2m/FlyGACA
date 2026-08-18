/**
 * Prerender coverage guard — fails the build if a URL the sitemap advertises has
 * no real snapshot behind it. A silent prerender skip means invisible content, so
 * this turns that into a hard error rather than a quiet SEO regression.
 *
 * It reads the built sitemap (dist/sitemap.xml) as the source of truth and, for
 * every `<url>` that declares an `hreflang="ar"` alternate (i.e. every route we
 * promise a bilingual document for), asserts BOTH sides exist on disk:
 *   - the English floor  dist/<path>/index.html      contains `<html lang="en"`
 *   - the Arabic sibling dist/ar/<path>/index.html    contains `lang="ar"` + `dir="rtl"`
 *
 * URLs without an `ar` alternate (dynamic aerodrome/pack detail pages, long-tail
 * corpus past AR_CORPUS_MAX) are intentionally not prerendered, so they're skipped
 * — the guard validates exactly the set the sitemap claims coverage for, keeping
 * head-hreflang, sitemap-hreflang and the on-disk snapshots in lockstep.
 *
 * Runs inside `npm run build` (after prerender-head.mjs), so every build + deploy
 * is gated. Node-only, no browser.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL ?? 'https://flygaca.com').replace(/\/$/, '');

const distDir = join(root, 'dist');
const sitemapPath = existsSync(join(distDir, 'sitemap.xml'))
  ? join(distDir, 'sitemap.xml')
  : join(root, 'public/sitemap.xml');

if (!existsSync(distDir) || !existsSync(sitemapPath)) {
  console.error('check-prerender: dist/ or sitemap.xml missing — run after `npm run build`.');
  process.exit(1);
}

const xml = readFileSync(sitemapPath, 'utf8');

/** Origin-absolute URL → dist file path for its snapshot (clean-URL → /index.html). */
const fileForUrl = (url) => {
  const path = url.slice(SITE.length) || '/';
  return path === '/' ? join(distDir, 'index.html') : join(distDir, path.replace(/^\//, ''), 'index.html');
};

const missing = [];
const wrongLang = [];
let checked = 0;

// Walk each <url> block; only those advertising an Arabic alternate are in scope.
for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  const arHref = block.match(/hreflang="ar"\s+href="([^"]+)"/)?.[1];
  if (!loc || !arHref) continue;
  checked++;

  // English floor must exist and be an English document.
  const enFile = fileForUrl(loc);
  if (!existsSync(enFile)) missing.push(`en  ${loc} → ${enFile.slice(root.length + 1)}`);
  else if (!readFileSync(enFile, 'utf8').includes('lang="en"'))
    wrongLang.push(`en  ${loc} (expected lang="en")`);

  // Arabic sibling must exist and actually be Arabic + RTL (not the English shell).
  const arFile = fileForUrl(arHref);
  if (!existsSync(arFile)) {
    missing.push(`ar  ${arHref} → ${arFile.slice(root.length + 1)}`);
  } else {
    const html = readFileSync(arFile, 'utf8');
    if (!html.includes('lang="ar"') || !html.includes('dir="rtl"'))
      wrongLang.push(`ar  ${arHref} (expected lang="ar" dir="rtl")`);
  }
}

if (checked === 0) {
  console.error('check-prerender: no `hreflang="ar"` alternates found in the sitemap — coverage lost.');
  process.exit(1);
}

if (missing.length || wrongLang.length) {
  console.error(`check-prerender: FAILED — ${missing.length} missing, ${wrongLang.length} wrong-language snapshot(s):`);
  for (const m of [...missing, ...wrongLang]) console.error(`  ✗ ${m}`);
  process.exit(1);
}

console.log(`check-prerender: OK — ${checked} bilingual routes have both en + ar snapshots.`);
