/**
 * Scenario builder for the Kingdom Airspace HUD.
 *
 * `buildScenario(seed)` derives a fixed fleet of perpetual shuttle flights
 * between real Saudi aerodromes plus a coastal UAS corridor, and three named
 * enroute sectors. The same seed always yields the identical scenario, and the
 * sim clock is anchored to the wall clock (`simTimeAt`), so every device shows
 * the same world at the same moment.
 */
import { greatCircle } from '@/calc/navigation';
import { assignCallsign, assignSquawk } from './callsigns';
import { intIn, mulberry32, pick } from './rng';
import type { FleetKind, FlightSpec, Scenario, Sector, WaypointRef } from './types';

/** Sim epoch + compression: 1 wall second = `SIM_RATE` sim seconds. */
export const SIM_EPOCH_MS = Date.UTC(2026, 0, 1);
export const SIM_RATE = 8;
export const DEFAULT_SEED = 0x5eed;

/** Wall-clock → sim milliseconds (pure; anchored, so resume is drift-free). */
export const simTimeAt = (wallMs: number): number => (wallMs - SIM_EPOCH_MS) * SIM_RATE;

/**
 * The hub table — icao / lat / lon / field elevation copied verbatim from
 * `public/data/aerodromes-index.json` (curated Saudi AIP records). Hand-pinned
 * here so the engine stays synchronous and fetch-free; display names resolve
 * from i18n (`hud.airports.<icao>`).
 */
export const HUBS: readonly WaypointRef[] = [
  { code: 'OERK', lat: 24.96278, lon: 46.70806, elevFt: 2053 },
  { code: 'OEJN', lat: 21.68111, lon: 39.15611, elevFt: 50 },
  { code: 'OEDF', lat: 26.47111, lon: 49.79778, elevFt: 75 },
  { code: 'OEMA', lat: 24.55028, lon: 39.70583, elevFt: 2134 },
  { code: 'OEAB', lat: 18.24028, lon: 42.65639, elevFt: 6858 },
  { code: 'OETB', lat: 28.37306, lon: 36.62139, elevFt: 2551 },
  { code: 'OEGN', lat: 16.90111, lon: 42.58583, elevFt: 20 },
  { code: 'OETF', lat: 21.48333, lon: 40.54444, elevFt: 4848 },
  { code: 'OEAH', lat: 25.28611, lon: 49.48611, elevFt: 588 },
  { code: 'OEGS', lat: 26.30278, lon: 43.77417, elevFt: 2126 },
  { code: 'OEHL', lat: 27.43972, lon: 41.68639, elevFt: 3305 },
  { code: 'OEYN', lat: 24.14417, lon: 38.06361, elevFt: 44 },
  { code: 'OENN', lat: 27.92389, lon: 35.29389, elevFt: 32 },
  { code: 'OEBA', lat: 20.29833, lon: 41.63583, elevFt: 5459 },
];

/** Big-four hubs get double weight so trunk routes dominate, as in real life. */
const JET_POOL = ['OERK', 'OERK', 'OEJN', 'OEJN', 'OEDF', 'OEDF', 'OEMA', 'OEMA'];

/**
 * Simulated coastal UAS corridor near NEOM Bay (a geographic label, not an
 * operator): two named zone waypoints ~16 NM apart along the Gulf of Aqaba
 * coast. Display names resolve from i18n (`hud.corridor.*`).
 */
export const DRONE_CORRIDOR: { a: WaypointRef; b: WaypointRef } = {
  a: { code: 'ZONE-A', lat: 28.05, lon: 35.12, elevFt: 0 },
  b: { code: 'ZONE-B', lat: 27.83, lon: 35.38, elevFt: 0 },
};

/** City heliports paired with their airport for the ROTOR shuttles. */
const HELI_LINKS: { pad: WaypointRef; icao: string }[] = [
  { pad: { code: 'PAD-RUH', lat: 24.711, lon: 46.674, elevFt: 2000 }, icao: 'OERK' },
  { pad: { code: 'PAD-JED', lat: 21.543, lon: 39.173, elevFt: 40 }, icao: 'OEJN' },
  { pad: { code: 'PAD-DMM', lat: 26.436, lon: 50.104, elevFt: 30 }, icao: 'OEDF' },
];

/** Short training pairs for the TRAINER fleet. */
const GA_PAIRS: [string, string][] = [
  ['OETF', 'OEBA'],
  ['OEGS', 'OEHL'],
  ['OEYN', 'OEMA'],
  ['OEAH', 'OEDF'],
];

const FLEET_TYPES: Record<FleetKind, readonly string[]> = {
  jet: ['A20N', 'A21N', 'B38M', 'B77W', 'B789', 'A333'],
  ga: ['C172', 'DA42', 'PA28', 'SR22'],
  heli: ['AW139', 'H145', 'B429'],
  drone: ['EH216', 'VOLO2X', 'M600'],
};

const hub = (code: string): WaypointRef => {
  const found = HUBS.find((h) => h.code === code);
  // HUBS is a closed, spec-covered table; a miss is a programming error.
  if (!found) throw new Error(`unknown hub ${code}`);
  return found;
};

interface FleetParams {
  cruiseGs: () => number;
  cruiseAlt: (from: WaypointRef, to: WaypointRef) => number;
  initialGs: number;
  approachGs: number;
  turnaroundMin: () => number;
}

/** Average groundspeed over the leg profile (see kinematics knots). */
function averageGs(initial: number, cruise: number, approach: number): number {
  // Profile fractions: accelerate/climb 0→0.18, cruise 0.18→0.75, slow 0.75→1.
  return 0.18 * ((initial + cruise) / 2) + 0.57 * cruise + 0.25 * ((cruise + approach) / 2);
}

/** One perpetual shuttle spec between `from` and `to`. */
function makeSpec(
  rng: () => number,
  kind: FleetKind,
  index: number,
  from: WaypointRef,
  to: WaypointRef,
  p: FleetParams,
  usedCallsigns: Set<string>,
  usedSquawks: Set<string>,
): FlightSpec {
  const gc = greatCircle(from.lat, from.lon, to.lat, to.lon);
  const distanceNm = gc ? gc.distanceNm : 100;
  const cruiseGsKt = p.cruiseGs();
  const initialGsKt = p.initialGs;
  const approachGsKt = p.approachGs;
  const avg = averageGs(initialGsKt, cruiseGsKt, approachGsKt);
  const legMs = Math.round((distanceNm / avg) * 3_600_000);
  const cycleMs = legMs + Math.round(p.turnaroundMin() * 60_000);
  return {
    id: `${kind}-${index}`,
    callsign: assignCallsign(rng, kind, usedCallsigns),
    kind,
    typeDesignator: pick(rng, FLEET_TYPES[kind]),
    squawk: assignSquawk(rng, usedSquawks),
    from,
    to,
    cruiseAltFt: p.cruiseAlt(from, to),
    cruiseGsKt,
    initialGsKt,
    approachGsKt,
    offsetMs: Math.floor(rng() * cycleMs),
    legMs,
    cycleMs,
    turbPhase: rng() * Math.PI * 2,
  };
}

/** The three simulated enroute sectors (labels resolve from i18n by id). */
export const SECTORS: readonly Sector[] = [
  {
    id: 'alpha',
    center: { lat: 24.96278, lon: 46.70806 },
    radiusNm: 120,
    capacity: 9,
    flBandLo: 350,
    flBandHi: 410,
  },
  {
    id: 'bravo',
    center: { lat: 21.68111, lon: 39.15611 },
    radiusNm: 120,
    capacity: 8,
    flBandLo: 280,
    flBandHi: 410,
  },
  {
    id: 'charlie',
    center: { lat: 26.47111, lon: 49.79778 },
    radiusNm: 100,
    capacity: 7,
    flBandLo: 280,
    flBandHi: 390,
  },
];

/** Build the deterministic scenario for a seed. */
export function buildScenario(seed: number = DEFAULT_SEED): Scenario {
  const rng = mulberry32(seed >>> 0);
  const usedCallsigns = new Set<string>();
  const usedSquawks = new Set<string>();
  const flights: FlightSpec[] = [];

  // 14 airliners on trunk city-pairs (odd/even-ish levels for flavour).
  for (let i = 0; i < 14; i += 1) {
    const from = hub(pick(rng, JET_POOL));
    let to = hub(
      pick(
        rng,
        HUBS.map((h) => h.code),
      ),
    );
    while (to.code === from.code)
      to = hub(
        pick(
          rng,
          HUBS.map((h) => h.code),
        ),
      );
    flights.push(
      makeSpec(
        rng,
        'jet',
        i + 1,
        from,
        to,
        {
          cruiseGs: () => intIn(rng, 420, 480),
          cruiseAlt: () => intIn(rng, 28, 41) * 1000,
          initialGs: 170,
          approachGs: 140,
          turnaroundMin: () => intIn(rng, 10, 18),
        },
        usedCallsigns,
        usedSquawks,
      ),
    );
  }

  // 4 trainers on short legs, ~2 500–4 500 ft above the higher field.
  GA_PAIRS.forEach(([a, b], i) => {
    const from = hub(a);
    const to = hub(b);
    flights.push(
      makeSpec(
        rng,
        'ga',
        i + 1,
        from,
        to,
        {
          cruiseGs: () => intIn(rng, 95, 125),
          cruiseAlt: (f, t) => Math.max(f.elevFt, t.elevFt) + intIn(rng, 25, 45) * 100,
          initialGs: 70,
          approachGs: 65,
          turnaroundMin: () => intIn(rng, 6, 12),
        },
        usedCallsigns,
        usedSquawks,
      ),
    );
  });

  // 3 helicopter shuttles between a city pad and its airport.
  HELI_LINKS.forEach((link, i) => {
    flights.push(
      makeSpec(
        rng,
        'heli',
        i + 1,
        link.pad,
        hub(link.icao),
        {
          cruiseGs: () => intIn(rng, 110, 140),
          cruiseAlt: (f, t) => Math.max(f.elevFt, t.elevFt) + intIn(rng, 10, 16) * 100,
          initialGs: 40,
          approachGs: 35,
          turnaroundMin: () => intIn(rng, 4, 8),
        },
        usedCallsigns,
        usedSquawks,
      ),
    );
  });

  // 4 drone shuttles inside the simulated coastal UAS corridor, 400 ft AGL.
  for (let i = 0; i < 4; i += 1) {
    const outbound = i % 2 === 0;
    flights.push(
      makeSpec(
        rng,
        'drone',
        i + 1,
        outbound ? DRONE_CORRIDOR.a : DRONE_CORRIDOR.b,
        outbound ? DRONE_CORRIDOR.b : DRONE_CORRIDOR.a,
        {
          cruiseGs: () => intIn(rng, 40, 65),
          cruiseAlt: () => 400,
          initialGs: 20,
          approachGs: 15,
          turnaroundMin: () => intIn(rng, 2, 5),
        },
        usedCallsigns,
        usedSquawks,
      ),
    );
  }

  return { seed: seed >>> 0, flights, sectors: [...SECTORS] };
}
