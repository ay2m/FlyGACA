#!/usr/bin/env node
/**
 * IndexNow ping — tell participating search engines (Bing, Yandex, Seznam,
 * Naver, …) that our URLs changed, the moment a deploy lands, instead of waiting
 * for the next crawl. One POST with the full URL set from the built sitemap.
 *
 * DARK BY DEFAULT: without an INDEXNOW_KEY it no-ops (logs + exits 0), exactly
 * like the Slack-notify step. Activating it is owner-side and two things:
 *   1. set the `INDEXNOW_KEY` Actions secret (any 8–128 hex-ish string), and
 *   2. host that key as `https://flygaca.com/<key>.txt` (a text file whose only
 *      content is the key) so IndexNow can verify ownership.
 * Google does not use IndexNow, so this complements — never replaces — the
 * sitemap + normal crawling.
 *
 * FAIL-OPEN: a network/API error is logged and swallowed (exit 0). A search-ping
 * must never fail a production deploy. Node-only, no deps. Pure helpers exported
 * for tests/indexnow.test.ts.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** Extract every <loc> URL from a sitemap XML string. */
export function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);
}

/**
 * Build the IndexNow request body. Only URLs on `host` are submitted (the API
 * rejects a mixed-host list), deduped, and capped at the 10,000/request limit.
 */
export function buildPayload({ site, key, urls }) {
  const host = new URL(site).host;
  const onHost = [...new Set(urls)].filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  return {
    host,
    key,
    keyLocation: `${site.replace(/\/$/, '')}/${key}.txt`,
    urlList: onHost.slice(0, 10000),
  };
}

// --- CLI ---------------------------------------------------------------------
function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMain()) {
  const key = (process.env.INDEXNOW_KEY ?? '').trim();
  const site = (process.env.SITE_URL ?? 'https://flygaca.com').replace(/\/$/, '');

  if (!key) {
    console.log('indexnow: skipped — no INDEXNOW_KEY set (dark by default).');
    process.exit(0);
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const sitemapPath = ['dist/sitemap.xml', 'public/sitemap.xml']
    .map((p) => join(root, p))
    .find((p) => existsSync(p));
  if (!sitemapPath) {
    console.warn('indexnow: no sitemap found (dist/ or public/) — nothing to submit. Skipping.');
    process.exit(0);
  }

  const payload = buildPayload({ site, key, urls: extractLocs(readFileSync(sitemapPath, 'utf8')) });
  if (payload.urlList.length === 0) {
    console.warn('indexnow: sitemap had no on-host URLs — nothing to submit.');
    process.exit(0);
  }

  // IndexNow verifies ownership by fetching `<site>/<key>.txt` and matching its
  // body against the submitted key. Write it into dist/ so it ships with the
  // same upload as the rest of the site — without it every submission is
  // rejected, and the ping looks like it worked.
  const distDir = join(root, 'dist');
  if (existsSync(distDir)) {
    writeFileSync(join(distDir, `${key}.txt`), key);
    console.log(`indexnow: wrote dist/${key}.txt (ownership proof for ${payload.keyLocation})`);
  } else {
    console.warn('indexnow: dist/ missing — key file not written; submission will fail verification.');
  }

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    // 200 (accepted) and 202 (received, pending) are both success.
    console.log(
      `indexnow: submitted ${payload.urlList.length} URL(s) for ${payload.host} → HTTP ${res.status}`,
    );
    if (res.status >= 400) console.warn('indexnow: endpoint returned an error status (non-fatal).');
  } catch (err) {
    // Fail-open: never break a deploy over a best-effort search ping.
    console.warn(`indexnow: ping failed (non-fatal) — ${err instanceof Error ? err.message : err}`);
  }
  process.exit(0);
}
