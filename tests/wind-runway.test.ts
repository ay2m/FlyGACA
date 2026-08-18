import { describe, expect, it } from 'vitest';
import { parseRunways, windTable } from '@/calc/windTable';
import { hydroplaningSpeed } from '@/calc/hydroplaning';
import { factoredRunway } from '@/calc/runwayPerf';

describe('windTable', () => {
  it('computes components for each runway against one wind', () => {
    const rows = windTable(['16', '34'], 190, 20);
    expect(rows).toHaveLength(2);
    const r16 = rows.find((r) => r.label === '16')!;
    expect(r16.heading).toBe(160);
    // wind 190 vs heading 160 → 30° off, mostly headwind
    expect(r16.headwind).toBeGreaterThan(0);
  });
  it('parses mixed separators', () => {
    expect(parseRunways('16L/34R, 07')).toEqual(['16L', '34R', '07']);
  });
});

describe('hydroplaningSpeed', () => {
  it('Vp = 9√P; ~98.6 kt at 120 psi', () => {
    expect(hydroplaningSpeed(120)).toBeCloseTo(98.6, 1);
  });
  it('rejects non-positive pressure', () => {
    expect(hydroplaningSpeed(0)).toBeNull();
  });
});

describe('factoredRunway', () => {
  it('applies DA, slope and safety multipliers', () => {
    const r = factoredRunway({ bookM: 600, daFt: 3000, slopePct: 1, safetyPct: 0 })!;
    // (1+0.30)(1+0.05)(1) = 1.365
    expect(r.factor).toBeCloseTo(1.365, 3);
    expect(r.required).toBeCloseTo(819, 0);
    expect(r.margin).toBeNull();
  });
  it('flags an adequate runway', () => {
    const r = factoredRunway({ bookM: 600, safetyPct: 43, availableM: 1200 })!;
    expect(r.ok).toBe(true);
    expect(r.margin).toBeGreaterThan(0);
  });
});
