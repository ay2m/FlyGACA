import { describe, expect, it } from 'vitest';
import { trueAirspeed } from '@/calc/tas';

describe('trueAirspeed', () => {
  it('TAS exceeds CAS with altitude', () => {
    const r = trueAirspeed({ cas: 110, pa: 8000, oat: 10 });
    expect(r).not.toBeNull();
    expect(r!.tas).toBeGreaterThan(110);
    // ~126.5 kt for this classic worked example
    expect(r!.tas).toBeCloseTo(126.5, 0);
    expect(r!.mach).toBeGreaterThan(0);
    expect(r!.mach).toBeLessThan(1);
  });

  it('TAS ≈ CAS at sea level in standard air', () => {
    const r = trueAirspeed({ cas: 100, pa: 0, oat: 15 });
    expect(r!.tas).toBeCloseTo(100, 0);
  });

  it('returns null on incomplete input', () => {
    expect(trueAirspeed({ cas: 100, pa: NaN, oat: 15 })).toBeNull();
  });
});
