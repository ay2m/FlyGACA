import { describe, expect, it } from 'vitest';
import { equalTimePoint, pointOfNoReturn } from '@/calc/criticalPoint';

describe('equalTimePoint', () => {
  it('sits at the midpoint when the groundspeeds are equal', () => {
    const r = equalTimePoint(400, 120, 120)!;
    expect(r.distNm).toBeCloseTo(200, 6);
    expect(r.timeMin).toBeCloseTo(100, 6);
  });
  it('moves towards the destination with a tailwind out / headwind home', () => {
    // 500 NM, 150 kt out, 100 kt home → ETP at 500·100/250 = 200 NM.
    const r = equalTimePoint(500, 150, 100)!;
    expect(r.distNm).toBeCloseTo(200, 6);
    expect(r.timeMin).toBeCloseTo(80, 6);
  });
  it('rejects non-positive inputs', () => {
    expect(equalTimePoint(0, 120, 120)).toBeNull();
    expect(equalTimePoint(400, 0, 120)).toBeNull();
  });
});

describe('pointOfNoReturn', () => {
  it('with equal groundspeeds the PNR is at half the endurance', () => {
    // 5 h (300 min) endurance, 120 kt both ways → time = 150 min, dist = 300 NM.
    const r = pointOfNoReturn(300, 120, 120)!;
    expect(r.timeMin).toBeCloseTo(150, 6);
    expect(r.distNm).toBeCloseTo(300, 6);
  });
  it('a headwind out / tailwind home pushes the PNR earlier in time', () => {
    const r = pointOfNoReturn(300, 100, 150)!;
    expect(r.timeMin).toBeCloseTo(180, 6);
    expect(r.distNm).toBeCloseTo(300, 6);
  });
  it('rejects non-positive inputs', () => {
    expect(pointOfNoReturn(0, 120, 120)).toBeNull();
  });
});
