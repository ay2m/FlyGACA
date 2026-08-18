import { describe, expect, it } from 'vitest';
import { clockAngles } from '@/calc/zulu';

describe('clockAngles', () => {
  it('points the hour hand to 3 o’clock at 03:00:00', () => {
    const a = clockAngles(3, 0, 0);
    expect(a.hourDeg).toBe(90);
    expect(a.minDeg).toBe(0);
    expect(a.secDeg).toBe(0);
  });

  it('advances the hour hand halfway between the hours at half past', () => {
    const a = clockAngles(6, 30, 0);
    expect(a.hourDeg).toBeCloseTo(195, 5);
    expect(a.minDeg).toBe(180);
  });

  it('wraps 12 o’clock hours to 0°', () => {
    expect(clockAngles(12, 0, 0).hourDeg).toBe(0);
    expect(clockAngles(0, 0, 0).hourDeg).toBe(0);
  });

  it('creeps the minute hand with the seconds', () => {
    const a = clockAngles(0, 0, 30);
    expect(a.secDeg).toBe(180);
    expect(a.minDeg).toBeCloseTo(3, 5); // 30 s = half a minute → 3°
  });
});
