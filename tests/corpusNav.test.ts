import { describe, expect, it } from 'vitest';
import { asDate, docNeighbors, relatedDocs } from '@/calc/library/corpusNav';
import type { CorpusDoc } from '@/lib/content';

const doc = (slug: string, category: string): CorpusDoc => ({ slug, title: slug, category });

const docs: CorpusDoc[] = [
  doc('part-1', 'general'),
  doc('part-61', 'licensing'),
  doc('part-67', 'licensing'),
  doc('part-91', 'airspace'),
];

describe('docNeighbors', () => {
  it('returns the surrounding documents in index order', () => {
    expect(docNeighbors(docs, 'part-61')).toEqual({ prev: docs[0], next: docs[2] });
  });

  it('clamps at the ends', () => {
    expect(docNeighbors(docs, 'part-1').prev).toBeNull();
    expect(docNeighbors(docs, 'part-91').next).toBeNull();
  });

  it('returns nulls for an unknown or missing slug', () => {
    expect(docNeighbors(docs, 'nope')).toEqual({ prev: null, next: null });
    expect(docNeighbors(docs, undefined)).toEqual({ prev: null, next: null });
  });
});

describe('relatedDocs', () => {
  it('returns same-category docs excluding the current one', () => {
    expect(relatedDocs(docs, 'part-61').map((d) => d.slug)).toEqual(['part-67']);
  });

  it('respects the limit', () => {
    const many = [doc('a', 'x'), doc('b', 'x'), doc('c', 'x'), doc('d', 'x'), doc('e', 'x')];
    expect(relatedDocs(many, 'a', 2)).toHaveLength(2);
  });

  it('is empty for an unknown slug or a lone category', () => {
    expect(relatedDocs(docs, 'nope')).toEqual([]);
    expect(relatedDocs(docs, 'part-91')).toEqual([]);
  });
});

describe('asDate', () => {
  it('truncates a date-shaped string to YYYY-MM-DD', () => {
    expect(asDate('2026-07-23')).toBe('2026-07-23');
    expect(asDate('2026-07-23T09:00:00Z')).toBe('2026-07-23');
  });

  it('is undefined for a non-date string, empty, or missing value', () => {
    expect(asDate('Rev. 3')).toBeUndefined();
    expect(asDate('2026')).toBeUndefined();
    expect(asDate('')).toBeUndefined();
    expect(asDate(undefined)).toBeUndefined();
  });
});
