import { describe, expect, it } from 'vitest';
import { cloudBase } from '@/calc/cloud';

describe('cloudBase', () => {
  it('estimates ~400 ft of base per °C of spread', () => {
    const r = cloudBase(30, 18);
    expect(r).not.toBeNull();
    expect(r!.spread).toBe(12);
    expect(r!.baseAglFt).toBe(4800);
  });
  it('is on the surface when temperature equals dew point', () => {
    expect(cloudBase(20, 20)!.baseAglFt).toBe(0);
  });
  it('returns null when dew point exceeds temperature', () => {
    expect(cloudBase(10, 12)).toBeNull();
  });
});
