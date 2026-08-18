/**
 * Store-layer tests for the Library prefs (the pure key/transform helpers are
 * covered in library-prefs.test.ts). Exercises hydration from localStorage and
 * the mutators that persist + notify, which were previously uncovered.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { freshModule } from './helpers/freshModule';
import { renderHook, act } from '@testing-library/react';
import type { LibBookmark, LibDoc, LibNote, SavedSearch } from '@/lib/prefs/libraryPrefs';

beforeEach(() => localStorage.clear());

const doc = (slug: string): LibDoc => ({ kind: 'regulations', slug, title: slug });
const note = (id: string): LibNote => ({
  id,
  sectionId: 'sec-1',
  quote: 'q',
  note: 'n',
  created: '2026-01-01',
});

describe('hydration', () => {
  it('reads existing bookmarks/recents/searches/notes from localStorage', async () => {
    localStorage.setItem(
      'flygaca:library-bookmarks',
      JSON.stringify([{ kind: 'regulations', slug: 'part-91', title: 'Part 91' }]),
    );
    localStorage.setItem('flygaca:library-recents', JSON.stringify([doc('part-1')]));
    const mod = await freshModule<typeof import('@/lib/prefs/libraryPrefs')>(
      () => import('@/lib/prefs/libraryPrefs'),
    );
    const { result } = renderHook(() => mod.useLibraryPrefs());
    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.recents[0].slug).toBe('part-1');
  });

  it('falls back to empty state on corrupt JSON', async () => {
    localStorage.setItem('flygaca:library-bookmarks', '{not json');
    const mod = await freshModule<typeof import('@/lib/prefs/libraryPrefs')>(
      () => import('@/lib/prefs/libraryPrefs'),
    );
    const { result } = renderHook(() => mod.useLibraryPrefs());
    expect(result.current.bookmarks).toEqual([]);
    expect(result.current.notes).toEqual({});
  });
});

describe('toggleBookmark', () => {
  it('adds then removes a bookmark, persisting each time', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/libraryPrefs')>(
      () => import('@/lib/prefs/libraryPrefs'),
    );
    const { result } = renderHook(() => mod.useLibraryPrefs());
    const bm: LibBookmark = { kind: 'regulations', slug: 'part-91', title: 'Part 91' };

    act(() => mod.toggleBookmark(bm));
    expect(result.current.bookmarks).toHaveLength(1);
    expect(mod.isBookmarked(result.current, 'regulations', 'part-91')).toBe(true);
    expect(JSON.parse(localStorage.getItem('flygaca:library-bookmarks')!)).toHaveLength(1);

    act(() => mod.toggleBookmark(bm));
    expect(result.current.bookmarks).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('flygaca:library-bookmarks')!)).toHaveLength(0);
  });

  it('treats a section anchor as a distinct bookmark', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/libraryPrefs')>(
      () => import('@/lib/prefs/libraryPrefs'),
    );
    const { result } = renderHook(() => mod.useLibraryPrefs());
    act(() => mod.toggleBookmark({ kind: 'regulations', slug: 'part-91', title: 'P' }));
    act(() =>
      mod.toggleBookmark({ kind: 'regulations', slug: 'part-91', title: 'P', anchor: 's3' }),
    );
    expect(result.current.bookmarks).toHaveLength(2);
    expect(mod.isBookmarked(result.current, 'regulations', 'part-91', 's3')).toBe(true);
  });
});

describe('recordView', () => {
  it('moves a re-viewed doc to the front and caps the list at 12', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/libraryPrefs')>(
      () => import('@/lib/prefs/libraryPrefs'),
    );
    const { result } = renderHook(() => mod.useLibraryPrefs());
    for (let i = 0; i < 14; i++) act(() => mod.recordView(doc(`d${i}`)));
    expect(result.current.recents).toHaveLength(12);
    act(() => mod.recordView(doc('d5')));
    expect(result.current.recents[0].slug).toBe('d5');
    expect(result.current.recents).toHaveLength(12);
  });
});

describe('saveSearch / removeSearch', () => {
  it('saves de-duplicated by normalized key and removes by key', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/libraryPrefs')>(
      () => import('@/lib/prefs/libraryPrefs'),
    );
    const { result } = renderHook(() => mod.useLibraryPrefs());
    const s: SavedSearch = { kind: 'regulations', category: 'all', query: 'VMC' };
    act(() => mod.saveSearch(s));
    act(() => mod.saveSearch({ ...s, query: ' vmc ' })); // same normalized key
    expect(result.current.searches).toHaveLength(1);

    act(() => mod.removeSearch(mod.searchKey(s)));
    expect(result.current.searches).toHaveLength(0);
  });
});

describe('addNote / removeNote', () => {
  it('appends notes under a doc key and deletes the key when empty', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/libraryPrefs')>(
      () => import('@/lib/prefs/libraryPrefs'),
    );
    const { result } = renderHook(() => mod.useLibraryPrefs());
    const dk = mod.docKey(doc('part-91'));

    act(() => mod.addNote(dk, note('n1')));
    act(() => mod.addNote(dk, note('n2')));
    expect(result.current.notes[dk]).toHaveLength(2);

    act(() => mod.removeNote(dk, 'n1'));
    expect(result.current.notes[dk]).toHaveLength(1);

    act(() => mod.removeNote(dk, 'n2'));
    expect(result.current.notes[dk]).toBeUndefined();
  });
});
