/**
 * Typed runtime content loader. The regulatory corpus and content indexes ship
 * as static JSON under /data and are fetched at runtime (as in the legacy site),
 * so the heavy corpus never bloats the JS bundle.
 */

import type { CorpusMeta, LibraryKind } from './content.types';

export * from './content.types';

/**
 * Where the ~130 MB `/data` corpus is served from. Defaults to same-origin
 * `/data` (dev, tests, and any host that ships the corpus alongside the app).
 * Set `VITE_DATA_BASE_URL` (e.g. a Cloud Storage bucket origin) to serve the
 * corpus off the app host — this keeps each release small so it can't exhaust
 * the host's storage quota. Every `/data/*` fetch and asset
 * URL funnels through {@link dataUrl}, so flipping the origin is a single
 * build-env change with no call-site edits.
 */
/**
 * Resolve the corpus data origin from the (possibly empty) build-env value.
 * Exported for unit tests (see tests/content-dataurl.test.ts).
 *
 * `||` not `??`: the deploy workflow sets `VITE_DATA_BASE_URL` to
 * `${{ vars.DATA_BASE_URL }}`, which expands to an EMPTY STRING when that repo var is
 * unset (the default). `??` only falls back on null/undefined, so `''` would slip
 * through and strip the `/data` prefix off every fetch (→ the host's SPA catch-all
 * returns index.html at HTTP 200 → `res.json()` fails on HTML → "Could not load this
 * content"). An empty value must fall back to same-origin `/data`. Trailing slashes
 * are trimmed so a bucket origin like `…/data/` + `/x.json` never doubles up.
 */
export function resolveDataBase(raw: string | undefined): string {
  return (raw || '/data').replace(/\/+$/, '');
}

const DATA_BASE = resolveDataBase(import.meta.env.VITE_DATA_BASE_URL);

/** Map a `/data/…`-rooted path onto the configured data origin (no-op when unset). */
export function dataUrl(path: string): string {
  return path.startsWith('/data/') ? DATA_BASE + path.slice('/data'.length) : path;
}

export async function fetchJson<T>(
  path: string,
  signal?: AbortSignal,
  validate?: (data: unknown) => data is T,
): Promise<T> {
  const res = await fetch(dataUrl(path), { signal });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    // A truncated/malformed body should surface as a load error at the call
    // site (retryable, evicted from loadJson's cache), not as a downstream
    // render crash on a value that was silently cast to T.
    throw new Error(
      `Failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`,
      {
        cause: err,
      },
    );
  }
  if (validate && !validate(data)) {
    throw new Error(`Failed to validate ${path}: unexpected shape`);
  }
  return data as T;
}

/**
 * Session-scoped, de-duplicated loader for the static `/data/*` indexes. Several
 * surfaces read the same large files — e.g. the ~1.5 MB `airports.json` is used by
 * the command palette and three flight tools — so without sharing, each mount
 * re-fetches and (more expensively) re-parses the file on the main thread.
 *
 * Two complementary layers keep that cheap:
 *  - this in-memory promise cache shares ONE fetch + parse per path for the life of
 *    the tab (multiple callers await the same promise);
 *  - the service worker's NetworkFirst `flygaca-data` runtime cache (vite.config.ts)
 *    serves the bytes from disk across visits.
 *
 * A rejected load is evicted so a later caller can retry; pass `force` to refresh
 * (e.g. a retry button). Intended for the static content indexes, not mutable data.
 */
const jsonCache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string, force = false): Promise<T> {
  if (force) jsonCache.delete(path);
  let promise = jsonCache.get(path);
  if (!promise) {
    // No per-caller AbortSignal: the promise is shared, so one caller unmounting
    // must not cancel the load others are awaiting (callers guard their own setState).
    promise = fetchJson<T>(path).catch((err) => {
      jsonCache.delete(path);
      throw err;
    });
    jsonCache.set(path, promise);
  }
  return promise as Promise<T>;
}

/** Test-only: drop the in-memory cache so each test starts from a clean slate. */
export function clearJsonCache(): void {
  jsonCache.clear();
}

/** Where each corpus's index, HTML, and reader route live. */
export const CORPUS: Record<LibraryKind, CorpusMeta> = {
  regulations: { index: '/data/gacar-index.json', dir: '/data/parts', base: '/library' },
  reference: {
    index: '/data/reference-index.json',
    dir: '/data/library',
    base: '/library/reference',
  },
  handbook: { index: '/data/ebooks-index.json', dir: '/data/ebooks', base: '/library/handbook' },
};
