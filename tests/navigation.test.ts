import { describe, expect, it } from 'vitest';
import { greatCircle, oneInSixty, pivotalAltitude, windTriangle } from '@/calc/navigation';
import { topOfDescent, visualDescentPoint } from '@/calc/descent';
import { solveTsd } from '@/calc/tsd';

describe('pivotalAltitude', () => {
  it('100 kt GS → ~885 ft', () => {
    expect(pivotalAltitude(100)).toBeCloseTo(884.96, 1);
  });
  it('scales with the square of groundspeed', () => {
    expect(pivotalAltitude(120)!).toBeCloseTo(1274.3, 0);
  });
  it('rejects a non-number', () => {
    expect(pivotalAltitude(NaN)).toBeNull();
  });
});

describe('windTriangle', () => {
  it('pure headwind reduces groundspeed, no drift', () => {
    const r = windTriangle(360, 100, 360, 20)!;
    expect(r.wca).toBeCloseTo(0, 6);
    expect(r.groundSpeed).toBeCloseTo(80, 6);
  });
  it('drifts into a crosswind from the right', () => {
    const r = windTriangle(360, 100, 90, 20)!;
    expect(r.wca).toBeGreaterThan(0); // correct to the right
    // course 360/000 + ~11.5° correction → heading ~011°
    expect(r.heading).toBeGreaterThan(5);
    expect(r.heading).toBeLessThan(20);
  });
});

describe('greatCircle', () => {
  it('OERK → OEJN ≈ 460 NM heading roughly west', () => {
    const r = greatCircle(24.96, 46.7, 21.68, 39.16)!;
    expect(r.distanceNm).toBeGreaterThan(400);
    expect(r.distanceNm).toBeLessThan(520);
    expect(r.bearingDeg).toBeGreaterThan(220);
    expect(r.bearingDeg).toBeLessThan(270);
  });
});

describe('oneInSixty', () => {
  it('2 NM off after 30 NM ≈ 4° track error', () => {
    expect(oneInSixty(30, 2, 30)!.trackErrorDeg).toBeCloseTo(4, 6);
  });
  it('adds a closing angle for the distance to go', () => {
    const r = oneInSixty(30, 2, 30)!;
    expect(r.correctionDeg).toBeCloseTo(8, 6);
  });
});

describe('descent', () => {
  it('top of descent ~10 NM for 3000 ft at 3°', () => {
    const r = topOfDescent(3000, 3, 120)!;
    expect(r.distanceNm).toBeCloseTo(9.4, 0);
    expect(r.rodFpm).toBeCloseTo(637, 0);
  });
  it('VDP ~1.7 NM for 540 ft HAT at 3°', () => {
    expect(visualDescentPoint(540, 3, 90)!.distanceNm).toBeCloseTo(1.7, 1);
  });
});

describe('solveTsd', () => {
  it('distance + speed → time', () => {
    expect(solveTsd(120, 30, NaN)!.timeMin).toBeCloseTo(15, 6);
  });
  it('speed + time → distance', () => {
    expect(solveTsd(120, NaN, 30)!.distanceNm).toBeCloseTo(60, 6);
  });
  it('distance + time → speed', () => {
    expect(solveTsd(NaN, 60, 30)!.groundSpeed).toBeCloseTo(120, 6);
  });
  it('returns null with one input', () => {
    expect(solveTsd(120, NaN, NaN)).toBeNull();
  });
});
