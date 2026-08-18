import { describe, expect, it } from 'vitest';
import { daylight, type SunTimes } from '@/calc/sun';

const times = (rise: string, set: string): SunTimes => ({
  sunrise: new Date(rise),
  sunset: new Date(set),
  civilDawn: null,
  civilDusk: null,
});

describe('daylight', () => {
  // A clean 12-hour span makes the fractions easy to read.
  const day = times('2026-08-01T03:00:00Z', '2026-08-01T15:00:00Z');

  it('is halfway up at the midpoint of the daylight span', () => {
    const d = daylight(day, new Date('2026-08-01T09:00:00Z'));
    expect(d.isUp).toBe(true);
    expect(d.progress).toBeCloseTo(0.5, 5);
  });

  it('clamps to 0 and reads as down before sunrise', () => {
    const d = daylight(day, new Date('2026-08-01T01:00:00Z'));
    expect(d.isUp).toBe(false);
    expect(d.progress).toBe(0);
  });

  it('clamps to 1 and reads as down after sunset', () => {
    const d = daylight(day, new Date('2026-08-01T20:00:00Z'));
    expect(d.isUp).toBe(false);
    expect(d.progress).toBe(1);
  });

  it('returns null progress for a day with no sunrise/sunset', () => {
    const polar: SunTimes = { sunrise: null, sunset: null, civilDawn: null, civilDusk: null };
    expect(daylight(polar, new Date('2026-08-01T09:00:00Z')).progress).toBeNull();
  });
});
