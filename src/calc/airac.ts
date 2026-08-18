/** AIRAC cycle maths. Cycles are 28 days, anchored to AIRAC 2001 which became
 *  effective on 02 Jan 2020. The identifier is YYNN (2-digit year + ordinal
 *  within that year). Pure. */

const ANCHOR = Date.UTC(2020, 0, 2); // AIRAC 2001
const CYCLE_MS = 28 * 86400000;
import { DAY_MS } from './recency';

/** Effective time (ms, UTC) of the cycle in force at instant t. */
function cycleEffective(t: number): number {
  return ANCHOR + Math.floor((t - ANCHOR) / CYCLE_MS) * CYCLE_MS;
}

function cycleId(effMs: number): string {
  const year = new Date(effMs).getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const before = cycleEffective(jan1);
  const firstOfYear = before >= jan1 ? before : before + CYCLE_MS;
  const ordinal = Math.round((effMs - firstOfYear) / CYCLE_MS) + 1;
  return String(year % 100).padStart(2, '0') + String(ordinal).padStart(2, '0');
}

export interface AiracCycle {
  /** YYNN identifier, e.g. "2401". */
  id: string;
  effective: Date;
  next: Date;
  nextId: string;
  daysToNext: number;
}

export function airacCycle(date: Date = new Date()): AiracCycle {
  const t = date.getTime();
  const eff = cycleEffective(t);
  const next = eff + CYCLE_MS;
  return {
    id: cycleId(eff),
    effective: new Date(eff),
    next: new Date(next),
    nextId: cycleId(next),
    daysToNext: Math.ceil((next - t) / DAY_MS),
  };
}

/** Days in one AIRAC cycle. */
export const AIRAC_CYCLE_DAYS = 28;

export interface AiracProgress {
  /** 1-based day within the current cycle (1…28). */
  dayInCycle: number;
  /** Fraction of the cycle elapsed, 0…1. */
  fraction: number;
}

/** How far through the current 28-day cycle `date` sits — drives the ring. */
export function cycleProgress(date: Date = new Date()): AiracProgress {
  const t = date.getTime();
  const into = t - cycleEffective(t);
  return {
    dayInCycle: Math.floor(into / DAY_MS) + 1,
    fraction: Math.min(1, Math.max(0, into / (AIRAC_CYCLE_DAYS * DAY_MS))),
  };
}
