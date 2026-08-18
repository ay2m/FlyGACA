/**
 * Callsign and squawk assignment for the simulated fleet.
 *
 * Prefixes are deliberately training-flavoured and belong to **no real
 * operator or authority** — attributing fabricated traffic to a real airline
 * (or to GACA itself) would collide with the platform's not-affiliated stance.
 */
import { intIn } from './rng';
import type { FleetKind } from './types';

export const CALLSIGN_PREFIXES: Record<FleetKind, readonly string[]> = {
  jet: ['FALCON', 'OASIS'],
  ga: ['TRAINER'],
  heli: ['ROTOR'],
  drone: ['UAS'],
};

/** A unique `PREFIX-NN` callsign for the fleet, tracked in `used`. */
export function assignCallsign(rng: () => number, kind: FleetKind, used: Set<string>): string {
  const prefixes = CALLSIGN_PREFIXES[kind];
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const prefix = prefixes[Math.floor(rng() * prefixes.length)];
    const n = intIn(rng, 1, 99);
    const cs = `${prefix}-${String(n).padStart(2, '0')}`;
    if (!used.has(cs)) {
      used.add(cs);
      return cs;
    }
  }
  // Deterministic fallback: extend numbering past two digits.
  const cs = `${prefixes[0]}-${100 + used.size}`;
  used.add(cs);
  return cs;
}

/**
 * Codes that must never appear on a simulated target: emergency (7500 hijack,
 * 7600 radio failure, 7700 emergency) and common conspicuity codes.
 */
export const RESERVED_SQUAWKS = new Set(['7500', '7600', '7700', '7000', '1200', '2000', '0000']);

/** A unique 4-digit octal squawk outside the reserved set. */
export function assignSquawk(rng: () => number, used: Set<string>): string {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    // First digit capped at 6 so the 75xx/76xx/77xx emergency block is unreachable.
    const code =
      String(intIn(rng, 0, 6)) +
      String(intIn(rng, 0, 7)) +
      String(intIn(rng, 0, 7)) +
      String(intIn(rng, 0, 7));
    if (!RESERVED_SQUAWKS.has(code) && !used.has(code)) {
      used.add(code);
      return code;
    }
  }
  // Practically unreachable; keep the octal invariant either way.
  const fallback = `0${String(used.size % 8)}77`;
  used.add(fallback);
  return fallback;
}
