import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error — plain ESM script, no types; exercised for its pure helpers.
import {
  SECURITY_HEADERS,
  CACHE_RULES,
  DEFAULT_CACHE_CONTROL,
  cacheControlFor,
  gcloudCustomResponseHeaders,
} from '../scripts/lib/headers.mjs';

/**
 * The response-header parity gate.
 *
 * Security headers used to live in exactly two files — `vercel.json` and
 * `netlify.toml` — and nowhere else. Production is neither of those: it is a Cloud
 * Storage bucket and a Cloud Run service behind a Google load balancer, which set
 * whatever `--custom-response-headers` they were given and nothing more. So the
 * canonical front shipped with no CSP and no HSTS while two hosts nobody serves from
 * had both.
 *
 * `config/headers.json` is now the source of truth. This test keeps all three
 * mirrors honest against it — `vercel.json`, `netlify.toml` and `public/_headers`
 * — and pins the two generators the GCP front actually uses.
 *
 * `public/_headers` is the one that matters most despite being the least visible:
 * it ships INSIDE `dist/`, so it travels with every build rather than sitting in
 * one host's config. It joined the repo with a CSP that had already drifted from
 * this file — no Moyasar origins, so checkout was CSP-blocked outright, and no
 * corpus bucket. Harmless while every mirror is dormant; a dead payment flow the
 * first time one is not.
 *
 * IMPORTANT: this cannot see the live load balancer. Green means the repo is
 * self-consistent, not that production serves these headers — applying them is a
 * `gcloud compute backend-buckets update` away (docs/RUNBOOK-golive.md).
 */

const root = process.cwd();
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const netlify = readFileSync(join(root, 'netlify.toml'), 'utf8');
const pagesHeaders = readFileSync(join(root, 'public/_headers'), 'utf8');

/** The `/(.*)`  header block that carries the security set (not the noindex one). */
const vercelSecurityBlock = vercel.headers.find(
  (h: { source: string; missing?: unknown }) => h.source === '/(.*)' && !h.missing,
);

/** Header name → value declared by Vercel for a given `source`. */
function vercelHeadersFor(source: string): Record<string, string> {
  const block = vercel.headers.find(
    (h: { source: string; missing?: unknown }) => h.source === source && !h.missing,
  );
  const out: Record<string, string> = {};
  for (const { key, value } of block?.headers ?? []) out[key] = value;
  return out;
}

/** Header name → value declared by Netlify for a given `for` path. */
function netlifyHeadersFor(path: string): Record<string, string> {
  // Grab the [[headers]] stanza whose `for` matches, up to the next [[ or EOF.
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stanza = new RegExp(
    `\\[\\[headers\\]\\]\\s*\\n\\s*for\\s*=\\s*"${escaped}"([\\s\\S]*?)(?=\\n\\[\\[|$)`,
  ).exec(netlify);
  const out: Record<string, string> = {};
  for (const m of (stanza?.[1] ?? '').matchAll(/^\s{4}([\w-]+)\s*=\s*"([\s\S]*?)"$/gm)) {
    out[m[1]] = m[2];
  }
  return out;
}

/**
 * Header name -> value declared by `public/_headers` for a given path block.
 *
 * A third mirror front (Cloudflare Pages; Netlify honours it too) and the only
 * one that ships INSIDE `dist/`, so it travels with every build. It arrived
 * carrying a hand-written CSP that had already drifted: no `cdn.moyasar.com` or
 * `api.moyasar.com`, which CSP-blocks checkout outright, and no
 * `storage.googleapis.com`, which blocks the offloaded corpus. Inert while the
 * mirrors are dormant, and a broken payment flow the moment one is used.
 */
function pagesHeadersFor(path: string): Record<string, string> {
  // Line-scanned rather than regex-matched. The format is a path at column 0
  // followed by indented `Key: value` lines, and a lookahead terminator gets
  // subtle fast: an `m`-flagged `$` matches end-of-LINE, so `(?=\n\S|$)` fires
  // immediately after the path and every block reads as empty.
  const out: Record<string, string> = {};
  let inBlock = false;
  for (const line of pagesHeaders.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      if (inBlock) break; // next path block starts — done
      inBlock = line.trim() === path;
      continue;
    }
    if (!inBlock) continue;
    const [key, ...rest] = line.trim().split(':');
    out[key.trim()] = rest.join(':').trim();
  }
  return out;
}

describe('security headers', () => {
  const vercelGlobal = vercelHeadersFor('/(.*)');
  const netlifyGlobal = netlifyHeadersFor('/*');
  const pagesGlobal = pagesHeadersFor('/*');

  it('declares the set production needs', () => {
    expect(Object.keys(SECURITY_HEADERS).sort()).toEqual([
      'Content-Security-Policy',
      'Permissions-Policy',
      'Referrer-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ]);
  });

  it.each(Object.entries(SECURITY_HEADERS) as [string, string][])(
    'vercel.json serves %s identically',
    (name, value) => {
      expect(vercelGlobal[name]).toBe(value);
    },
  );

  it.each(Object.entries(SECURITY_HEADERS) as [string, string][])(
    'netlify.toml serves %s identically',
    (name, value) => {
      expect(netlifyGlobal[name]).toBe(value);
    },
  );

  it.each(Object.entries(SECURITY_HEADERS) as [string, string][])(
    'public/_headers serves %s identically',
    (name, value) => {
      expect(pagesGlobal[name]).toBe(value);
    },
  );

  it('adds no header to a mirror that the source of truth does not declare', () => {
    // The Vercel security block may carry nothing extra; the noindex X-Robots-Tag
    // lives in its own `missing`-guarded block and is excluded above.
    expect(Object.keys(vercelGlobal).sort()).toEqual(Object.keys(SECURITY_HEADERS).sort());
    expect(Object.keys(netlifyGlobal).sort()).toEqual(Object.keys(SECURITY_HEADERS).sort());
    // `public/_headers` additionally carries X-Robots-Tag, so a mirror is never
    // indexed as a duplicate of flygaca.com. That one is mirror-only by design and
    // is the ONLY permitted extra.
    expect(Object.keys(pagesGlobal).sort()).toEqual(
      [...Object.keys(SECURITY_HEADERS), 'X-Robots-Tag'].sort(),
    );
  });

  it('allows the corpus bucket in both connect-src and img-src', () => {
    // The corpus is offloaded to Cloud Storage (docs/DATA-HOSTING.md). Drop either
    // and every /data fetch and chart image is blocked in production only.
    const csp = SECURITY_HEADERS['Content-Security-Policy'];
    const directive = (name: string) =>
      csp
        .split(';')
        .map((d: string) => d.trim())
        .find((d: string) => d.startsWith(`${name} `)) ?? '';
    expect(directive('connect-src')).toContain('https://storage.googleapis.com');
    expect(directive('img-src')).toContain('https://storage.googleapis.com');
  });

  it('keeps the CSP free of a wildcard default-src', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src 'self'");
    expect(SECURITY_HEADERS['Content-Security-Policy']).not.toContain('default-src *');
  });

  it('has a security block that is not the noindex block', () => {
    expect(vercelSecurityBlock).toBeDefined();
  });
});

describe('cache rules', () => {
  it.each(CACHE_RULES.filter((r: { vercel: string | null }) => r.vercel))(
    'vercel.json caches $vercel as $value',
    (rule: { vercel: string; value: string }) => {
      expect(vercelHeadersFor(rule.vercel)['Cache-Control']).toBe(rule.value);
    },
  );

  it.each(CACHE_RULES.filter((r: { netlify: string | null }) => r.netlify))(
    'netlify.toml caches $netlify as $value',
    (rule: { netlify: string; value: string }) => {
      expect(netlifyHeadersFor(rule.netlify)['Cache-Control']).toBe(rule.value);
    },
  );
});

describe('public/_headers cache rules', () => {
  // Same path classes the other fronts declare. Getting these wrong on a file
  // that ships inside dist/ strands users on a stale build.
  it.each([
    ['/assets/*', 'public, max-age=31536000, immutable'],
    ['/data/*', 'public, max-age=3600'],
    ['/sw.js', 'no-cache'],
  ])('caches %s as %s', (path, value) => {
    expect(pagesHeadersFor(path)['Cache-Control']).toBe(value);
  });
});

describe('cacheControlFor', () => {
  it('never caches the service worker', () => {
    expect(cacheControlFor('/sw.js')).toBe('no-cache');
    expect(cacheControlFor('sw.js')).toBe('no-cache');
  });

  it('never caches an index.html, at the root or at any depth', () => {
    // Every prerendered route lands as dist/<route>/index.html, so a cached one
    // strands that route on an old build even after a successful deploy.
    expect(cacheControlFor('/index.html')).toBe('no-cache');
    expect(cacheControlFor('/library/index.html')).toBe('no-cache');
    expect(cacheControlFor('/ar/tools/crosswind/index.html')).toBe('no-cache');
  });

  it('caches content-hashed assets immutably', () => {
    expect(cacheControlFor('/assets/index-a1b2c3.js')).toBe('public, max-age=31536000, immutable');
    expect(cacheControlFor('assets/nested/chunk-d4e5.css')).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('gives the corpus a short TTL', () => {
    expect(cacheControlFor('/data/quiz.json')).toBe('public, max-age=3600');
    expect(cacheControlFor('/data/parts/gacar-91.json')).toBe('public, max-age=3600');
  });

  it('falls back to the default for anything unmatched', () => {
    expect(cacheControlFor('/robots.txt')).toBe(DEFAULT_CACHE_CONTROL);
    expect(cacheControlFor('/favicon.svg')).toBe(DEFAULT_CACHE_CONTROL);
  });

  it('does not let a single star cross a path separator', () => {
    // Guards the glob compiler: `/assets/**` must not be reachable by a lookalike.
    expect(cacheControlFor('/notassets/index-a1.js')).toBe(DEFAULT_CACHE_CONTROL);
  });
});

describe('gcloudCustomResponseHeaders', () => {
  const flag = gcloudCustomResponseHeaders();

  it('redefines the list delimiter so commas survive', () => {
    // Permissions-Policy contains commas. gcloud splits this flag on commas by
    // default, so without the ^~^ prefix the value arrives shredded.
    expect(flag.startsWith('^~^')).toBe(true);
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain(',');
  });

  it('emits every header as one `Name: value` item', () => {
    const items = flag.slice('^~^'.length).split('~');
    expect(items).toHaveLength(Object.keys(SECURITY_HEADERS).length);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(items).toContain(`${name}: ${value}`);
    }
  });

  it('refuses a delimiter that appears inside a header value', () => {
    // Picking a delimiter that collides would corrupt the value silently.
    expect(() => gcloudCustomResponseHeaders('e')).toThrow(/delimiter/);
  });
});
