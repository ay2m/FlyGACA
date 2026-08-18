/**
 * Holding pattern: ICAO entry type and leg timing/fuel. Pure planning aid.
 *
 * Entry sectors for a standard (right-turn) hold, measured as a = heading −
 * inbound course (0–360): Direct = [−110°, +70°] (180°), Parallel = (70°, 180°]
 * (110°), Teardrop = (180°, 250°) (70°). Left-hand holds mirror the angle.
 */
import { fin, norm360 } from './guards';

export type HoldingEntry = 'direct' | 'parallel' | 'teardrop';

export function holdingEntry(
  inboundCourse: number,
  heading: number,
  rightTurns = true,
): HoldingEntry | null {
  if (!fin(inboundCourse, heading)) return null;
  const a = rightTurns ? norm360(heading - inboundCourse) : norm360(inboundCourse - heading);
  if (a <= 70 || a >= 250) return 'direct';
  if (a <= 180) return 'parallel';
  return 'teardrop';
}

export interface HoldTiming {
  /** Minutes for one complete circuit (two legs + two ~1-min 180° turns). */
  lapMin: number;
  totalMin: number;
  /** Fuel for the hold (null if no burn rate given). */
  fuel: number | null;
}

export function holdTiming(legMin: number, burnPerHr: number, laps: number): HoldTiming | null {
  if (!(legMin > 0) || !(laps > 0)) return null;
  const lapMin = 2 * legMin + 2;
  const totalMin = lapMin * laps;
  return { lapMin, totalMin, fuel: burnPerHr > 0 ? (burnPerHr * totalMin) / 60 : null };
}
