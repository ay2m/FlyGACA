import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script helper, no types ship with it.
import {
  COLLECTIONS,
  projectRecord,
  partitionByBody,
  mergeIndex,
} from '../scripts/lib/sync-merge.mjs';

const ac = COLLECTIONS.ac;

describe('projectRecord', () => {
  it('strips agent-only fields but keeps provenance', () => {
    const out = projectRecord({
      kind: 'ac',
      slug: 'gaca-ac-091-05',
      title: 'A circular',
      revision: 'Rev 2',
      effectiveDate: '2026-05-20',
      contentHash: 'abc123',
      sourceUrl: 'https://example/ac',
      body: { format: 'pdf', assetPath: 'x.pdf' },
    });
    expect(out).not.toHaveProperty('kind');
    expect(out).not.toHaveProperty('body');
    expect(out).toMatchObject({
      slug: 'gaca-ac-091-05',
      title: 'A circular',
      revision: 'Rev 2',
      effectiveDate: '2026-05-20',
      contentHash: 'abc123',
      sourceUrl: 'https://example/ac',
    });
  });
});

describe('partitionByBody', () => {
  it('separates body-bearing records from metadata-only ones', () => {
    const { metadata, deferred } = partitionByBody([
      { slug: 'a' },
      { slug: 'b', body: { format: 'pdf', assetPath: 'b.pdf' } },
      { slug: 'c' },
    ]);
    expect(metadata.map((r) => r.slug)).toEqual(['a', 'c']);
    expect(deferred.map((r) => r.slug)).toEqual(['b']);
  });
});

describe('mergeIndex', () => {
  const baseIndex = () => ({
    generated: '2026-01-01',
    count: 2,
    documents: [
      { slug: 'ac-1', title: 'One' },
      { slug: 'ac-2', title: 'Two' },
    ],
  });

  it('appends new records (projected) and bumps count', () => {
    const idx = baseIndex();
    const { index, added, updated } = mergeIndex(idx, ac, {
      newRecs: [{ kind: 'ac', slug: 'ac-3', title: 'Three', body: { format: 'pdf' } }],
    });
    expect(added).toBe(1);
    expect(updated).toBe(0);
    expect(index.count).toBe(3);
    const added3 = index.documents.find((r: { slug: string }) => r.slug === 'ac-3');
    expect(added3).toEqual({ slug: 'ac-3', title: 'Three' });
  });

  it('replaces a changed record in place without reordering', () => {
    const idx = baseIndex();
    const { index, added, updated } = mergeIndex(idx, ac, {
      changedRecs: [{ kind: 'ac', slug: 'ac-1', title: 'One (rev)', revision: 'Rev 2' }],
    });
    expect(added).toBe(0);
    expect(updated).toBe(1);
    expect(index.documents.map((r: { slug: string }) => r.slug)).toEqual(['ac-1', 'ac-2']);
    expect(index.documents[0]).toEqual({ slug: 'ac-1', title: 'One (rev)', revision: 'Rev 2' });
  });

  it('does not mutate the input index', () => {
    const idx = baseIndex();
    mergeIndex(idx, ac, {
      newRecs: [{ kind: 'ac', slug: 'ac-9', title: 'Nine' }],
      changedRecs: [{ kind: 'ac', slug: 'ac-2', title: 'Two (rev)' }],
    });
    expect(idx.count).toBe(2);
    expect(idx.documents).toHaveLength(2);
    expect(idx.documents[1]).toEqual({ slug: 'ac-2', title: 'Two' });
  });
});
