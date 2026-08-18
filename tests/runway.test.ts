import { describe, expect, it } from 'vitest';
import { bearingPoint, parseRunwayHeading, runwayEnds } from '@/calc/runway';

describe('parseRunwayHeading', () => {
  it('expands a runway designator to its heading (number ×10)', () => {
    expect(parseRunwayHeading('16')).toBe(160);
    expect(parseRunwayHeading('09/27')).toBe(90);
    expect(parseRunwayHeading('12L/30R')).toBe(120);
  });

  it('treats 36 as north (0°) and strips leading zeros / suffixes', () => {
    expect(parseRunwayHeading('36')).toBe(0);
    expect(parseRunwayHeading('09')).toBe(90);
    expect(parseRunwayHeading('30R')).toBe(300);
  });

  it('rejects helipad ids and junk', () => {
    expect(parseRunwayHeading('H1')).toBeNull();
    expect(parseRunwayHeading('')).toBeNull();
    expect(parseRunwayHeading('ALL')).toBeNull();
    expect(parseRunwayHeading('37')).toBeNull();
  });
});

describe('runwayEnds', () => {
  it('splits a paired designator', () => {
    expect(runwayEnds('12L/30R')).toEqual(['12L', '30R']);
  });

  it('derives the reciprocal for a single designator', () => {
    expect(runwayEnds('16')).toEqual(['16', '34']);
    expect(runwayEnds('09')).toEqual(['09', '27']);
  });
});

describe('bearingPoint', () => {
  it('places 0° due north (straight up) of the centre', () => {
    const p = bearingPoint(0, 10, 100, 100);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(90);
  });

  it('places 90° due east (to the right)', () => {
    const p = bearingPoint(90, 10, 100, 100);
    expect(p.x).toBeCloseTo(110);
    expect(p.y).toBeCloseTo(100);
  });
});
