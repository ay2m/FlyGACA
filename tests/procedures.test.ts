import { describe, expect, it } from 'vitest';
import { holdTiming, holdingEntry } from '@/calc/holding';
import { longitudinalSeparation } from '@/calc/separation';

describe('holdingEntry (right turns, inbound 270)', () => {
  it('direct when heading matches the inbound course', () => {
    expect(holdingEntry(270, 270)).toBe('direct');
  });
  it('parallel at 90° and 180° relative', () => {
    expect(holdingEntry(270, 360)).toBe('parallel'); // a=90
    expect(holdingEntry(270, 90)).toBe('parallel'); // a=180 boundary
  });
  it('teardrop in the holding-side sector', () => {
    expect(holdingEntry(270, 110)).toBe('teardrop'); // a=200
  });
  it('left-hand holds mirror', () => {
    expect(holdingEntry(270, 270, false)).toBe('direct');
  });
});

describe('holdTiming', () => {
  it('lap = two legs + two 1-min turns; fuel scales', () => {
    const r = holdTiming(1, 40, 2)!;
    expect(r.lapMin).toBe(4);
    expect(r.totalMin).toBe(8);
    expect(r.fuel).toBeCloseTo(5.33, 1);
  });
});

describe('longitudinalSeparation', () => {
  it('a faster follower closes the gap', () => {
    const r = longitudinalSeparation(120, 150, 10)!;
    expect(r.closing).toBe(true);
    expect(r.closureKt).toBe(30);
    expect(r.timeToZeroMin).toBeCloseTo(20, 6);
  });
  it('a slower follower opens the gap', () => {
    const r = longitudinalSeparation(130, 120, 10)!;
    expect(r.closing).toBe(false);
    expect(r.timeToZeroMin).toBeNull();
  });
});
