/**
 * `src/calc/hud/sectors.ts` — sector membership, occupancy, density and the
 * safe/busy verdict.
 *
 * `pointInPolygon` already had a spec (tests/hud/geoKsa.test.ts uses it against
 * the Kingdom outline); the rest of the module — the circle test the stat card,
 * the shield and the canvas all share, and the derivations built on it — sat
 * uncovered at 34% statements / 14% functions.
 */
import { describe, expect, it } from 'vitest';
import {
  inCircle,
  sectorOccupancy,
  densityPct,
  airspaceStatus,
  sectorReport,
} from '@/calc/hud/sectors';
import { destPoint } from '@/calc/hud/projection';
import type { FlightState, Scenario, Sector } from '@/calc/hud/types';

const CENTRE = { lat: 24.9576, lon: 46.6988 }; // OERK

function sector(over: Partial<Sector> = {}): Sector {
  return {
    id: 's1',
    center: CENTRE,
    radiusNm: 100,
    capacity: 4,
    flBandLo: 100,
    flBandHi: 400,
    ...over,
  } as Sector;
}

/** A flight state carrying only what these functions read. */
function at(lat: number, lon: number, id = 'f'): FlightState {
  return { id, lat, lon } as FlightState;
}

/** `n` flights placed inside `s`. */
function inside(s: Sector, n: number): FlightState[] {
  return Array.from({ length: n }, (_, i) => {
    const p = destPoint(s.center, (i * 360) / Math.max(1, n), s.radiusNm / 2);
    return at(p.lat, p.lon, `in${i}`);
  });
}

describe('inCircle', () => {
  it('includes the centre', () => {
    expect(inCircle(CENTRE, CENTRE, 50)).toBe(true);
  });

  it('includes a point inside and excludes one beyond the radius', () => {
    const near = destPoint(CENTRE, 45, 40);
    const far = destPoint(CENTRE, 45, 160);
    expect(inCircle(near, CENTRE, 100)).toBe(true);
    expect(inCircle(far, CENTRE, 100)).toBe(false);
  });

  it('treats the boundary as inside', () => {
    const edge = destPoint(CENTRE, 270, 100);
    // Distance is computed to floating precision, so allow the boundary itself.
    expect(inCircle(edge, CENTRE, 100.001)).toBe(true);
  });

  it('excludes everything for a zero or negative radius', () => {
    const near = destPoint(CENTRE, 0, 1);
    expect(inCircle(near, CENTRE, 0)).toBe(false);
    expect(inCircle(near, CENTRE, -50)).toBe(false);
  });

  it('is false rather than throwing for a non-finite position', () => {
    expect(inCircle({ lat: NaN, lon: 46 }, CENTRE, 100)).toBe(false);
    expect(inCircle({ lat: 24, lon: Infinity }, CENTRE, 100)).toBe(false);
  });
});

describe('sectorOccupancy', () => {
  it('counts the flights inside each sector', () => {
    const a = sector({ id: 'a' });
    const b = sector({ id: 'b', center: destPoint(CENTRE, 90, 600), radiusNm: 100 });
    const states = [...inside(a, 3), ...inside(b, 1)];

    expect(sectorOccupancy(states, [a, b])).toEqual({ a: 3, b: 1 });
  });

  it('gives every sector a key, including empty ones', () => {
    const a = sector({ id: 'a' });
    const b = sector({ id: 'b', center: destPoint(CENTRE, 90, 600) });

    expect(sectorOccupancy([], [a, b])).toEqual({ a: 0, b: 0 });
  });

  it('counts a flight in every sector it falls inside — sectors may overlap', () => {
    const a = sector({ id: 'a', radiusNm: 200 });
    const b = sector({ id: 'b', radiusNm: 300 });

    expect(sectorOccupancy([at(CENTRE.lat, CENTRE.lon)], [a, b])).toEqual({ a: 1, b: 1 });
  });

  it('returns an empty map when there are no sectors', () => {
    expect(sectorOccupancy(inside(sector(), 3), [])).toEqual({});
  });
});

describe('densityPct', () => {
  it('reports the peak sector load as a percentage of capacity', () => {
    const a = sector({ id: 'a', capacity: 4 });
    const b = sector({ id: 'b', capacity: 10 });

    // a is at 2/4 = 50%, b at 2/10 = 20% → peak 50.
    expect(densityPct({ a: 2, b: 2 }, [a, b])).toBe(50);
  });

  it('clamps an over-capacity sector to 100', () => {
    expect(densityPct({ a: 40 }, [sector({ id: 'a', capacity: 4 })])).toBe(100);
  });

  it('is zero with no traffic, and for a sector missing from the map', () => {
    const a = sector({ id: 'a', capacity: 4 });
    expect(densityPct({ a: 0 }, [a])).toBe(0);
    expect(densityPct({}, [a])).toBe(0);
  });

  it('skips a sector with no declared capacity rather than dividing by zero', () => {
    const zero = sector({ id: 'zero', capacity: 0 });
    const real = sector({ id: 'real', capacity: 8 });

    expect(densityPct({ zero: 5, real: 2 }, [zero, real])).toBe(25);
    expect(densityPct({ zero: 5 }, [zero])).toBe(0);
  });

  it('is zero when there are no sectors at all', () => {
    expect(densityPct({}, [])).toBe(0);
  });
});

describe('airspaceStatus', () => {
  it('is safe while every sector is at or under capacity', () => {
    const a = sector({ id: 'a', capacity: 4 });
    expect(airspaceStatus({ a: 0 }, [a])).toBe('safe');
    expect(airspaceStatus({ a: 4 }, [a])).toBe('safe'); // exactly at capacity
  });

  it('is busy as soon as one sector is over capacity', () => {
    const a = sector({ id: 'a', capacity: 4 });
    const b = sector({ id: 'b', capacity: 4 });
    expect(airspaceStatus({ a: 1, b: 5 }, [a, b])).toBe('busy');
  });

  it('is safe with no sectors', () => {
    expect(airspaceStatus({}, [])).toBe('safe');
  });
});

describe('sectorReport', () => {
  it('derives occupancy, density and status together from a scenario', () => {
    const a = sector({ id: 'a', capacity: 4 });
    const scenario = { sectors: [a] } as unknown as Scenario;

    const report = sectorReport(scenario, inside(a, 2));

    expect(report.occupancy).toEqual({ a: 2 });
    expect(report.densityPct).toBe(50);
    expect(report.status).toBe('safe');
  });

  it('flags busy once a sector is over capacity', () => {
    const a = sector({ id: 'a', capacity: 2 });
    const scenario = { sectors: [a] } as unknown as Scenario;

    const report = sectorReport(scenario, inside(a, 5));

    expect(report.status).toBe('busy');
    expect(report.densityPct).toBe(100);
  });

  it('agrees with the standalone derivations it composes', () => {
    // The stat card, the shield and the canvas must all see one definition of
    // "inside" — that is the reason this convenience exists.
    const a = sector({ id: 'a', capacity: 6 });
    const scenario = { sectors: [a] } as unknown as Scenario;
    const states = inside(a, 3);

    const occupancy = sectorOccupancy(states, [a]);
    expect(sectorReport(scenario, states)).toEqual({
      occupancy,
      densityPct: densityPct(occupancy, [a]),
      status: airspaceStatus(occupancy, [a]),
    });
  });
});
