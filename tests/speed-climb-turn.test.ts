import { describe, expect, it } from 'vitest';
import { machFromTas, speedOfSound, tasFromMach } from '@/calc/speed';
import { climbFromFtPerNm, ftPerNmFromPercent, timeToClimb } from '@/calc/climb';
import { standardRateTurn, turnPerformance } from '@/calc/turn';

describe('speed of sound & Mach', () => {
  it('a ≈ 661 kt at ISA sea level (15°C)', () => {
    expect(speedOfSound(15)).toBeCloseTo(661.5, 0);
  });
  it('TAS → Mach and back are consistent', () => {
    const m = machFromTas(300, -45)!;
    expect(m.mach).toBeGreaterThan(0);
    expect(tasFromMach(m.mach, -45)!.tas).toBeCloseTo(300, 6);
  });
});

describe('climb gradient', () => {
  it('318 ft/NM ≈ 3.0° ≈ 5.2%', () => {
    const r = climbFromFtPerNm(318)!;
    expect(r.degrees).toBeCloseTo(3.0, 1);
    expect(r.percent).toBeCloseTo(5.23, 1);
  });
  it('fpm scales with groundspeed', () => {
    expect(climbFromFtPerNm(318, 120)!.fpm).toBeCloseTo(636, 0);
  });
  it('converts percent to ft/NM', () => {
    expect(ftPerNmFromPercent(5)).toBeCloseTo(303.8, 0);
  });
});

describe('standard-rate turn', () => {
  it('~18° bank and ~0.64 NM radius at 120 kt', () => {
    const r = standardRateTurn(120)!;
    expect(r.bankDeg).toBeCloseTo(18.2, 0);
    expect(r.radiusNm).toBeCloseTo(0.64, 1);
    expect(r.ruleOfThumbDeg).toBe(19);
  });
});

describe('time to climb', () => {
  it('10,000 ft at 500 fpm and 120 kt → 20 min, 40 NM', () => {
    const r = timeToClimb(10000, 500, 120)!;
    expect(r.timeMin).toBeCloseTo(20, 6);
    expect(r.distNm).toBeCloseTo(40, 6);
    expect(r.fuel).toBeNull();
  });
  it('adds fuel when a flow is given (15/hr over 20 min = 5)', () => {
    expect(timeToClimb(10000, 500, 120, 15)!.fuel).toBeCloseTo(5, 6);
  });
  it('rejects a zero/negative climb rate', () => {
    expect(timeToClimb(10000, 0, 120)).toBeNull();
  });
});

describe('turn performance', () => {
  it('30° bank at 120 kt → ~5.25°/s and ~0.36 NM radius', () => {
    const r = turnPerformance(120, 30)!;
    expect(r.rateDegSec).toBeCloseTo(5.25, 1);
    expect(r.radiusNm).toBeCloseTo(0.36, 1);
    expect(r.radiusFt).toBeCloseTo(2215, -1);
  });
  it('rejects bank at or beyond 90°', () => {
    expect(turnPerformance(120, 90)).toBeNull();
    expect(turnPerformance(120, 0)).toBeNull();
  });
});
