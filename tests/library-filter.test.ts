import { describe, expect, it } from 'vitest';
import {
  compareDocs,
  filterDocs,
  filterSearchHits,
  groupByCategory,
} from '@/calc/library/libraryFilter';
import type { CorpusDoc, SearchEntry, SearchRef } from '@/lib/content';

// The Library hub's browse/search behavior: category + needle filtering with
// the part/badge match paths, per-sort ordering with title tie-breaks, index-
// ordered grouping, and the corpus/category scoping + cap of full-text hits.

const doc = (over: Partial<CorpusDoc>): CorpusDoc =>
  ({ slug: 's', title: 'T', category: 'ops', ...over }) as CorpusDoc;

const DOCS: CorpusDoc[] = [
  doc({
    slug: 'p91',
    title: 'General operating rules',
    category: 'ops',
    part: '91',
    partNum: 91,
    pages: 120,
  }),
  doc({ slug: 'p61', title: 'Licensing', category: 'crew', part: '61', partNum: 61, pages: 300 }),
  doc({
    slug: 'ac1',
    title: 'Airworthiness circular',
    category: 'air',
    badge: 'AC 21-1',
    sections: 12,
  }),
];

describe('compareDocs / filterDocs', () => {
  it('sorts by part number, then falls back to title on ties', () => {
    const out = filterDocs(DOCS, 'all', '', 'part');
    expect(out.map((d) => d.slug)).toEqual(['ac1', 'p61', 'p91']); // missing partNum → 0 first
  });

  it('size sort is descending pages-or-sections with title tie-break', () => {
    const out = filterDocs(DOCS, 'all', '', 'size');
    expect(out.map((d) => d.slug)).toEqual(['p61', 'p91', 'ac1']);
    const tied = [
      doc({ slug: 'b', title: 'Bravo', pages: 10 }),
      doc({ slug: 'a', title: 'Alpha', pages: 10 }),
    ];
    expect(tied.sort((x, y) => compareDocs(x, y, 'size')).map((d) => d.slug)).toEqual(['a', 'b']);
  });

  it('matches needle against title, "part <n>" token, and badge', () => {
    expect(filterDocs(DOCS, 'all', 'licensing', 'title').map((d) => d.slug)).toEqual(['p61']);
    expect(filterDocs(DOCS, 'all', 'part 91', 'title').map((d) => d.slug)).toEqual(['p91']);
    expect(filterDocs(DOCS, 'all', 'ac 21', 'title').map((d) => d.slug)).toEqual(['ac1']);
  });

  it('scopes to a category chip', () => {
    expect(filterDocs(DOCS, 'crew', '', 'title').map((d) => d.slug)).toEqual(['p61']);
    expect(filterDocs(DOCS, 'none', '', 'title')).toEqual([]);
  });
});

describe('groupByCategory', () => {
  it('groups in the index category order, skipping empty categories', () => {
    const cats = [
      { id: 'air', label: 'Airworthiness' },
      { id: 'crew', label: 'Crew' },
      { id: 'unused', label: 'Unused' },
      { id: 'ops', label: 'Operations' },
    ];
    const groups = groupByCategory(cats, DOCS);
    expect(groups.map((g) => g.id)).toEqual(['air', 'crew', 'ops']);
    expect(groups[0].docs.map((d) => d.slug)).toEqual(['ac1']);
  });
});

describe('filterSearchHits', () => {
  const entry = (over: Partial<SearchEntry>): SearchEntry =>
    ({ d: 'doc title', ...over }) as SearchEntry;
  const resolve = (e: SearchEntry): SearchRef | null =>
    e.id ? { kind: (e.kind as SearchRef['kind']) ?? 'regulations', id: e.id } : null;

  const ENTRIES: SearchEntry[] = [
    entry({ d: 'VFR minima', id: 'p91', kind: 'regulations' }),
    entry({ d: 'VFR charts', id: 'ch1', kind: 'reference' }),
    entry({ d: 'unrelated', x: 'mentions vfr in excerpt', id: 'p61', kind: 'regulations' }),
    entry({ d: 'VFR unroutable' }), // resolver returns null → dropped
  ];

  it('matches title or excerpt, scoped to the active corpus', () => {
    const docCat = new Map([
      ['p91', 'ops'],
      ['p61', 'crew'],
    ]);
    const out = filterSearchHits(ENTRIES, 'vfr', 'regulations', 'all', docCat, 10, resolve);
    expect(out.map((e) => e.id)).toEqual(['p91', 'p61']);
  });

  it('honours the category chip and the hit cap', () => {
    const docCat = new Map([
      ['p91', 'ops'],
      ['p61', 'crew'],
    ]);
    expect(
      filterSearchHits(ENTRIES, 'vfr', 'regulations', 'crew', docCat, 10, resolve).map((e) => e.id),
    ).toEqual(['p61']);
    expect(filterSearchHits(ENTRIES, 'vfr', 'regulations', 'all', docCat, 1, resolve)).toHaveLength(
      1,
    );
  });
});
