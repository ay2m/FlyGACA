/**
 * Response-header helpers, generated from the single source of truth in
 * `config/headers.json`.
 *
 * Two consumers, because Google Cloud splits the job in two:
 *
 *   - `gcloudCustomResponseHeaders()` builds the `--custom-response-headers` value
 *     for the load balancer's backend bucket and backend service. GCP applies those
 *     to EVERY response from a backend, which is exactly right for the security set
 *     and useless for Cache-Control.
 *   - `cacheControlFor()` maps one object path to its Cache-Control, which
 *     `scripts/deploy-web.mjs` stamps onto Cloud Storage objects at upload time.
 *
 * Pure and dependency-free so tests/headers-parity.test.ts can exercise it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The parsed source of truth. */
export const HEADERS = JSON.parse(readFileSync(join(root, 'config/headers.json'), 'utf8'));

/** Header name → value, applied to every response from every front. */
export const SECURITY_HEADERS = HEADERS.security;

/** Ordered path rules; the FIRST match wins, so exact paths are listed before globs. */
export const CACHE_RULES = HEADERS.cache;

/** Cache-Control for anything no rule matches. */
export const DEFAULT_CACHE_CONTROL = HEADERS.defaultCacheControl;

/**
 * Compile one glob to a RegExp. A double star crosses path separators, a single
 * star does not, and a leading double-star segment is optional -- so the rule
 * matching index.html at any depth also matches it at the root.
 */
function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` may match nothing at all; a bare `**` matches any remainder.
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
    } else if ('\\^$.|?+()[]{}'.includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(`^${out}$`);
}

/**
 * Cache-Control for one path. Accepts either a leading slash or not, so it can be
 * called with a bucket object name (`assets/index-abc.js`) or a URL path
 * (`/assets/index-abc.js`) interchangeably.
 */
export function cacheControlFor(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  for (const rule of CACHE_RULES) {
    if (globToRegExp(rule.match).test(p)) return rule.value;
  }
  return DEFAULT_CACHE_CONTROL;
}

/**
 * The `--custom-response-headers` value for `gcloud compute backend-buckets update`
 * and `backend-services update`.
 *
 * gcloud parses that flag as a COMMA-separated list, and `Permissions-Policy`
 * contains commas — passing the headers raw silently shreds it into fragments that
 * are each rejected or, worse, accepted as garbage. gcloud's escape hatch is a
 * leading `^DELIM^` that redefines the separator for that one value; `~` appears in
 * none of our header values.
 */
export function gcloudCustomResponseHeaders(delimiter = '~') {
  const parts = Object.entries(SECURITY_HEADERS).map(([name, value]) => `${name}: ${value}`);
  for (const part of parts) {
    if (part.includes(delimiter)) {
      throw new Error(`Header value contains the gcloud list delimiter ${delimiter}: ${part}`);
    }
  }
  return `^${delimiter}^${parts.join(delimiter)}`;
}
