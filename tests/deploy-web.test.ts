import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script, no types; exercised for its pure planners.
import { buildPlan, gsWildcards, shellQuote } from '../scripts/deploy-web.mjs';

/**
 * `scripts/deploy-web.mjs` shells out to gcloud, so the runnable part cannot be
 * tested here. What CAN be tested — and what actually goes wrong — is the plan it
 * builds: which bucket each object lands in, and which Cache-Control each path
 * class ends up with. A plan that quietly caches `index.html` or `sw.js` produces a
 * green deploy that serves the previous build, with no error to trace it back to.
 *
 * Same shape as tests/indexnow.test.ts: exercise the deploy script's pure helpers.
 */

type Step = { label: string; argv: string[] };

const args = (plan: Step[], match: RegExp) =>
  plan.filter((s) => s.argv.join(' ').match(match)).map((s) => s.argv);

/** The --cache-control value the plan assigns to a given gs:// pattern. */
function cacheControlOf(plan: Step[], pattern: string): string | undefined {
  const step = plan.find((s) => s.argv[0] === 'storage' && s.argv[3] === pattern);
  return step?.argv.find((a) => a.startsWith('--cache-control='))?.slice('--cache-control='.length);
}

describe('gsWildcards', () => {
  it('expands the index.html rule to both root and nested patterns', () => {
    // Cloud Storage's ** does not match an empty segment, so `**/index.html` alone
    // would leave the ROOT index.html on the default TTL — the worst object to cache.
    expect(gsWildcards('**/index.html', 'gs://web')).toEqual([
      'gs://web/index.html',
      'gs://web/**/index.html',
    ]);
  });

  it('passes a plain path through as one pattern', () => {
    expect(gsWildcards('/sw.js', 'gs://web')).toEqual(['gs://web/sw.js']);
    expect(gsWildcards('/assets/**', 'gs://web')).toEqual(['gs://web/assets/**']);
  });

  it('tolerates a trailing slash on the bucket', () => {
    expect(gsWildcards('/sw.js', 'gs://web/')).toEqual(['gs://web/sw.js']);
  });
});

describe('buildPlan without a corpus bucket', () => {
  const plan: Step[] = buildPlan({ webBucket: 'gs://web' });

  it('requires a web bucket', () => {
    expect(() => buildPlan({})).toThrow(/WEB_BUCKET/);
  });

  it('uploads dist without excluding data', () => {
    // No corpus bucket means the corpus is served same-origin from dist/data, so
    // excluding it would ship a site whose every /data fetch 404s.
    const [rsync] = args(plan, /^storage rsync/);
    expect(rsync).toContain('dist');
    expect(rsync).toContain('gs://web');
    expect(rsync.join(' ')).not.toContain('--exclude');
  });

  it('never caches index.html or the service worker', () => {
    expect(cacheControlOf(plan, 'gs://web/index.html')).toBe('no-cache');
    expect(cacheControlOf(plan, 'gs://web/**/index.html')).toBe('no-cache');
    expect(cacheControlOf(plan, 'gs://web/sw.js')).toBe('no-cache');
  });

  it('caches hashed assets immutably', () => {
    expect(cacheControlOf(plan, 'gs://web/assets/**')).toBe('public, max-age=31536000, immutable');
  });

  it('keeps the corpus rule pointed at the web bucket', () => {
    expect(cacheControlOf(plan, 'gs://web/data/**')).toBe('public, max-age=3600');
  });

  it('stamps the bucket-wide default before the specific rules', () => {
    // Order is the whole point: a later specific rule must overwrite the default,
    // not the other way round.
    const defaultAt = plan.findIndex((s) => s.argv[3] === 'gs://web/**');
    const swAt = plan.findIndex((s) => s.argv[3] === 'gs://web/sw.js');
    expect(defaultAt).toBeGreaterThanOrEqual(0);
    expect(defaultAt).toBeLessThan(swAt);
  });

  it('skips CDN invalidation when no url map is given', () => {
    expect(args(plan, /invalidate-cdn-cache/)).toHaveLength(0);
  });
});

describe('buildPlan with a corpus bucket', () => {
  const plan: Step[] = buildPlan({
    webBucket: 'gs://web',
    dataBucket: 'gs://corpus',
    urlMap: 'flygaca-lb',
  });

  it('excludes dist/data from the web bucket', () => {
    // Shipping the ~130 MB corpus into the web bucket as well as the corpus bucket
    // is the exact waste the offload exists to remove.
    const [rsync] = args(plan, /^storage rsync .*dist/);
    expect(rsync).toContain('--exclude=^data/.*$');
  });

  it('uploads the corpus under a data/ prefix, not the bucket root', () => {
    // VITE_DATA_BASE_URL is `https://storage.googleapis.com/<bucket>/data`, so
    // syncing to the root would 404 every corpus fetch in production only.
    const [rsync] = args(plan, /^storage rsync .*public\/data/);
    expect(rsync.at(-1)).toBe('gs://corpus/data');
  });

  it('applies the corpus TTL in the corpus bucket, not the web bucket', () => {
    expect(cacheControlOf(plan, 'gs://corpus/data/**')).toBe('public, max-age=3600');
    expect(cacheControlOf(plan, 'gs://web/data/**')).toBeUndefined();
  });

  it('does not double the data prefix', () => {
    // dataPrefix() and the /data/** glob both contribute a `data` segment; only one
    // of them may reach the final pattern.
    expect(plan.some((s) => s.argv.join(' ').includes('corpus/data/data'))).toBe(false);
  });

  it('gives both buckets a default TTL', () => {
    expect(cacheControlOf(plan, 'gs://web/**')).toBe('public, max-age=3600');
    expect(cacheControlOf(plan, 'gs://corpus/**')).toBe('public, max-age=3600');
  });

  it('invalidates the CDN last', () => {
    expect(plan.at(-1)?.argv).toEqual([
      'compute',
      'url-maps',
      'invalidate-cdn-cache',
      'flygaca-lb',
      '--path=/*',
      '--async',
    ]);
  });
});

describe('shellQuote', () => {
  it('quotes values a shell would mangle', () => {
    // These lines get pasted into terminals to reproduce a failing step.
    expect(shellQuote(['--cache-control=public, max-age=3600'])).toBe(
      "'--cache-control=public, max-age=3600'",
    );
    expect(shellQuote(['gs://web/**'])).toBe("'gs://web/**'");
    expect(shellQuote(['--path=/*'])).toBe("'--path=/*'");
  });

  it('leaves plain arguments unquoted', () => {
    expect(shellQuote(['storage', 'rsync', 'dist', 'gs://web'])).toBe(
      'storage rsync dist gs://web',
    );
  });

  it('escapes an embedded single quote', () => {
    expect(shellQuote(["it's"])).toBe("'it'\\''s'");
  });
});
