/**
 * Crosswind & headwind resolution. Pure functions — no DOM, no i18n — so they
 * can be unit-tested directly. Ported from the legacy assets/js/tools-crosswind.js.
 */

export interface CrosswindInput {
  /** Runway designator (e.g. 34) or magnetic heading (e.g. 340). */
  runway: number;
  /** Wind direction the wind is coming FROM, in degrees. */
  windDir: number;
  /** Wind speed in knots. */
  windSpeed: number;
}

export interface CrosswindResult {
  /** Resolved runway heading in degrees (0–359). */
  runwayHeading: number;
  /** Signed wind angle relative to the runway centreline (−180..180). */
  angle: number;
  /** Crosswind component, kt. Positive = from the right, negative = from the left. */
  crosswind: number;
  /** Along-runway component, kt. Positive = headwind, negative = tailwind. */
  headwind: number;
}

const DEG = Math.PI / 180;

/**
 * Normalises a runway input to a heading. Values ≤ 36 are treated as a runway
 * designator (×10); larger values are treated as a heading already.
 */
export function runwayHeading(runway: number): number | null {
  if (!Number.isFinite(runway)) return null;
  const n = Math.trunc(Math.abs(runway));
  if (n === 0) return null;
  return n > 36 ? n % 360 : (n % 36) * 10;
}

/** Resolves the reported wind into crosswind/headwind components. */
export function resolveCrosswind(input: CrosswindInput): CrosswindResult | null {
  const heading = runwayHeading(input.runway);
  if (heading == null || !Number.isFinite(input.windDir) || !Number.isFinite(input.windSpeed)) {
    return null;
  }
  // Signed angle in −180..180 between the wind and the runway centreline.
  const angle = ((input.windDir - heading + 540) % 360) - 180;
  const rad = angle * DEG;
  return {
    runwayHeading: heading,
    angle,
    crosswind: input.windSpeed * Math.sin(rad),
    headwind: input.windSpeed * Math.cos(rad),
  };
}
