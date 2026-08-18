/**
 * Tests for the "save for offline" Cache API wrapper. The pure list/format
 * helpers live in src/calc/library/offlineManifest.ts (covered by offlineManifest.test.ts);
 * this exercises feature-detection, corrupt-storage fallback and the cache
 * mutators with a stubbed Cache API.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SAVED_KEY = 'flygaca:offline:saved';

type Mod = typeof import('@/lib/native/offlineCache');
async function fresh(): Promise<Mod> {
  vi.resetModules();
  return import('@/lib/native/offlineCache');
}

/** A minimal in-memory Cache API double. */
function installCaches() {
  const store = new Map<string, Set<string>>();
  const cacheApi = {
    open: vi.fn(async (name: string) => {
      if (!store.has(name)) store.set(name, new Set());
      const set = store.get(name)!;
      return {
        addAll: vi.fn(async (urls: string[]) => urls.forEach((u) => set.add(u))),
        delete: vi.fn(async (u: string) => set.delete(u)),
      };
    }),
    delete: vi.fn(async (name: string) => store.delete(name)),
  };
  vi.stubGlobal('caches', cacheApi);
  return { store, cacheApi };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('offlineSupported', () => {
  it('is false when the Cache API is absent', async () => {
    vi.stubGlobal('caches', undefined);
    const mod = await fresh();
    expect(mod.offlineSupported()).toBe(false);
  });

  it('is true when caches exists', async () => {
    installCaches();
    const mod = await fresh();
    expect(mod.offlineSupported()).toBe(true);
  });
});

describe('loadSaved', () => {
  it('returns [] on corrupt JSON', async () => {
    localStorage.setItem(SAVED_KEY, 'not-json{');
    const mod = await fresh();
    expect(mod.loadSaved()).toEqual([]);
  });

  it('coerces stored values to a string list', async () => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(['part-1', 2, 'part-91']));
    const mod = await fresh();
    expect(mod.loadSaved()).toEqual(['part-1', 'part-91']);
  });
});

describe('saveDoc', () => {
  it('returns false when offline caching is unsupported', async () => {
    vi.stubGlobal('caches', undefined);
    const mod = await fresh();
    expect(await mod.saveDoc('part-91', ['/data/part-91.json'])).toBe(false);
  });

  it('caches the URLs and records the slug', async () => {
    const { store } = installCaches();
    const mod = await fresh();
    const ok = await mod.saveDoc('part-91', ['/data/part-91.json', '/data/part-91.html']);
    expect(ok).toBe(true);
    expect(store.get('flygaca-data')?.has('/data/part-91.json')).toBe(true);
    expect(mod.loadSaved()).toContain('part-91');
  });

  it('returns false and does not record the slug when caching throws', async () => {
    vi.stubGlobal('caches', {
      open: vi.fn(async () => ({
        addAll: vi.fn(async () => {
          throw new Error('quota');
        }),
      })),
    });
    const mod = await fresh();
    expect(await mod.saveDoc('part-91', ['/x'])).toBe(false);
    expect(mod.loadSaved()).not.toContain('part-91');
  });
});

describe('removeDoc / clearAll', () => {
  it('evicts URLs and forgets the slug', async () => {
    const { store } = installCaches();
    const mod = await fresh();
    await mod.saveDoc('part-91', ['/data/part-91.json']);
    await mod.removeDoc('part-91', ['/data/part-91.json']);
    expect(store.get('flygaca-data')?.has('/data/part-91.json')).toBe(false);
    expect(mod.loadSaved()).not.toContain('part-91');
  });

  it('clearAll drops the cache and empties the saved list', async () => {
    const { store } = installCaches();
    const mod = await fresh();
    await mod.saveDoc('part-91', ['/data/part-91.json']);
    await mod.clearAll();
    expect(store.has('flygaca-data')).toBe(false);
    expect(mod.loadSaved()).toEqual([]);
  });
});

describe('storageEstimate', () => {
  it('returns the reported usage', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: vi.fn(async () => ({ usage: 4096 })) } });
    const mod = await fresh();
    expect(await mod.storageEstimate()).toBe(4096);
  });

  it('returns 0 when the StorageManager is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const mod = await fresh();
    expect(await mod.storageEstimate()).toBe(0);
  });
});
