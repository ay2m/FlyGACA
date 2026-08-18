import { describe, expect, it } from 'vitest';
import { resolveCrosswind, runwayHeading } from '@/calc/crosswind';

describe('runwayHeading', () => {
  it('expands a runway designator (≤36) to a heading', () => {
    expect(runwayHeading(34)).toBe(340);
    expect(runwayHeading(9)).toBe(90);
    expect(runwayHeading(36)).toBe(0);
  });

  it('treats values > 36 as a heading already', () => {
    expect(runwayHeading(340)).toBe(340);
    expect(runwayHeading(95)).toBe(95);
  });

  it('rejects non-numbers and zero', () => {
    expect(runwayHeading(NaN)).toBeNull();
    expect(runwayHeading(0)).toBeNull();
  });
});

describe('resolveCrosswind', () => {
  it('resolves runway 34 / wind 290@18 into its components', () => {
    const r = resolveCrosswind({ runway: 34, windDir: 290, windSpeed: 18 });
    expect(r).not.toBeNull();
    expect(r!.runwayHeading).toBe(340);
    expect(r!.angle).toBe(-50);
    // crosswind from the left (negative), ~13.8 kt
    expect(r!.crosswind).toBeCloseTo(-13.79, 1);
    // headwind component (positive), ~11.6 kt
    expect(r!.headwind).toBeCloseTo(11.57, 1);
  });

  it('reports a pure headwind when the wind is straight down the runway', () => {
    const r = resolveCrosswind({ runway: 36, windDir: 360, windSpeed: 20 });
    expect(r!.angle).toBe(0);
    expect(r!.crosswind).toBeCloseTo(0, 6);
    expect(r!.headwind).toBeCloseTo(20, 6);
  });

  it('returns a negative headwind (tailwind) for a wind from behind', () => {
    const r = resolveCrosswind({ runway: 36, windDir: 180, windSpeed: 15 });
    expect(r!.headwind).toBeCloseTo(-15, 6);
  });

  it('returns null on incomplete input', () => {
    expect(resolveCrosswind({ runway: 34, windDir: NaN, windSpeed: 18 })).toBeNull();
  });
});
