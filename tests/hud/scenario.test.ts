import { describe, expect, it } from 'vitest';
import {
  buildScenario,
  DEFAULT_SEED,
  HUBS,
  SIM_EPOCH_MS,
  SIM_RATE,
  simTimeAt,
} from '@/calc/hud/scenario';

describe('buildScenario', () => {
  it('is deterministic for a given seed', () => {
    const a = buildScenario(DEFAULT_SEED);
    const b = buildScenario(DEFAULT_SEED);
    expect(a).toEqual(b);
  });

  it('builds the fixed fleet composition', () => {
    const { flights } = buildScenario(DEFAULT_SEED);
    expect(flights).toHaveLength(25);
    const byKind = {
      jet: flights.filter((f) => f.kind === 'jet'),
      ga: flights.filter((f) => f.kind === 'ga'),
      heli: flights.filter((f) => f.kind === 'heli'),
      drone: flights.filter((f) => f.kind === 'drone'),
    };
    expect(byKind.jet).toHaveLength(14);
    expect(byKind.ga).toHaveLength(4);
    expect(byKind.heli).toHaveLength(3);
    expect(byKind.drone).toHaveLength(4);
    for (const [kind, list] of Object.entries(byKind)) {
      for (const flight of list) {
        expect(flight.id.startsWith(`${kind}-`)).toBe(true);
      }
    }
  });

  it('never routes a flight to its own origin', () => {
    const { flights } = buildScenario(DEFAULT_SEED);
    for (const flight of flights) {
      expect(flight.from.code).not.toBe(flight.to.code);
    }
  });

  it('never repeats a callsign or squawk across the fleet', () => {
    const { flights } = buildScenario(DEFAULT_SEED);
    const callsigns = flights.map((f) => f.callsign);
    const squawks = flights.map((f) => f.squawk);
    expect(new Set(callsigns).size).toBe(callsigns.length);
    expect(new Set(squawks).size).toBe(squawks.length);
  });

  it('produces a different fleet for a different seed', () => {
    const a = buildScenario(DEFAULT_SEED);
    const b = buildScenario(DEFAULT_SEED + 1);
    expect(a.flights).not.toEqual(b.flights);
    expect(b.seed).toBe(DEFAULT_SEED + 1);
  });

  it('normalizes the seed to an unsigned 32-bit integer', () => {
    const { seed } = buildScenario(-1);
    expect(seed).toBe(0xffffffff);
  });

  it('returns a fresh, independent copy of SECTORS each call', () => {
    const a = buildScenario(DEFAULT_SEED);
    const b = buildScenario(DEFAULT_SEED);
    expect(a.sectors).toEqual(b.sectors);
    expect(a.sectors).not.toBe(b.sectors);
  });
});

describe('simTimeAt', () => {
  it('is zero at the sim epoch', () => {
    expect(simTimeAt(SIM_EPOCH_MS)).toBe(0);
  });

  it('scales wall-clock elapsed time by SIM_RATE', () => {
    const oneWallSecondLater = SIM_EPOCH_MS + 1000;
    expect(simTimeAt(oneWallSecondLater)).toBe(1000 * SIM_RATE);
  });

  it('runs backwards before the epoch', () => {
    const oneWallSecondBefore = SIM_EPOCH_MS - 1000;
    expect(simTimeAt(oneWallSecondBefore)).toBe(-1000 * SIM_RATE);
  });
});

describe('HUBS', () => {
  it('has no duplicate ICAO codes', () => {
    const codes = HUBS.map((h) => h.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
