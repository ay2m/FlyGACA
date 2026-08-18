/**
 * Leitner-style spaced-repetition scheduling for flashcards. Pure (no DOM /
 * storage) so it is unit-testable and the store/UI just persist + render its
 * output. A card lives in a "box" (0…MAX_BOX); a correct grade promotes it (and
 * lengthens the interval), a wrong grade sends it back to box 0. A card is due
 * when its `due` date is today or earlier — unseen cards are always due.
 */

export const MAX_BOX = 5;

/** Review interval in days for each box (index 0…MAX_BOX). */
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export interface SrsEntry {
  box: number;
  /** ISO yyyy-mm-dd the card next becomes due. */
  due: string;
}

export function srsDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function boxIntervalDays(box: number): number {
  return INTERVAL_DAYS[Math.max(0, Math.min(MAX_BOX, box))];
}

/** Promote on a correct grade (capped), reset to box 0 on a wrong one. */
export function nextBox(box: number, correct: boolean): number {
  return correct ? Math.min(MAX_BOX, box + 1) : 0;
}

/** The card's new box + due date after grading it now. */
export function scheduleCard(prev: SrsEntry | undefined, correct: boolean, now: Date): SrsEntry {
  const box = nextBox(prev?.box ?? 0, correct);
  const due = srsDay(new Date(now.getTime() + boxIntervalDays(box) * 86400000));
  return { box, due };
}

/** True when a card should be reviewed now (unseen cards count as due). */
export function isDue(entry: SrsEntry | undefined, now: Date): boolean {
  if (!entry) return true;
  return entry.due <= srsDay(now);
}

/** The subset of `allKeys` that are due now, preserving input order. */
export function dueKeys(entries: Record<string, SrsEntry>, allKeys: string[], now: Date): string[] {
  return allKeys.filter((k) => isDue(entries[k], now));
}

/** How many cards in `allKeys` are due now. */
export function dueCount(entries: Record<string, SrsEntry>, allKeys: string[], now: Date): number {
  return dueKeys(entries, allKeys, now).length;
}

/** Cards considered "learned" (box at/above the threshold). */
export function masteredCount(entries: Record<string, SrsEntry>, threshold = 3): number {
  return Object.values(entries).filter((e) => e.box >= threshold).length;
}
