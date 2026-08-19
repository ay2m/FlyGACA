#!/usr/bin/env node
/**
 * Publish the built SPA (and, optionally, the regulatory corpus) to Cloud Storage,
 * then invalidate the CDN.
 *
 * Why this exists rather than a one-line `gcloud storage rsync`: rsync copies bytes
 * and nothing else. It sets no `Cache-Control`, so every object inherits the CDN's
 * default — which caches `index.html` and `sw.js`. That is the classic way a static
 * deploy "succeeds" and leaves users pinned to the previous build until a TTL
 * expires, with no error anywhere to explain it. So the upload is followed by
 * metadata passes derived from `config/headers.json`, the same source of truth the
 * dormant Vercel/Netlify mirrors are held to (tests/headers-parity.test.ts).
 *
 * Security headers are NOT set here. Google applies those per backend, not per
 * object — see `gcloudCustomResponseHeaders()` and docs/RUNBOOK-golive.md.
 *
 *   WEB_BUCKET=gs://flygaca-web \
 *   DATA_BUCKET=gs://flygaca-data \
 *   URL_MAP=flygaca-lb \
 *   node scripts/deploy-web.mjs [--dry-run]
 *
 * With DATA_BUCKET set the corpus is served from its own bucket via
 * VITE_DATA_BASE_URL, so `dist/data` is excluded from the web bucket — that is what
 * keeps a web deploy ~12 MB instead of ~130 MB. See docs/DATA-HOSTING.md.
 *
 * Pure planning helpers are exported for tests/deploy-web.test.ts; nothing here
 * shells out until `main()` runs.
 */
import { spawnSync } from 'node:child_process';
import { CACHE_RULES, DEFAULT_CACHE_CONTROL } from './lib/headers.mjs';

/**
 * Translate one `config/headers.json` glob into the `gs://` wildcards that
 * `gcloud storage objects update` understands.
 *
 * The awkward case is the index.html rule: Cloud Storage's double-star will not
 * match an empty path segment, so the root `index.html` needs its own pattern or it
 * silently keeps the default TTL — exactly the object it is most damaging to cache.
 */
export function gsWildcards(glob, bucket) {
  const base = bucket.replace(/\/+$/, '');
  const path = glob.startsWith('/') ? glob.slice(1) : glob;
  if (path.startsWith('**/')) {
    const rest = path.slice('**/'.length);
    return [`${base}/${rest}`, `${base}/**/${rest}`];
  }
  return [`${base}/${path}`];
}

/** One planned step: a human-readable label plus the exact argv to run. */
const step = (label, argv) => ({ label, argv });

/** The corpus prefix inside the data bucket — mirrors VITE_DATA_BASE_URL's `/data`. */
const dataPrefix = (bucket) => `${bucket.replace(/\/+$/, '')}/data`;

/**
 * Render argv as a copy-pasteable shell line. Several values contain spaces
 * (`public, max-age=3600`) or glob characters (`/*`); we pass argv directly to
 * spawnSync so the shell never sees them, but an unquoted echo would mislead anyone
 * who pastes it into a terminal to reproduce a step.
 */
export function shellQuote(argv) {
  return argv
    .map((a) => (/^[A-Za-z0-9_@%+=:,./-]+$/.test(a) ? a : `'${a.replaceAll("'", `'\\''`)}'`))
    .join(' ');
}

/**
 * Build the ordered command plan. Pure — returns argv arrays, runs nothing.
 *
 * Order is load-bearing. The default Cache-Control is stamped across the whole
 * bucket first and the specific rules overwrite it afterwards, so an object that
 * matches no rule still gets a deliberate TTL rather than the CDN's guess.
 */
export function buildPlan({
  webBucket,
  dataBucket,
  urlMap,
  dist = 'dist',
  corpus = 'public/data',
}) {
  if (!webBucket) throw new Error('WEB_BUCKET is required (e.g. gs://flygaca-web)');
  const plan = [];

  // 1. Upload. `-d` prunes objects no longer in dist/ so a removed route stops
  //    resolving instead of lingering as a stale orphan.
  const webRsync = ['storage', 'rsync', '--recursive', '--delete-unmatched-destination-objects'];
  if (dataBucket) {
    // A PYTHON regex, matched from the start of the path relative to the sync root
    // — not a glob. Hence the explicit `.*$` rather than a bare `data/`: gcloud's
    // own examples anchor both ends, and a pattern that quietly matches nothing
    // would upload the whole 64 MB corpus into the web bucket without complaint.
    webRsync.push('--exclude=^data/.*$');
  }
  plan.push(step(`upload ${dist} → ${webBucket}`, [...webRsync, dist, webBucket]));

  if (dataBucket) {
    // Under a `data/` prefix, NOT the bucket root: VITE_DATA_BASE_URL is
    // `https://storage.googleapis.com/<bucket>/data` and every corpus URL is built
    // by `dataUrl()` swapping `/data` for it, so the prefix has to survive the move.
    plan.push(
      step(`upload ${corpus} → ${dataPrefix(dataBucket)}`, [
        'storage',
        'rsync',
        '--recursive',
        '--delete-unmatched-destination-objects',
        corpus,
        dataPrefix(dataBucket),
      ]),
    );
  }

  // 2. Cache-Control. Metadata-only rewrites, so they are cheap next to the upload.
  for (const bucket of dataBucket ? [webBucket, dataBucket] : [webBucket]) {
    plan.push(
      step(`default Cache-Control on ${bucket}`, [
        'storage',
        'objects',
        'update',
        `${bucket.replace(/\/+$/, '')}/**`,
        `--cache-control=${DEFAULT_CACHE_CONTROL}`,
      ]),
    );
  }

  for (const rule of CACHE_RULES) {
    // /data/** lives in the corpus bucket once it is offloaded, everything else in
    // the web bucket. Without this the rule would be applied to a prefix that does
    // not exist there and gcloud would fail the deploy on a missing match.
    const bucket = dataBucket && rule.match.startsWith('/data/') ? dataBucket : webBucket;
    // gsWildcards re-adds the `data/` segment from the glob itself, so pass the
    // bucket root here rather than dataPrefix() or the prefix would be doubled.
    for (const pattern of gsWildcards(rule.match, bucket)) {
      plan.push(
        step(`Cache-Control ${rule.value} → ${pattern}`, [
          'storage',
          'objects',
          'update',
          pattern,
          `--cache-control=${rule.value}`,
        ]),
      );
    }
  }

  // 3. Invalidate. index.html and sw.js are already no-cache, so this is belt and
  //    braces for anything the CDN cached under the previous configuration.
  if (urlMap) {
    plan.push(
      step(`invalidate CDN cache on ${urlMap}`, [
        'compute',
        'url-maps',
        'invalidate-cdn-cache',
        urlMap,
        '--path=/*',
        '--async',
      ]),
    );
  }

  return plan;
}

/**
 * Steps whose wildcard may legitimately match nothing — a fresh bucket has no
 * prerendered per-route index.html yet, and the corpus prefix is absent when the
 * corpus has not been offloaded. gcloud exits non-zero on an unmatched wildcard, and failing a
 * deploy for "this optional thing was not there" is worse than the warning.
 */
function isOptional(argv) {
  return argv[0] === 'storage' && argv[1] === 'objects' && /\*\*\//.test(argv[3] ?? '');
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const plan = buildPlan({
    webBucket: process.env.WEB_BUCKET,
    dataBucket: process.env.DATA_BUCKET,
    urlMap: process.env.URL_MAP,
  });

  for (const { label, argv } of plan) {
    console.log(`\n▸ ${label}`);
    console.log(`  gcloud ${shellQuote(argv)}`);
    if (dryRun) continue;

    const res = spawnSync('gcloud', argv, { stdio: 'inherit' });
    if (res.error?.code === 'ENOENT') {
      console.error(
        '\ngcloud is not on PATH. Install the SDK: https://cloud.google.com/sdk/docs/install',
      );
      process.exit(1);
    }
    if (res.status !== 0) {
      if (isOptional(argv)) {
        console.warn(`  ⚠ no objects matched — skipping (exit ${res.status})`);
        continue;
      }
      process.exit(res.status ?? 1);
    }
  }

  console.log(dryRun ? '\nDry run — nothing was uploaded.' : '\nPublished.');
}

// Only run when invoked directly, so the test can import the planners.
if (process.argv[1] && process.argv[1].endsWith('deploy-web.mjs')) main();
