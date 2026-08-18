import { describe, expect, it } from 'vitest';
import { densityAltitude, isaDeviation, pressureAltitude } from '@/calc/isa';

describe('pressureAltitude', () => {
  it('returns field elevation at standard pressure', () => {
    expect(pressureAltitude(2000, 1013.25)).toBeCloseTo(2000, 5);
  });
  it('rises ~27.3 ft per hPa below standard', () => {
    expect(pressureAltitude(0, 1003.25)).toBeCloseTo(273, 1);
  });
  it('supports inHg', () => {
    expect(pressureAltitude(0, 28.92, 'inhg')).toBeCloseTo(1000, 5);
  });
});

describe('densityAltitude', () => {
  it('computes DA for a hot day at elevation', () => {
    // 5000 ft, QNH 1013.25, OAT 30°C → ISA there is 5°C, so +25 ISA dev.
    const r = densityAltitude(5000, 1013.25, 30);
    expect(r).not.toBeNull();
    expect(r!.pa).toBeCloseTo(5000, 5);
    expect(r!.isaTemp).toBeCloseTo(5.1, 1);
    expect(r!.isaDev).toBeCloseTo(24.9, 1);
    expect(r!.da).toBeCloseTo(5000 + 118.8 * 24.9, 0);
  });
  it('returns null on bad input', () => {
    expect(densityAltitude(NaN, 1013, 20)).toBeNull();
  });
});

describe('isaDeviation', () => {
  it('is zero in standard conditions at sea level', () => {
    expect(isaDeviation(15, 0)).toBeCloseTo(0, 5);
  });
});
