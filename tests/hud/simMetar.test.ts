import { describe, expect, it } from 'vitest';
import { parseMetar } from '@/calc/metar';
import { TICKER_STATIONS, composeSimMetar } from '@/calc/hud/simMetar';

const HOURS = [0, 4, 8, 12, 16, 20];

describe('composeSimMetar', () => {
  it('is deterministic per (station, instant, seed)', () => {
    const at = { month: 7, day: 1, hour: 12 };
    expect(composeSimMetar('OERK', at, 1)).toBe(composeSimMetar('OERK', at, 1));
    expect(composeSimMetar('OERK', at, 1)).not.toBe(composeSimMetar('OERK', at, 2));
  });

  it('round-trips through parseMetar for every station and hour', () => {
    for (const icao of TICKER_STATIONS) {
      for (const month of [0, 3, 7, 10]) {
        for (const hour of HOURS) {
          const raw = composeSimMetar(icao, { month, day: 14, hour }, 0x5eed);
          const r = parseMetar(raw);
          expect(r.station, raw).toBe(icao);
          expect(r.day, raw).toBe(14);
          expect(r.hour, raw).toBe(hour);
          expect(r.minute, raw).toBe(0);
          expect(r.wind, raw).not.toBeNull();
          expect(r.wind!.speedKt, raw).not.toBeNull();
          // Visibility group and CAVOK are mutually exclusive.
          expect(r.cavok !== (r.visibilityM !== null), raw).toBe(true);
          expect(r.tempC, raw).not.toBeNull();
          expect(r.dewC, raw).not.toBeNull();
          expect(r.qnhHpa, raw).not.toBeNull();
        }
      }
    }
  });

  it('stays inside plausible KSA ranges', () => {
    for (const icao of TICKER_STATIONS) {
      for (const month of [0, 7]) {
        for (const hour of HOURS) {
          const r = parseMetar(composeSimMetar(icao, { month, day: 8, hour }, 7));
          expect(r.tempC!).toBeGreaterThanOrEqual(-5);
          expect(r.tempC!).toBeLessThanOrEqual(52);
          expect(r.dewC!).toBeLessThanOrEqual(r.tempC!);
          expect(r.qnhHpa!).toBeGreaterThanOrEqual(995);
          expect(r.qnhHpa!).toBeLessThanOrEqual(1035);
          if (r.wind!.dir !== 'VRB' && r.wind!.dir !== null && r.wind!.dir !== 0) {
            expect(r.wind!.dir).toBeGreaterThanOrEqual(1);
            expect(r.wind!.dir).toBeLessThanOrEqual(360);
          }
          if (!r.cavok) {
            expect(r.visibilityM!).toBeGreaterThanOrEqual(3000);
            expect(r.visibilityM!).toBeLessThan(10_000);
          }
        }
      }
    }
  });

  it('runs hotter in July than in January at an inland station', () => {
    const july = parseMetar(composeSimMetar('OERK', { month: 6, day: 10, hour: 12 }, 3));
    const jan = parseMetar(composeSimMetar('OERK', { month: 0, day: 10, hour: 12 }, 3));
    expect(july.tempC!).toBeGreaterThan(jan.tempC!);
  });
});
