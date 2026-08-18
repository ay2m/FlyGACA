import { describe, expect, it } from 'vitest';
import { altimeter, flightLevel, qfeToQnh, qnhToQfe, trueAltitude } from '@/calc/altimetry';

describe('trueAltitude', () => {
  it('warm air → true altitude above indicated', () => {
    // 10,000 ft indicated, sea-level source, OAT 0°C.
    // ISA temp at 10,000 ft = 15 − 19.8 = −4.8°C; ISA dev = +4.8°C.
    // correction = 4 × 4.8 × 10 = 192 ft → true ≈ 10,192 ft.
    const r = trueAltitude(10000, 0, 0)!;
    expect(r.isaDevC).toBeCloseTo(4.8, 1);
    expect(r.correctionFt).toBeCloseTo(192, 0);
    expect(r.trueAltFt).toBeCloseTo(10192, 0);
  });
  it('no correction when there is no height above the source', () => {
    expect(trueAltitude(2000, 2000, -30)!.correctionFt).toBeCloseTo(0, 6);
  });
  it('rejects a non-number', () => {
    expect(trueAltitude(NaN, 0, 0)).toBeNull();
  });
});

describe('flightLevel', () => {
  it('rounds pressure altitude to the nearest 100 ft', () => {
    expect(flightLevel(35000)).toBe(350);
    expect(flightLevel(8250)).toBe(83);
  });
});

describe('QNH/QFE conversion', () => {
  it('QFE is lower than QNH by ~1 hPa per 27.3 ft of elevation', () => {
    expect(qnhToQfe(1013, 273)).toBeCloseTo(1003, 0);
  });
  it('round-trips QNH → QFE → QNH', () => {
    const qfe = qnhToQfe(1008, 500)!;
    expect(qfeToQnh(qfe, 500)).toBeCloseTo(1008, 6);
  });
});

describe('altimeter', () => {
  it('returns QFE and pressure altitude together', () => {
    const r = altimeter(1013.25, 2000);
    expect(r).not.toBeNull();
    expect(r!.pressureAltitude).toBeCloseTo(2000, 5);
    expect(r!.qfe).toBeLessThan(1013.25);
  });
});
