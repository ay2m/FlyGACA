/**
 * Crosswind/headwind for a set of runways at once — reuses the crosswind core.
 * Pure planning aid.
 */
import { resolveCrosswind } from './crosswind';

export interface RunwayWind {
  /** The runway as the user wrote it, e.g. "34R". */
  label: string;
  heading: number;
  crosswind: number;
  headwind: number;
}

/** Components for each runway designator against a single reported wind. */
export function windTable(runways: string[], windDir: number, windSpeed: number): RunwayWind[] {
  if (!Number.isFinite(windDir) || !Number.isFinite(windSpeed)) return [];
  const out: RunwayWind[] = [];
  for (const raw of runways) {
    const label = raw.trim();
    const m = label.match(/\d+/);
    if (!m) continue;
    const r = resolveCrosswind({ runway: parseInt(m[0], 10), windDir, windSpeed });
    if (r)
      out.push({ label, heading: r.runwayHeading, crosswind: r.crosswind, headwind: r.headwind });
  }
  return out;
}

/** Parse a comma/slash/space separated runway list (e.g. "16L/34R, 07"). */
export function parseRunways(input: string): string[] {
  return input
    .split(/[,/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
