/**
 * Static prerender: boots `vite preview` over the built dist/, drives Playwright's
 * Chromium to each route, waits for the real app to render, and writes the
 * rendered HTML to dist/<route>/index.html. Hosts then serve that snapshot
 * (content + per-route meta/canonical/hreflang/JSON-LD paint at CSS-load time,
 * no JS) and the bundle still hydrates over it for interactivity.
 *
 * This is the OPTIONAL full-body enhancement layer that overwrites the head-only
 * snapshots from scripts/prerender-head.mjs (which `npm run build` always runs)
 * with hydrated HTML, on hosts that have a browser — the Vercel buildCommand and
 * `npm run deploy`. It is **non-fatal**: any failure (Chromium missing and
 * un-installable, a route timing out) logs a warning and exits 0, leaving the
 * head-prerendered HTML in place, so it can never break a deploy. It is NOT in
 * `npm run build` on purpose — Firebase App Hosting's buildpack can't run
 * headless Chromium, and the e2e webServer build must not wait on it. Set
 * SKIP_PRERENDER=1 to opt out explicitly.
 *
 * Route set mirrors scripts/build-sitemap.mjs: static router paths + guide slugs
 * (always), plus every enumerable dynamic route the sitemap indexes — the library
 * reader corpus (GACAR parts / reference / handbook), aerodrome detail pages and
 * prep-pack pages — up to PRERENDER_MAX snapshots (default 560, sized to the full
 * sitemap plus headroom; 0 = everything). Any coverage gap stays non-fatal here
 * but warns loudly; the deploy-time gate (scripts/check-prerender-coverage.mjs)
 * is what turns head-only or missing sitemap URLs into a failed deploy.
 */
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { get } from 'node:http';

if (process.env.SKIP_PRERENDER) {
  console.log('prerender: skipped (SKIP_PRERENDER set)');
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PRERENDER_PORT ?? 4181);
const BASE = `http://localhost:${PORT}`;

const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// Loud but non-fatal: warn on stderr, and in CI also emit a GitHub Actions
// annotation so coverage gaps show on the run summary, not just the step log.
function warn(msg) {
  console.warn(`prerender: ${msg}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=prerender::${msg}`);
}

// --- Route list (same source of truth as the sitemap) --------------------------
const PRIVATE = new Set([
  '/account',
  // /signin and /signup redirect to /account — snapshotting them just captures
  // the redirect target, so skip them like the other auth pages.
  '/signin',
  '/signup',
  '/dashboard',
  '/currency',
  '/logbook',
  '/records',
  '/settings',
  '/checkout',
  '/checkout/return',
]);
const routerPaths = [...read('src/router.tsx').matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
const guideSlugs = [
  ...read('src/pages/guides/guides.ts')
    .match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1]
    .matchAll(/'([^']+)'/g),
].map((m) => m[1]);

// High-value, finite landing routes — always prerendered.
const baseRoutes = new Set(['/']);
for (const p of routerPaths) {
  if (p.includes(':') || p === '*') continue; // skip dynamic + catch-all
  const norm = p === '/' ? '/' : `/${p.replace(/^\//, '')}`;
  if (!PRIVATE.has(norm)) baseRoutes.add(norm);
}
for (const slug of guideSlugs) baseRoutes.add(`/guides/${slug}`);

// Every enumerable dynamic route the sitemap indexes, from the same data.
// Ordered by citation value — reader corpus (parts → reference → handbook),
// then aerodrome detail pages, then prep packs — so the most-cited docs win
// the budget if a cap ever bites.
const corpus = [];
for (const [seg, file] of [
  ['/library', 'public/data/gacar-index.json'],
  ['/library/reference', 'public/data/reference-index.json'],
  ['/library/handbook', 'public/data/ebooks-index.json'],
]) {
  for (const d of readJson(file).documents) corpus.push(`${seg}/${d.slug}`);
}
for (const d of readJson('public/data/aerodromes-index.json').documents)
  corpus.push(`/tools/aerodromes/${d.icao}`);
// LIVE packs only — `soon` packs have no detail route (see build-sitemap.mjs).
for (const m of read('src/lib/prepCatalog.ts').matchAll(/\bid:\s*'([^']+)'[\s\S]*?status:\s*'([^']+)'/g))
  if (m[2] === 'live') corpus.push(`/study/packs/${m[1]}`);

// Cap total snapshots so the build stays bounded; base routes are never dropped,
// the cap only trims the corpus tail. A trimmed tail is NOT silently fine — those
// sitemap URLs would ship without body content, so the deploy gate
// (check-prerender-coverage.mjs) turns any trim into a failed deploy.
// the cap only trims the corpus tail. A trim warns loudly here (and becomes a
// fatal deploy failure once check-prerender-coverage runs), so raise
// PRERENDER_MAX or set it to 0 to prerender the whole corpus.
const MAX = Number(process.env.PRERENDER_MAX ?? 560);
const baseList = [...baseRoutes];
const budget = MAX === 0 ? corpus.length : Math.max(0, MAX - baseList.length);
const corpusIncluded = corpus.slice(0, budget);
const skipped = corpus.length - corpusIncluded.length;
if (skipped > 0) {
  const dropped = corpus.slice(budget, budget + 5).join(', ');
  warn(
    `corpus capped at PRERENDER_MAX=${MAX} — ${corpusIncluded.length}/${corpus.length} dynamic pages prerendered; ${skipped} sitemap URLs stay head-only (${dropped}${skipped > 5 ? ', …' : ''}). Raise PRERENDER_MAX or set 0 for the whole corpus before deploy.`,
  );
}
const routeList = [...new Set([...baseList, ...corpusIncluded])].sort();

// Arabic full-body set mirrors scripts/prerender-head.mjs's covered set: every
// base route + the top AR_CORPUS_MAX corpus docs (same parts→reference→handbook
// order). Each is rendered by visiting its `?lang=ar` variant — a real browser
// honours the param — and written to the distinct dist/ar/<route>/index.html the
// host can route to. Keep AR_CORPUS_MAX in sync with the other two scripts.
const AR_CORPUS_MAX = Number(process.env.AR_CORPUS_MAX ?? 60);
const arRouteList = [...new Set([...baseList, ...corpus.slice(0, AR_CORPUS_MAX)])].sort();

// --- Helpers -------------------------------------------------------------------
function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const ping = () => {
      get(`${BASE}/`, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() > deadline) reject(new Error('vite preview did not start'));
        else setTimeout(ping, 250);
      });
    };
    ping();
  });
}

function outPath(route) {
  return route === '/'
    ? join(root, 'dist/index.html')
    : join(root, 'dist', route.replace(/^\//, ''), 'index.html');
}

// The Arabic snapshot lives under a real `/ar` path prefix (Firebase routes by
// path, so this is a distinct file the crawler can fetch).
function outPathAr(route) {
  return route === '/'
    ? join(root, 'dist/ar/index.html')
    : join(root, 'dist/ar', route.replace(/^\//, ''), 'index.html');
}

// --- Output sanitization -------------------------------------------------------
// The snapshot is serialized AFTER the app hydrated, so it carries markup the
// app (or Firebase) injected at runtime that is useless — or actively harmful —
// when the file is served statically in production:
//   * the parser-blocking reCAPTCHA Enterprise loader (App Check) — on a network
//     where google.com is slow/blocked it stalls HTML parsing before the app boots;
//   * Vercel Analytics / Speed Insights and Firebase's gtag loader — dead
//     third-party requests (and CSP violations) on non-Vercel hosting;
//   * href/src attributes the DOM resolved against the preview origin
//     (`http://localhost:4181/…` / `http://127.0.0.1:4181/…`) — CSP-blocked dead
//     links on the real host.
// Strip the third-party script tags first, then rewrite every preview-origin URL
// back to root-relative (so the bundle script, modulepreloads and in-body links
// keep working on any host), and finally drop any link/script still pointing at
// the preview origin (safety net — the rewrite should have caught them all).
function sanitizeSnapshot(html) {
  return html
    .replace(
      /<script\b[^>]*\bsrc\s*=\s*["'][^"']*(?:recaptcha|_vercel|vercel-scripts|googletagmanager|gtag)[^"']*["'][^>]*>\s*<\/script>/gi,
      '',
    )
    .replace(/(?:https?:)?\/\/(?:localhost|127\.0\.0\.1)(?![\w.-])(?::\d+)?/gi, '')
    .replace(
      /<script\b[^>]*\bsrc\s*=\s*["']\s*(?:localhost|127\.0\.0\.1)[^"']*["'][^>]*>\s*<\/script>/gi,
      '',
    )
    .replace(/<link\b[^>]*\bhref\s*=\s*["']\s*(?:localhost|127\.0\.0\.1)[^"']*["'][^>]*>/gi, '');
}

// Launch Chromium; on a fresh CI image the browser binary may be absent, so try
// a one-off `playwright install chromium` and retry once. A still-failing launch
// throws up to the non-fatal catch, which ships the SPA/shell HTML as before.
async function launchChromium(chromium) {
  try {
    return await chromium.launch();
  } catch (err) {
    console.warn(`prerender: chromium launch failed (${err.message}); installing browser…`);
    await new Promise((resolve) => {
      const inst = spawn('npx', ['playwright', 'install', 'chromium'], {
        cwd: root,
        stdio: 'ignore',
      });
      inst.on('exit', resolve);
      inst.on('error', resolve);
    });
    return chromium.launch();
  }
}

// --- Main (non-fatal) ----------------------------------------------------------
let preview;
let browser;
try {
  const { chromium } = await import('@playwright/test');

  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  await waitForServer();

  browser = await launchChromium(chromium);
  const page = await browser.newPage();

  // Drive one route to a hydrated snapshot on disk. Waits for a real-app element
  // the static shell never contains, then dumps the live DOM.
  // Navigate + capture the hydrated document to `file` (a real-app <footer> is
  // the signal the app rendered over the static shell).
  //
  // `lang` is the language the finished document must be in. A <footer> is not a
  // sufficient signal on its own: i18next applies <html lang/dir> asynchronously,
  // so an /ar route can reach "footer rendered" while the root element still says
  // lang="en". Serializing there writes an English-bodied file to dist/ar/... and
  // `check:prerender` rejects it — which is exactly how the deploy failed, on a
  // *different* route each run (ar/tools/vfr-minima, ar/library/part-138), the
  // signature of a race rather than a broken page. Waiting for the language to
  // land removes the race at its source.
  async function snapshot(url, file, lang = 'en') {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('footer', { timeout: 15000 });
    await page.waitForFunction(
      (want) => {
        const el = document.documentElement;
        return el.lang === want && (want !== 'ar' || el.dir === 'rtl');
      },
      lang,
      { timeout: 15000 },
    );
    const html = sanitizeSnapshot(
      `<!doctype html>\n${await page.evaluate(() => document.documentElement.outerHTML)}`,
    );
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
  }

  let done = 0;
  for (const route of routeList) {
    try {
      await snapshot(`${BASE}${route}`, outPath(route));
      done++;
    } catch (err) {
      console.warn(`  prerender: skipped ${route} — ${err.message}`);
    }
  }
  // Arabic bodies: visit the real `/ar<route>` URL (the router mounts under
  // basename `/ar` and hydrates in Arabic with a self-canonical `/ar` head) and
  // write the distinct dist/ar/<route> file.
  let doneAr = 0;
  for (const route of arRouteList) {
    const arRoute = route === '/' ? '/ar' : `/ar${route}`;
    try {
      await snapshot(`${BASE}${arRoute}`, outPathAr(route), 'ar');
      doneAr++;
    } catch (err) {
      console.warn(`  prerender: skipped ar ${route} — ${err.message}`);
    }
  }
  console.log(
    `prerender: wrote ${done}/${routeList.length} en + ${doneAr}/${arRouteList.length} ar routes`,
  );
  if (done < routeList.length) {
    warn(
      `wrote ${done}/${routeList.length} en routes — ${routeList.length - done} failed and kept their head-only HTML`,
    );
  }
  if (doneAr < arRouteList.length) {
    warn(
      `wrote ${doneAr}/${arRouteList.length} ar routes — ${arRouteList.length - doneAr} failed and kept their head-only HTML`,
    );
  }
} catch (err) {
  warn(`skipped (non-fatal) — ${err.message}`);
} finally {
  await browser?.close().catch(() => {});
  preview?.kill();
}

process.exit(0);
