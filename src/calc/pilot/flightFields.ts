import type { Flight } from '@/lib/services/account';

/**
 * Readers for the free-text numeric columns on a logbook `Flight`.
 *
 * Hours and landings are stored as strings (the user types them), so every
 * aggregate — totals, recency counts, achievement thresholds — has to coerce
 * the same way. A blank, a stray unit, or anything unparseable reads as 0
 * rather than propagating NaN through a summary.
 */

/** Parse a free-text numeric field; anything unparseable (or absent) reads as 0. */
export const num = (s: string | undefined): number => parseFloat(String(s ?? '')) || 0;

/** Total one numeric column across a set of flights. */
export const sum = (flights: Flight[], key: keyof Flight): number =>
  flights.reduce((total, f) => total + num(f[key] as string), 0);
