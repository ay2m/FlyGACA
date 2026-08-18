import { describe, expect, it } from 'vitest';
import {
  toggleBy,
  addRecentBy,
  bookmarkKey,
  docKey,
  searchKey,
  type LibBookmark,
  type LibDoc,
  type SavedSearch,
} from '@/lib/prefs/libraryPrefs';

const doc = (slug: string): LibDoc => ({ kind: 'regulations', slug, title: slug });

describe('keys', () => {
  it('docKey and bookmarkKey distinguish sections from whole docs', () => {
    expect(docKey({ kind: 'regulations', slug: 'part-91' })).toBe('regulations:part-91');
    expect(bookmarkKey({ kind: 'regulations', slug: 'part-91' })).toBe('regulations:part-91');
    expect(bookmarkKey({ kind: 'regulations', slug: 'part-91', anchor: 'sec-3' })).toBe(
      'regulations:part-91#sec-3',
    );
  });

  it('searchKey normalises the query', () => {
    const s: SavedSearch = { kind: 'reference', category: 'all', query: '  Fuel  ' };
    expect(searchKey(s)).toBe('reference|all|fuel');
  });
});

describe('toggleBy', () => {
  it('adds a bookmark when absent and removes it when present', () => {
    const a: LibBookmark = { kind: 'regulations', slug: 'part-91', title: 'Part 91' };
    expect(toggleBy([], a, bookmarkKey)).toEqual([a]);
    expect(toggleBy([a], a, bookmarkKey)).toEqual([]);
  });

  it('treats a section bookmark as distinct from its document', () => {
    const whole: LibBookmark = { kind: 'regulations', slug: 'part-91', title: 'Part 91' };
    const sec: LibBookmark = { ...whole, anchor: 'sec-3', anchorText: '§3' };
    expect(toggleBy([whole], sec, bookmarkKey)).toEqual([whole, sec]);
  });
});

describe('addRecentBy', () => {
  it('prepends most-recent-first and de-duplicates by key', () => {
    const list = [doc('a'), doc('b')];
    expect(addRecentBy(list, doc('c'), docKey, 12).map((d) => d.slug)).toEqual(['c', 'a', 'b']);
    expect(addRecentBy(list, doc('a'), docKey, 12).map((d) => d.slug)).toEqual(['a', 'b']);
  });

  it('caps the list at max, dropping the oldest', () => {
    const list = [doc('a'), doc('b'), doc('c')];
    expect(addRecentBy(list, doc('d'), docKey, 3).map((d) => d.slug)).toEqual(['d', 'a', 'b']);
  });
});
