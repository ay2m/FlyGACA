import { describe, expect, it } from 'vitest';
import { formatHours, fuelPlan, specificRange } from '@/calc/fuel';
import { cgEnvelopeStatus, percentMac, weightBalance } from '@/calc/weightBalance';

describe('fuelPlan', () => {
  it('endurance = fob ÷ burn; range scales with groundspeed', () => {
    const r = fuelPlan(120, 30, 110)!;
    expect(r.enduranceHr).toBeCloseTo(4, 6);
    expect(r.rangeNm).toBeCloseTo(440, 6);
  });
  it('range is 0 without a groundspeed', () => {
    expect(fuelPlan(120, 30, NaN)!.rangeNm).toBe(0);
  });
});

describe('specificRange', () => {
  it('NM per unit = groundspeed ÷ flow', () => {
    expect(specificRange(120, 40)).toBeCloseTo(3, 6);
  });
});

describe('formatHours', () => {
  it('formats decimal hours', () => {
    expect(formatHours(4.5)).toBe('4h 30m');
    expect(formatHours(2.999)).toBe('3h 00m');
  });
});

describe('weightBalance', () => {
  it('computes total weight and CG', () => {
    const r = weightBalance([
      { weight: 1000, arm: 36 },
      { weight: 340, arm: 37 },
      { weight: 200, arm: 48 },
    ])!;
    expect(r.weight).toBe(1540);
    expect(r.cg).toBeCloseTo(37.78, 1);
  });
  it('ignores empty stations and returns null when nothing is loaded', () => {
    expect(weightBalance([{ weight: 0, arm: 10 }])).toBeNull();
  });
  it('computes %MAC', () => {
    expect(percentMac(37.66, 35, 5)).toBeCloseTo(53.2, 1);
  });
});

describe('cgEnvelopeStatus', () => {
  const limits = { cgFwd: 35, cgAft: 47, mtow: 2450 };
  it('is "in" when weight and CG sit within every limit', () => {
    expect(cgEnvelopeStatus(2000, 40, limits)).toBe('in');
    expect(cgEnvelopeStatus(2450, 35, limits)).toBe('in'); // on the boundary
  });
  it('is "out" when any bound is exceeded', () => {
    expect(cgEnvelopeStatus(2000, 34, limits)).toBe('out'); // fwd of limit
    expect(cgEnvelopeStatus(2000, 48, limits)).toBe('out'); // aft of limit
    expect(cgEnvelopeStatus(2600, 40, limits)).toBe('out'); // over gross
  });
  it('only checks the limits that are provided', () => {
    expect(cgEnvelopeStatus(9999, 40, { cgFwd: 35, cgAft: 47, mtow: NaN })).toBe('in');
    expect(cgEnvelopeStatus(2000, 40, { cgFwd: NaN, cgAft: NaN, mtow: 2450 })).toBe('in');
  });
  it('is "unknown" with no valid point or no usable limit', () => {
    expect(cgEnvelopeStatus(NaN, 40, limits)).toBe('unknown');
    expect(cgEnvelopeStatus(2000, 40, { cgFwd: NaN, cgAft: NaN, mtow: NaN })).toBe('unknown');
  });
  it('ignores an inverted forward/aft CG pair instead of reporting a false out', () => {
    // cgAft <= cgFwd is bad data — the CG bounds are dropped, not failed.
    expect(cgEnvelopeStatus(2000, 40, { cgFwd: 47, cgAft: 35, mtow: 2450 })).toBe('in');
    expect(cgEnvelopeStatus(2000, 40, { cgFwd: 47, cgAft: 35, mtow: NaN })).toBe('unknown');
  });
});
