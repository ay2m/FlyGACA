/**
 * "Save for offline" via the Cache API. Warms the SAME `flygaca-data` cache the
 * workbox NetworkFirst runtime rule uses (see vite.config.ts), so a saved doc is
 * served from cache when the network is gone. The pure list/format helpers live
 * in src/calc/library/offlineManifest.ts; this module owns the DOM/Cache + persistence.
 */
import { addSaved, listSaved, removeSaved } from '@/calc/library/offlineManifest';
import { dataUrl } from '@/lib/content';

/** Must match the workbox runtimeCaching cacheName in vite.config.ts. */
const CACHE = 'flygaca-data';
const SAVED_KEY = 'flygaca:offline:saved';

export function offlineSupported(): boolean {
  return typeof caches !== 'undefined';
}

export function loadSaved(): string[] {
  try {
    return listSaved(JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function persist(slugs: string[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(slugs));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Cache the given URLs and record the slug. Returns false on quota/other error. */
export async function saveDoc(slug: string, urls: string[]): Promise<boolean> {
  if (!offlineSupported()) return false;
  try {
    const cache = await caches.open(CACHE);
    // Cache under the same origin the runtime fetch uses (dataUrl), so a saved
    // doc is served from cache whether /data is same-origin or on the bucket.
    await cache.addAll(urls.map(dataUrl));
    persist(addSaved(loadSaved(), slug));
    return true;
  } catch {
    return false;
  }
}

/**
 * Bulk "save for offline" over {@link saveDoc}: warm many docs (e.g. all GACAR
 * Parts, or a batch of bookmarked sections) into the cache. Runs sequentially
 * so a quota failure stops cleanly mid-way rather than firing dozens of parallel
 * `addAll`s, and so `onProgress` is monotonic. Returns the count actually saved.
 */
export async function saveDocs(
  items: { slug: string; urls: string[] }[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let ok = 0;
  for (let i = 0; i < items.length; i++) {
    if (await saveDoc(items[i].slug, items[i].urls)) ok++;
    onProgress?.(i + 1, items.length);
  }
  return ok;
}

/** Evict the given URLs from the cache and forget the slug. */
export async function removeDoc(slug: string, urls: string[]): Promise<void> {
  if (offlineSupported()) {
    try {
      const cache = await caches.open(CACHE);
      await Promise.all(urls.map((u) => cache.delete(dataUrl(u))));
    } catch {
      /* ignore */
    }
  }
  persist(removeSaved(loadSaved(), slug));
}

/** Drop the whole data cache and forget every saved doc. */
export async function clearAll(): Promise<void> {
  if (offlineSupported()) {
    try {
      await caches.delete(CACHE);
    } catch {
      /* ignore */
    }
  }
  persist([]);
}

/** Best-effort estimate of total cached storage in bytes (0 when unavailable). */
export async function storageEstimate(): Promise<number> {
  try {
    const est = await navigator.storage?.estimate?.();
    return est?.usage ?? 0;
  } catch {
    return 0;
  }
}
