/**
 * Closed-form flight kinematics for the HUD simulation.
 *
 * A flight's whole life is a pure function of sim time: leg `k` of the
 * perpetual shuttle flies A→B when `k` is even and B→A when odd, with a ground
 * turnaround between legs (the engine returns `null` while parked). Speed and
 * altitude follow a fixed piecewise-linear profile over the leg, so along-track
 * distance integrates analytically — no accumulators, no drift, and a trail is
 * just the same function evaluated at earlier instants.
 */
import { fin } from '@/calc/guards';
import { greatCircle } from '@/calc/navigation';
import { gcPointAt } from './projection';
import type { FlightSpec, FlightState, Phase, Scenario } from './types';

const R2D = 180 / Math.PI;
const KT_TO_FTS = 1.68781;

/** Leg profile knots as fractions of `legMs` (see `averageGs` in scenario.ts). */
const F_CLIMB_END = 0.18;
const F_DESCENT_START = 0.75;
const F_APPROACH_START = 0.93;

function phaseAt(f: number): Phase {
  if (f < F_CLIMB_END) return 'climb';
  if (f < F_DESCENT_START) return 'cruise';
  if (f < F_APPROACH_START) return 'descent';
  return 'approach';
}

/** Groundspeed at leg fraction `f` (piecewise linear between the knots). */
function gsAt(spec: FlightSpec, f: number): number {
  if (f < F_CLIMB_END) {
    const t = f / F_CLIMB_END;
    return spec.initialGsKt + (spec.cruiseGsKt - spec.initialGsKt) * t;
  }
  if (f < F_DESCENT_START) return spec.cruiseGsKt;
  const t = (f - F_DESCENT_START) / (1 - F_DESCENT_START);
  return spec.cruiseGsKt + (spec.approachGsKt - spec.cruiseGsKt) * t;
}

/** Altitude at leg fraction `f` (ft), ramping field → cruise → field. */
function altAt(spec: FlightSpec, f: number, fromElevFt: number, toElevFt: number): number {
  if (f < F_CLIMB_END) {
    const t = f / F_CLIMB_END;
    return fromElevFt + (spec.cruiseAltFt - fromElevFt) * t;
  }
  if (f < F_DESCENT_START) return spec.cruiseAltFt;
  const t = (f - F_DESCENT_START) / (1 - F_DESCENT_START);
  return spec.cruiseAltFt + (toElevFt - spec.cruiseAltFt) * t;
}

/** Vertical speed at leg fraction `f`, ft/min of sim time. */
function vsAt(spec: FlightSpec, f: number, fromElevFt: number, toElevFt: number): number {
  const legMin = spec.legMs / 60_000;
  if (f < F_CLIMB_END) return (spec.cruiseAltFt - fromElevFt) / (legMin * F_CLIMB_END);
  if (f < F_DESCENT_START) return 0;
  return (toElevFt - spec.cruiseAltFt) / (legMin * (1 - F_DESCENT_START));
}

/** Along-track distance fraction flown at leg-time fraction `f` (0..1). */
function distanceFraction(spec: FlightSpec, f: number): number {
  const knots: [number, number][] = [
    [0, spec.initialGsKt],
    [F_CLIMB_END, spec.cruiseGsKt],
    [F_DESCENT_START, spec.cruiseGsKt],
    [1, spec.approachGsKt],
  ];
  let total = 0;
  let flown = 0;
  for (let i = 1; i < knots.length; i += 1) {
    const [f1, g1] = knots[i - 1];
    const [f2, g2] = knots[i];
    const segment = ((f2 - f1) * (g1 + g2)) / 2;
    total += segment;
    if (f >= f2) flown += segment;
    else if (f > f1) {
      const t = (f - f1) / (f2 - f1);
      const gMid = g1 + (g2 - g1) * t;
      flown += ((f - f1) * (g1 + gMid)) / 2;
    }
  }
  return total > 0 ? flown / total : 0;
}

/** Leg index at a sim instant (negative before the epoch — still consistent). */
function legIndexAt(spec: FlightSpec, simMs: number): number {
  return Math.floor((simMs + spec.offsetMs) / spec.cycleMs);
}

/** Instantaneous state, or `null` while the flight sits in its turnaround. */
export function flightStateAt(spec: FlightSpec, simMs: number): FlightState | null {
  if (!fin(simMs) || spec.legMs <= 0 || spec.cycleMs <= spec.legMs) return null;
  const k = legIndexAt(spec, simMs);
  const tCycle = simMs + spec.offsetMs - k * spec.cycleMs;
  if (tCycle >= spec.legMs) return null;

  const outbound = ((k % 2) + 2) % 2 === 0;
  const a = outbound ? spec.from : spec.to;
  const b = outbound ? spec.to : spec.from;
  const f = tCycle / spec.legMs;
  const progress = distanceFraction(spec, f);
  const pos = gcPointAt(a, b, progress);
  const phase = phaseAt(f);
  const gsKt = gsAt(spec, f);
  const altFt = altAt(spec, f, a.elevFt, b.elevFt);
  const vsFpm = vsAt(spec, f, a.elevFt, b.elevFt);

  // Track: bearing on to the destination (fall back to the leg's initial
  // bearing when we are effectively on top of it).
  const toGo = greatCircle(pos.lat, pos.lon, b.lat, b.lon);
  const whole = greatCircle(a.lat, a.lon, b.lat, b.lon);
  const trackDeg = toGo && toGo.distanceNm > 0.5 ? toGo.bearingDeg : whole ? whole.bearingDeg : 0;

  // Attitude: flight-path angle from vs/gs plus a small nose-up bias by phase,
  // and two slow seeded sines so the horizon breathes without any stored state.
  const fpaDeg = Math.atan2(vsFpm / 60, gsKt * KT_TO_FTS) * R2D;
  const bias = phase === 'climb' ? 4 : phase === 'approach' ? 2.5 : 0.8;
  const wobble = 0.4 * Math.sin(simMs / 9_000 + spec.turbPhase);
  const pitchDeg = Math.max(-12, Math.min(12, fpaDeg + bias + wobble));
  const turbScale = spec.kind === 'drone' ? 0.5 : spec.kind === 'heli' ? 0.8 : 1;
  const bankDeg =
    turbScale *
    (2.4 * Math.sin(simMs / 6_700 + spec.turbPhase) +
      1.3 * Math.sin(simMs / 2_140 + 1.7 * spec.turbPhase));

  return {
    id: spec.id,
    callsign: spec.callsign,
    kind: spec.kind,
    typeDesignator: spec.typeDesignator,
    squawk: spec.squawk,
    phase,
    lat: pos.lat,
    lon: pos.lon,
    trackDeg,
    altFt,
    gsKt,
    vsFpm,
    pitchDeg,
    bankDeg: Math.max(-25, Math.min(25, bankDeg)),
    fromCode: a.code,
    toCode: b.code,
    progress,
  };
}

/** Every airborne flight at a sim instant. */
export function stateAll(scenario: Scenario, simMs: number): FlightState[] {
  const states: FlightState[] = [];
  for (const spec of scenario.flights) {
    const s = flightStateAt(spec, simMs);
    if (s) states.push(s);
  }
  return states;
}

/**
 * Recent past positions of one flight (nearest first), for the fading trail.
 * Points are confined to the current leg so a trail never jumps through the
 * turnaround onto the previous (reversed) leg.
 */
export function trailFor(
  spec: FlightSpec,
  simMs: number,
  n = 10,
  spacingMs = 45_000,
): FlightState[] {
  const k = legIndexAt(spec, simMs);
  const trail: FlightState[] = [];
  for (let i = 1; i <= n; i += 1) {
    const t = simMs - i * spacingMs;
    if (legIndexAt(spec, t) !== k) break;
    const s = flightStateAt(spec, t);
    if (!s) break;
    trail.push(s);
  }
  return trail;
}

/** Airborne count at a sim instant. */
export const activeCount = (scenario: Scenario, simMs: number): number =>
  stateAll(scenario, simMs).length;

/** Percent change in airborne count vs `lookbackMs` sim-milliseconds ago. */
export function trendPct(scenario: Scenario, simMs: number, lookbackMs = 600_000): number {
  const now = activeCount(scenario, simMs);
  const past = activeCount(scenario, simMs - lookbackMs);
  return ((now - past) / Math.max(1, past)) * 100;
}
