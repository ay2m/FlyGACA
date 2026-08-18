import { describe, expect, it } from 'vitest';
import { buildConstellation } from '@/calc/library/constellation';
import type { ConstellationPart } from '@/calc/library/constellation';

const PARTS: ConstellationPart[] = [
  { slug: 'part-1', part: '1', partNum: 1, title: 'Definitions', category: 'general' },
  {
    slug: 'part-61',
    part: '61',
    partNum: 61,
    title: 'Certification',
    category: 'licensing',
    references: ['part-91', 'part-1'],
  },
  {
    slug: 'part-91',
    part: '91',
    partNum: 91,
    title: 'General Operating Rules',
    category: 'operations',
    references: ['part-1', 'part-61', 'part-91', 'part-404'],
  },
  {
    slug: 'part-121',
    part: '121',
    partNum: 121,
    title: 'Air Transport',
    category: 'operations',
    references: ['part-91', 'part-61'],
  },
];

describe('buildConstellation', () => {
  const layout = buildConstellation(PARTS);

  it('is deterministic and places every part on the unit disc', () => {
    expect(buildConstellation(PARTS)).toEqual(layout);
    expect(layout.nodes.length).toBe(PARTS.length);
    for (const n of layout.nodes) {
      expect(Math.hypot(n.x, n.y)).toBeLessThanOrEqual(1);
      expect(n.r).toBeGreaterThan(0);
    }
  });
  it('keeps only edges whose both endpoints exist, no self-loops, no dupes', () => {
    const keys = layout.edges.map((e) => `${e.from}→${e.to}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain('part-91→part-91');
    expect(keys).not.toContain('part-91→part-404');
    expect(keys).toContain('part-61→part-91');
  });
  it('sizes hub parts by inbound references', () => {
    const by = Object.fromEntries(layout.nodes.map((n) => [n.slug, n]));
    // part-91 is referenced by 61 and 121; part-121 by nobody.
    expect(by['part-91'].r).toBeGreaterThan(by['part-121'].r);
  });
  it('spreads categories across distinct sectors', () => {
    const by = Object.fromEntries(layout.nodes.map((n) => [n.slug, n]));
    expect(by['part-1'].catIndex).not.toBe(by['part-61'].catIndex);
    expect(by['part-91'].catIndex).toBe(by['part-121'].catIndex);
  });
  it('handles an empty corpus', () => {
    expect(buildConstellation([])).toEqual({ nodes: [], edges: [] });
  });
});
