import { describe, expect, it } from 'vitest';
import { convertAll } from '@/calc/units';

describe('convertAll', () => {
  it('converts knots to other speeds', () => {
    const r = convertAll(100, 'kt', 'speed')!;
    expect(r.kt).toBe(100);
    expect(r['km/h']).toBeCloseTo(185.2, 0);
    expect(r.mph).toBeCloseTo(115.08, 1);
  });
  it('converts feet to metres', () => {
    expect(convertAll(1000, 'ft', 'altitude')!.m).toBeCloseTo(304.8, 1);
  });
  it('handles temperature relations', () => {
    const r = convertAll(0, '°C', 'temperature')!;
    expect(r['°F']).toBeCloseTo(32, 6);
    expect(r.K).toBeCloseTo(273.15, 6);
    expect(convertAll(212, '°F', 'temperature')!['°C']).toBeCloseTo(100, 6);
  });
  it('returns null on bad input', () => {
    expect(convertAll(NaN, 'kt', 'speed')).toBeNull();
    expect(convertAll(1, 'nope', 'speed')).toBeNull();
  });
});
