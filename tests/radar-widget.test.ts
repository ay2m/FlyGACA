/**
 * src/components/bento/widgets/RadarWidget.tsx — the pure `buildBlips` helper that maps
 * the GACAR corpus onto the radar scope (canvas paint is E2E/manual territory). Pins the
 * empty guards and the deterministic angle/radius/label mapping.
 */
import { describe, it, expect } from 'vitest';
import type { GacarIndex, GacarDocument } from '@/lib/content';
import { buildBlips } from '@/components/bento/widgets/RadarWidget';

const doc = (over: Partial<GacarDocument>): GacarDocument => ({
  part: 'Part 91',
  partNum: 91,
  title: 'General Operating Rules',
  category: 'operations',
  slug: 'part-91',
  pages: 50,
  ...over,
});

const index = (over: Partial<GacarIndex>): GacarIndex => ({
  generated: '2026-01-01',
  source: 'GACAR',
  sourceUrl: 'https://example.test',
  count: 0,
  categories: [
    { id: 'operations', label: 'Operations' },
    { id: 'airworthiness', label: 'Airworthiness' },
  ],
  documents: [],
  ...over,
});

describe('buildBlips — guards', () => {
  it('returns [] for null/undefined data', () => {
    expect(buildBlips(null)).toEqual([]);
    expect(buildBlips(undefined)).toEqual([]);
  });

  it('returns [] when there are no documents', () => {
    expect(buildBlips(index({ documents: [] }))).toEqual([]);
  });
});

describe('buildBlips — mapping', () => {
  it('produces one blip per document with a composed title', () => {
    const blips = buildBlips(
      index({
        documents: [
          doc({ part: 'Part 91', title: 'Ops', category: 'operations', pages: 40 }),
          doc({ part: 'Part 21', title: 'Cert', category: 'airworthiness', pages: 120 }),
        ],
      }),
    );
    expect(blips).toHaveLength(2);
    expect(blips[0].title).toBe('Part 91 · Ops');
    expect(blips[1].title).toBe('Part 21 · Cert');
  });

  it('pushes deeper (higher page-count) Parts further out and makes them larger/brighter', () => {
    const blips = buildBlips(
      index({
        documents: [
          doc({ part: 'A', category: 'operations', pages: 10 }), // shallowest
          doc({ part: 'B', category: 'operations', pages: 200 }), // deepest
        ],
      }),
    );
    const [shallow, deep] = blips;
    // depth 0 → radiusFrac 0.4; depth 1 → 0.92.
    expect(shallow.radiusFrac).toBeCloseTo(0.4, 5);
    expect(deep.radiusFrac).toBeCloseTo(0.92, 5);
    expect(deep.size).toBeGreaterThan(shallow.size);
    expect(deep.bright).toBeGreaterThan(shallow.bright);
  });

  it('is deterministic — identical input yields identical output', () => {
    const data = index({ documents: [doc({ pages: 33 }), doc({ part: 'Part 25', pages: 77 })] });
    expect(buildBlips(data)).toEqual(buildBlips(data));
  });

  it('places a document from an unknown category in the first sector rather than dropping it', () => {
    const blips = buildBlips(index({ documents: [doc({ category: 'nonexistent' })] }));
    expect(blips).toHaveLength(1);
    expect(Number.isFinite(blips[0].angle)).toBe(true);
  });
});
