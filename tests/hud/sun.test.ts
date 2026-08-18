import { describe, expect, it } from 'vitest';
import { subsolarPoint, sunTimes } from '@/calc/sun';

describe('subsolarPoint', () => {
  it('rejects an invalid date', () => {
    expect(subsolarPoint(new Date(NaN))).toBeNull();
  });
  it('sits near the equator at the March equinox', () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12, 0)))!;
    expect(Math.abs(p.lat)).toBeLessThan(1.5);
  });
  it('reaches the Tropic of Cancer at the June solstice', () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0)))!;
    expect(p.lat).toBeGreaterThan(22.9);
    expect(p.lat).toBeLessThan(23.9);
  });
  it('reaches the Tropic of Capricorn at the December solstice', () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 11, 21, 12, 0)))!;
    expect(p.lat).toBeGreaterThan(-23.9);
    expect(p.lat).toBeLessThan(-22.9);
  });
  it('crosses the Greenwich meridian around 12:00 UTC', () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12, 0)))!;
    expect(Math.abs(p.lon)).toBeLessThan(5);
  });
  it('moves west as the day advances', () => {
    const noon = subsolarPoint(new Date(Date.UTC(2026, 6, 1, 12, 0)))!;
    const later = subsolarPoint(new Date(Date.UTC(2026, 6, 1, 15, 0)))!;
    // 3 hours ≈ 45° of westward travel.
    const delta = ((noon.lon - later.lon + 540) % 360) - 180;
    expect(delta).toBeGreaterThan(40);
    expect(delta).toBeLessThan(50);
  });
  it('is consistent with sunTimes: overhead longitude is near solar noon', () => {
    // At the OERK longitude the sun transits ~08:52 UTC; the subsolar lon then
    // should be close to the airport's longitude.
    const p = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 8, 52)))!;
    expect(Math.abs(p.lon - 46.7)).toBeLessThan(5);
    // Sanity: sunTimes still resolves for the same day/place.
    const t = sunTimes(new Date(Date.UTC(2026, 2, 20)), 24.96, 46.7);
    expect(t?.sunrise).toBeTruthy();
  });
});
