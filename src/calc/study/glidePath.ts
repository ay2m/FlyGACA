/**
 * Read-model for the SRS "glide path" strip: where a deck's cards sit along
 * the approach to mastery. Pure aggregation over the frozen Leitner contract
 * in ./srs — this module never schedules or mutates anything, so the
 * cross-platform SRS semantics stay untouched.
 */

import { fin } from '@/calc/guards';
import { MAX_BOX, type SrsEntry } from './srs';

/** Box at/above which a card counts as mastered (matches masteredCount's default). */
export const MASTERY_BOX = 3;

export interface GlidePathBins {
  /** Cards with no SRS entry yet (never graded). */
  fresh: number;
  /** Cards per Leitner box 0…MAX_BOX. */
  boxes: number[];
  /** Cards at or above MASTERY_BOX. */
  mastered: number;
  total: number;
}

export function emptyBins(): GlidePathBins {
  return {
    fresh: 0,
    boxes: Array.from({ length: MAX_BOX + 1 }, () => 0),
    mastered: 0,
    total: 0,
  };
}

/** Bin one deck's cards by Leitner box. Out-of-range or bad boxes clamp into range. */
export function glidePathBins(
  entries: Record<string, SrsEntry>,
  allKeys: readonly string[],
): GlidePathBins {
  const bins = emptyBins();
  for (const key of allKeys) {
    bins.total += 1;
    const entry = entries[key];
    if (!entry) {
      bins.fresh += 1;
      continue;
    }
    const raw = fin(entry.box) ? Math.floor(entry.box) : 0;
    const box = Math.max(0, Math.min(MAX_BOX, raw));
    bins.boxes[box] += 1;
    if (box >= MASTERY_BOX) bins.mastered += 1;
  }
  return bins;
}

/** Merge per-deck bins (the study dashboard aggregates every bank). */
export function mergeBins(all: readonly GlidePathBins[]): GlidePathBins {
  const out = emptyBins();
  for (const b of all) {
    out.fresh += b.fresh;
    out.mastered += b.mastered;
    out.total += b.total;
    for (let i = 0; i < out.boxes.length; i += 1) out.boxes[i] += b.boxes[i] ?? 0;
  }
  return out;
}

/**
 * Mean progress along the glide path, 0 (all cards fresh) → 1 (all in the top
 * box): fresh counts as stage 0 and box b as stage b + 1.
 */
export function glideProgress(bins: GlidePathBins): number {
  if (bins.total <= 0) return 0;
  let sum = 0;
  for (let b = 0; b < bins.boxes.length; b += 1) sum += (b + 1) * (bins.boxes[b] ?? 0);
  return sum / (bins.total * (MAX_BOX + 1));
}
