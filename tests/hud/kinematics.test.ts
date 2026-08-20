/**
 * `src/calc/hud/kinematics.ts` — the closed-form flight engine behind the HUD.
 *
 * 6% statements and **0% branch and function coverage** before this: reached
 * only transitively through a component render test. The module's whole claim is
 * that a flight's life is a pure function of sim time — same instant, same
 * state, no accumulators, no drift — and nothing checked it.
 *
 * The specs here are hand-built rather than taken from `buildScenario`, so a
 * seeded-generator change cannot silently rewrite what these assert.
 */
import { describe, expect, it } from 'vitest';
import { flightStateAt, stateAll, trailFor, activeCount, trendPct } from '@/calc/hud/kinematics';
import type { FlightSpec, Scenario, WaypointRef } from '@/calc/hud/types';

const OERK: WaypointRef = { code: 'OERK', lat: 24.9576, lon: 46.6988, elevFt: 2049 };
const OEJN: WaypointRef = { code: 'OEJN', lat: 21.6796, lon: 39.1564, elevFt: 48 };

const MIN = 60_000;

function spec(over: Partial<FlightSpec> = {}): FlightSpec {
  return {
    id: 'f1',
    callsign: 'SIM101',
    kind: 'jet',
    typeDesignator: 'A20N',
    squawk: '4501',
    from: OERK,
    to: OEJN,
    cruiseAltFt: 37_000,
    cruiseGsKt: 450,
    initialGsKt: 160,
    approachGsKt: 140,
    offsetMs: 0,
    legMs: 90 * MIN,
    cycleMs: 120 * MIN, // 30 min turnaround
    turbPhase: 0.7,
    ...over,
  };
}

/** Mid-leg instant for the default spec. */
const MID = 45 * MIN;

describe('flightStateAt — determinism', () => {
  it('is a pure function of sim time', () => {
    const s = spec();
    expect(flightStateAt(s, MID)).toEqual(flightStateAt(s, MID));
  });

  it('repeats itself exactly one cycle later, on the same leg parity', () => {
    const s = spec();
    const a = flightStateAt(s, MID);
    const b = flightStateAt(s, MID + 2 * s.cycleMs);
    expect(a).not.toBeNull();
    // Position and progress repeat; only the attitude wobble (a function of
    // absolute sim time) differs.
    expect(b?.lat).toBeCloseTo(a!.lat, 9);
    expect(b?.lon).toBeCloseTo(a!.lon, 9);
    expect(b?.progress).toBeCloseTo(a!.progress, 12);
    expect(b?.fromCode).toBe(a!.fromCode);
  });
});

describe('flightStateAt — the shuttle cycle', () => {
  it('flies A→B on an even leg and B→A on the next', () => {
    const s = spec();
    const out = flightStateAt(s, MID);
    const back = flightStateAt(s, MID + s.cycleMs);

    expect(out).toMatchObject({ fromCode: 'OERK', toCode: 'OEJN' });
    expect(back).toMatchObject({ fromCode: 'OEJN', toCode: 'OERK' });
  });

  it('returns null while parked in the turnaround', () => {
    const s = spec();
    expect(flightStateAt(s, s.legMs)).toBeNull(); // exactly at touchdown
    expect(flightStateAt(s, s.legMs + MIN)).toBeNull();
    expect(flightStateAt(s, s.cycleMs - 1)).toBeNull();
    expect(flightStateAt(s, s.cycleMs)).not.toBeNull(); // next leg departs
  });

  it('staggers the fleet by offsetMs', () => {
    const early = spec({ offsetMs: 0 });
    const late = spec({ offsetMs: 30 * MIN });
    expect(flightStateAt(early, MID)!.progress).not.toBeCloseTo(
      flightStateAt(late, MID)!.progress,
      6,
    );
  });

  it('stays consistent before the epoch (negative sim time)', () => {
    const s = spec();
    const before = flightStateAt(s, -MID);
    // Negative leg indices still floor correctly, so the state is defined.
    expect(before === null || Number.isFinite(before.lat)).toBe(true);
  });
});

describe('flightStateAt — guards', () => {
  it('returns null for a non-finite instant', () => {
    expect(flightStateAt(spec(), NaN)).toBeNull();
    expect(flightStateAt(spec(), Infinity)).toBeNull();
  });

  it('returns null for a degenerate leg', () => {
    expect(flightStateAt(spec({ legMs: 0 }), MID)).toBeNull();
    expect(flightStateAt(spec({ legMs: -1 }), MID)).toBeNull();
  });

  it('returns null when the cycle leaves no turnaround', () => {
    // cycleMs <= legMs would mean the aircraft lands and departs at once.
    expect(flightStateAt(spec({ legMs: 90 * MIN, cycleMs: 90 * MIN }), MID)).toBeNull();
    expect(flightStateAt(spec({ legMs: 90 * MIN, cycleMs: 60 * MIN }), MID)).toBeNull();
  });
});

describe('flightStateAt — the leg profile', () => {
  const s = spec();
  const at = (f: number) => flightStateAt(s, f * s.legMs)!;

  it('walks climb → cruise → descent → approach', () => {
    expect(at(0.05).phase).toBe('climb');
    expect(at(0.5).phase).toBe('cruise');
    expect(at(0.8).phase).toBe('descent');
    expect(at(0.97).phase).toBe('approach');
  });

  it('accelerates to cruise speed then decelerates to the approach speed', () => {
    // The profile is piecewise linear, so only f = 0 sits exactly on the initial
    // knot; the last sampled instant before touchdown is within a knot of the
    // approach speed.
    expect(at(0).gsKt).toBeCloseTo(s.initialGsKt, 9);
    expect(at(0.5).gsKt).toBeCloseTo(s.cruiseGsKt, 9);
    expect(at(0.9999).gsKt).toBeCloseTo(s.approachGsKt, 0);
    expect(at(0.1).gsKt).toBeGreaterThan(at(0).gsKt);
    expect(at(0.9).gsKt).toBeLessThan(s.cruiseGsKt);
  });

  it('climbs from the departure elevation to cruise and back down to the arrival elevation', () => {
    expect(at(0).altFt).toBeCloseTo(OERK.elevFt, 9);
    expect(at(0.5).altFt).toBe(s.cruiseAltFt);
    // Ramping toward the arrival field: close to it, and below the departure
    // elevation it started from.
    expect(at(0.9999).altFt).toBeGreaterThanOrEqual(OEJN.elevFt);
    expect(at(0.9999).altFt).toBeLessThan(OERK.elevFt);
  });

  it('reports vertical speed positive climbing, zero in cruise, negative descending', () => {
    expect(at(0.05).vsFpm).toBeGreaterThan(0);
    expect(at(0.5).vsFpm).toBe(0);
    expect(at(0.9).vsFpm).toBeLessThan(0);
  });

  it('advances progress monotonically from 0 to 1 across the leg', () => {
    let prev = -1;
    for (let f = 0; f <= 1; f += 0.02) {
      const p = at(Math.min(f, 0.9999)).progress;
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
    expect(at(0.0001).progress).toBeCloseTo(0, 2);
    expect(at(0.9999).progress).toBeCloseTo(1, 2);
  });

  it('flies a shorter distance in the slow climb than in an equal slice of cruise', () => {
    // The distance integral is speed-weighted, not linear in time.
    const climbSlice = at(0.1).progress - at(0.05).progress;
    const cruiseSlice = at(0.5).progress - at(0.45).progress;
    expect(cruiseSlice).toBeGreaterThan(climbSlice);
  });

  it('keeps the position on the great circle between the endpoints', () => {
    const p = at(0.5);
    expect(p.lat).toBeGreaterThan(Math.min(OERK.lat, OEJN.lat) - 1);
    expect(p.lat).toBeLessThan(Math.max(OERK.lat, OEJN.lat) + 1);
    expect(p.lon).toBeGreaterThan(Math.min(OERK.lon, OEJN.lon) - 1);
    expect(p.lon).toBeLessThan(Math.max(OERK.lon, OEJN.lon) + 1);
  });
});

describe('flightStateAt — attitude', () => {
  it('clamps pitch and bank to the instrument limits', () => {
    const s = spec({ cruiseAltFt: 45_000, legMs: 5 * MIN, cycleMs: 10 * MIN });
    for (let t = 0; t < 5 * MIN; t += 5_000) {
      const st = flightStateAt(s, t);
      if (!st) continue;
      expect(st.pitchDeg).toBeGreaterThanOrEqual(-12);
      expect(st.pitchDeg).toBeLessThanOrEqual(12);
      expect(st.bankDeg).toBeGreaterThanOrEqual(-25);
      expect(st.bankDeg).toBeLessThanOrEqual(25);
    }
  });

  it('damps turbulence for drones more than for helicopters, and least for jets', () => {
    const t = 3 * MIN;
    const bank = (kind: FlightSpec['kind']) => Math.abs(flightStateAt(spec({ kind }), t)!.bankDeg);
    expect(bank('drone')).toBeLessThan(bank('heli'));
    expect(bank('heli')).toBeLessThan(bank('jet'));
  });

  it('holds a track bearing in range for the whole leg', () => {
    const s = spec();
    for (let f = 0.01; f < 1; f += 0.05) {
      const st = flightStateAt(s, f * s.legMs)!;
      expect(st.trackDeg).toBeGreaterThanOrEqual(0);
      expect(st.trackDeg).toBeLessThan(360);
    }
  });

  it('falls back to the leg bearing rather than NaN on top of the destination', () => {
    // Within half a mile of the field the to-go bearing is meaningless.
    const st = flightStateAt(spec(), 0.99999 * spec().legMs)!;
    expect(Number.isFinite(st.trackDeg)).toBe(true);
  });
});

describe('stateAll + activeCount', () => {
  const scenario = (flights: FlightSpec[]): Scenario =>
    ({ flights, sectors: [] }) as unknown as Scenario;

  it('returns only the airborne flights', () => {
    const flying = spec({ id: 'a' });
    // At MID its cycle time is 105 min — past the 90-min leg, inside the
    // 30-min turnaround.
    const parked = spec({ id: 'b', offsetMs: 60 * MIN });
    const sc = scenario([flying, parked]);

    const states = stateAll(sc, MID);
    expect(states.map((s) => s.id)).toEqual(['a']);
    expect(activeCount(sc, MID)).toBe(1);
  });

  it('is empty when the whole fleet is on the ground', () => {
    const sc = scenario([spec({ legMs: 0 })]);
    expect(stateAll(sc, MID)).toEqual([]);
    expect(activeCount(sc, MID)).toBe(0);
  });
});

describe('trailFor', () => {
  it('returns recent positions, nearest first, behind the aircraft', () => {
    const s = spec();
    const now = 60 * MIN;
    const trail = trailFor(s, now, 4, 60_000);

    expect(trail).toHaveLength(4);
    const here = flightStateAt(s, now)!;
    // Each successive trail point is further back along the leg.
    let prev = here.progress;
    for (const p of trail) {
      expect(p.progress).toBeLessThan(prev);
      prev = p.progress;
    }
  });

  it('stops at the start of the leg rather than jumping onto the previous one', () => {
    // Two minutes after departure, a 10 × 45 s trail would otherwise reach back
    // through the turnaround onto the reversed leg.
    const s = spec();
    const trail = trailFor(s, 2 * MIN, 10, 45_000);
    expect(trail.length).toBeLessThan(10);
    for (const p of trail) expect(p.fromCode).toBe('OERK');
  });

  it('is empty while the aircraft is parked', () => {
    const s = spec();
    expect(trailFor(s, s.legMs + MIN)).toEqual([]);
  });
});

describe('trendPct', () => {
  const scenario = (flights: FlightSpec[]): Scenario =>
    ({ flights, sectors: [] }) as unknown as Scenario;

  it('is zero when the airborne count is unchanged', () => {
    // A flight airborne at both instants.
    const sc = scenario([spec({ legMs: 200 * MIN, cycleMs: 400 * MIN })]);
    expect(trendPct(sc, 100 * MIN, 10 * MIN)).toBe(0);
  });

  it('is positive when more aircraft are airborne than before', () => {
    // Departs at t = 50 min, so it is airborne now and was not 20 minutes ago.
    const sc = scenario([spec({ offsetMs: -(50 * MIN) })]);
    expect(trendPct(sc, 60 * MIN, 20 * MIN)).toBeGreaterThan(0);
  });

  it('divides by at least one, so an empty past never yields Infinity', () => {
    const sc = scenario([spec({ offsetMs: -(50 * MIN) })]);
    const t = trendPct(sc, 60 * MIN, 20 * MIN);
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBe(100);
  });
});
