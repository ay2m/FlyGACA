import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Cross-module store coverage for the three local-first preference modules,
 * driven through the public API rather than per-module. Their pure list
 * transforms are unit-tested elsewhere (tool-prefs / guide-prefs / library-prefs
 * specs) and each module also has its own store spec; this file overlaps those
 * deliberately, and is what covers the shared `createPrefStore` factory from
 * more than one caller.
 *
 * Each store holds a single module-level snapshot seeded from localStorage at
 * import time (see src/lib/prefs/createPrefStore.ts), so every test seeds
 * storage, resets the module registry, then dynamically imports a fresh copy
 * for full isolation.
 */
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

const read = (key: string): unknown => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('toolPrefs store', () => {
  const FAV = 'flygaca:tool-favorites';
  const RECENT = 'flygaca:tool-recents';

  it('hydrates favourites and recents from localStorage on import', async () => {
    localStorage.setItem(FAV, JSON.stringify(['crosswind']));
    localStorage.setItem(RECENT, JSON.stringify(['isa', 'mach']));
    const m = await import('@/lib/prefs/toolPrefs');
    // useToolPrefs reads the same module-level snapshot the mutators update.
    expect(m.toggleFavorite).toBeTypeOf('function');
    m.pushRecent('isa'); // moves isa to front, deduped
    expect(read(RECENT)).toEqual(['isa', 'mach']);
  });

  it('toggleFavorite adds then removes, persisting each time', async () => {
    const m = await import('@/lib/prefs/toolPrefs');
    m.toggleFavorite('crosswind');
    expect(read(FAV)).toEqual(['crosswind']);
    m.toggleFavorite('crosswind');
    expect(read(FAV)).toEqual([]);
  });

  it('pushRecent is most-recent-first, deduped and capped at 6', async () => {
    const m = await import('@/lib/prefs/toolPrefs');
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) m.pushRecent(id);
    expect(read(RECENT)).toEqual(['g', 'f', 'e', 'd', 'c', 'b']);
    m.pushRecent('d'); // existing id jumps to the front
    expect(read(RECENT)).toEqual(['d', 'g', 'f', 'e', 'c', 'b']);
  });

  it('ignores corrupt stored values and falls back to empty lists', async () => {
    localStorage.setItem(FAV, '{not json');
    localStorage.setItem(RECENT, JSON.stringify({ not: 'an array' }));
    const m = await import('@/lib/prefs/toolPrefs');
    m.toggleFavorite('x');
    expect(read(FAV)).toEqual(['x']); // started from [], not a crash
  });
});

describe('guidePrefs store', () => {
  const BM = 'flygaca:guide-bookmarks';
  const READ = 'flygaca:guide-read';

  it('toggleBookmark and toggleRead round-trip through localStorage', async () => {
    const m = await import('@/lib/prefs/guidePrefs');
    m.toggleBookmark('wake-turbulence');
    m.toggleRead('wake-turbulence');
    expect(read(BM)).toEqual(['wake-turbulence']);
    expect(read(READ)).toEqual(['wake-turbulence']);
    m.toggleBookmark('wake-turbulence');
    expect(read(BM)).toEqual([]);
  });

  it('markRead is idempotent — a second call does not re-persist a duplicate', async () => {
    const m = await import('@/lib/prefs/guidePrefs');
    m.markRead('vfr-minima');
    m.markRead('vfr-minima');
    expect(read(READ)).toEqual(['vfr-minima']);
  });

  it('hydrates bookmarks from storage and filters non-string entries', async () => {
    localStorage.setItem(BM, JSON.stringify(['a', 5, 'b', null]));
    const m = await import('@/lib/prefs/guidePrefs');
    m.toggleBookmark('c');
    expect(read(BM)).toEqual(['a', 'b', 'c']);
  });
});

describe('libraryPrefs store', () => {
  const BM = 'flygaca:library-bookmarks';
  const RECENT = 'flygaca:library-recents';
  const SEARCH = 'flygaca:library-searches';
  const NOTES = 'flygaca:library-notes';

  const bm = { kind: 'regulations' as const, slug: 'part-91', title: 'Part 91' };

  it('toggleBookmark persists and isBookmarked reflects the live state', async () => {
    const m = await import('@/lib/prefs/libraryPrefs');
    m.toggleBookmark(bm);
    expect(read(BM)).toEqual([bm]);
    // isBookmarked is a pure read over a snapshot.
    expect(
      m.isBookmarked(
        { bookmarks: [bm], recents: [], searches: [], notes: {} },
        'regulations',
        'part-91',
      ),
    ).toBe(true);
    expect(
      m.isBookmarked(
        { bookmarks: [bm], recents: [], searches: [], notes: {} },
        'regulations',
        'part-91',
        'sec-3',
      ),
    ).toBe(false);
    m.toggleBookmark(bm);
    expect(read(BM)).toEqual([]);
  });

  it('recordView keeps a deduped, most-recent-first, capped recents list', async () => {
    const m = await import('@/lib/prefs/libraryPrefs');
    const doc = (slug: string) => ({ kind: 'reference' as const, slug, title: slug });
    for (let i = 0; i < 13; i++) m.recordView(doc(`d${i}`));
    const recents = read(RECENT) as { slug: string }[];
    expect(recents).toHaveLength(12); // RECENT_MAX
    expect(recents[0].slug).toBe('d12');
    m.recordView(doc('d5')); // re-view jumps to the front without growing past the cap
    const after = read(RECENT) as { slug: string }[];
    expect(after[0].slug).toBe('d5');
    expect(after).toHaveLength(12);
  });

  it('saveSearch and removeSearch round-trip by normalised key', async () => {
    const m = await import('@/lib/prefs/libraryPrefs');
    const s = { kind: 'reference' as const, category: 'all', query: '  Fuel ' };
    m.saveSearch(s);
    expect(read(SEARCH)).toEqual([s]);
    m.removeSearch('reference|all|fuel'); // searchKey(s)
    expect(read(SEARCH)).toEqual([]);
  });

  it('addNote and removeNote manage a per-document note list, pruning empties', async () => {
    const m = await import('@/lib/prefs/libraryPrefs');
    const note = (id: string) => ({
      id,
      sectionId: 'h1',
      quote: 'q',
      note: 'n',
      created: '2026-01-01',
    });
    m.addNote('regulations:part-91', note('n1'));
    m.addNote('regulations:part-91', note('n2'));
    expect((read(NOTES) as Record<string, unknown[]>)['regulations:part-91']).toHaveLength(2);
    m.removeNote('regulations:part-91', 'n1');
    expect((read(NOTES) as Record<string, unknown[]>)['regulations:part-91']).toHaveLength(1);
    m.removeNote('regulations:part-91', 'n2'); // last note → the key is dropped entirely
    expect(read(NOTES)).toEqual({});
  });
});
