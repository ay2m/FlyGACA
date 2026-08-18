/**
 * Shared types for the Kingdom Airspace HUD simulation (`/hud`).
 *
 * Everything here describes a **deterministic training scenario** — fabricated
 * traffic over real Saudi geography, always labeled as simulated in the UI and
 * never attributed to a real operator. World state is a pure function of
 * (scenario, simMs), so there is no mutable simulation store anywhere.
 */

export type FleetKind = 'jet' | 'ga' | 'heli' | 'drone';

export type Phase = 'climb' | 'cruise' | 'descent' | 'approach';

export interface HudPoint {
  lat: number;
  lon: number;
}

/** A leg endpoint: an aerodrome (ICAO) or a named corridor waypoint (ZONE-*). */
export interface WaypointRef extends HudPoint {
  code: string;
  elevFt: number;
}

/** Static, seed-derived description of one perpetual shuttle flight. */
export interface FlightSpec {
  id: string;
  callsign: string;
  kind: FleetKind;
  /** Manufacturer type designator only (A20N, C172…) — never an operator. */
  typeDesignator: string;
  squawk: string;
  from: WaypointRef;
  to: WaypointRef;
  cruiseAltFt: number;
  cruiseGsKt: number;
  /** Groundspeed at the very start of the leg (end of the takeoff roll). */
  initialGsKt: number;
  /** Groundspeed crossing the destination threshold. */
  approachGsKt: number;
  /** Stagger into the cycle so the fleet does not move in lockstep. */
  offsetMs: number;
  /** One airborne leg, in sim milliseconds. */
  legMs: number;
  /** legMs + ground turnaround; leg k flies A→B when k is even, B→A when odd. */
  cycleMs: number;
  /** Seeded phase for the bank micro-turbulence sines. */
  turbPhase: number;
}

/** Instantaneous state of one flight — `null` from the engine means on ground. */
export interface FlightState {
  id: string;
  callsign: string;
  kind: FleetKind;
  typeDesignator: string;
  squawk: string;
  phase: Phase;
  lat: number;
  lon: number;
  trackDeg: number;
  altFt: number;
  gsKt: number;
  vsFpm: number;
  pitchDeg: number;
  bankDeg: number;
  fromCode: string;
  toCode: string;
  /** Along-route fraction flown, 0..1. */
  progress: number;
}

/** A simulated enroute sector (label resolves from i18n by `id`). */
export interface Sector {
  id: string;
  center: HudPoint;
  radiusNm: number;
  /** Simulated capacity used for the density/`safe` derivations. */
  capacity: number;
  flBandLo: number;
  flBandHi: number;
}

export interface Scenario {
  seed: number;
  flights: FlightSpec[];
  sectors: Sector[];
}
