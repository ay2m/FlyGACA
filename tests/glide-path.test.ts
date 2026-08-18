import { describe, expect, it } from 'vitest';
import {
  MASTERY_BOX,
  emptyBins,
  glidePathBins,
  glideProgress,
  mergeBins,
} from '@/calc/study/glidePath';
import { MAX_BOX, type SrsEntry } from '@/calc/study/srs';

const entry = (box: number): SrsEntry => ({ box, due: '2026-01-01' });

describe('glidePathBins', () => {
  it('bins fresh cards and boxed cards, counting mastery from the threshold', () => {
    const bins = glidePathBins({ '0': entry(0), '1': entry(3), '2': entry(5) }, [
      '0',
      '1',
      '2',
      '3',
    ]);
    expect(bins.total).toBe(4);
    expect(bins.fresh).toBe(1);
    expect(bins.boxes).toEqual([1, 0, 0, 1, 0, 1]);
    expect(bins.mastered).toBe(2);
    expect(MASTERY_BOX).toBe(3);
  });

  it('clamps out-of-range and non-finite boxes instead of dropping cards', () => {
    const bins = glidePathBins(
      { a: entry(99), b: entry(-2), c: entry(Number.NaN), d: entry(2.9) },
      ['a', 'b', 'c', 'd'],
    );
    expect(bins.boxes[MAX_BOX]).toBe(1); // 99 → top box
    expect(bins.boxes[0]).toBe(2); // -2 and NaN → box 0
    expect(bins.boxes[2]).toBe(1); // 2.9 floors to 2
    expect(bins.total).toBe(4);
    expect(bins.fresh).toBe(0);
  });

  it('ignores entries for keys outside the deck', () => {
    const bins = glidePathBins({ stray: entry(4) }, ['0']);
    expect(bins.total).toBe(1);
    expect(bins.fresh).toBe(1);
    expect(bins.mastered).toBe(0);
  });
});

describe('mergeBins', () => {
  it('sums every bucket across decks', () => {
    const a = glidePathBins({ '0': entry(1) }, ['0', '1']);
    const b = glidePathBins({ '0': entry(5) }, ['0']);
    const merged = mergeBins([a, b]);
    expect(merged.total).toBe(3);
    expect(merged.fresh).toBe(1);
    expect(merged.boxes[1]).toBe(1);
    expect(merged.boxes[MAX_BOX]).toBe(1);
    expect(merged.mastered).toBe(1);
  });

  it('merges nothing into empty bins', () => {
    expect(mergeBins([])).toEqual(emptyBins());
  });
});

describe('glideProgress', () => {
  it('is 0 for an empty or all-fresh deck and 1 when every card sits in the top box', () => {
    expect(glideProgress(emptyBins())).toBe(0);
    expect(glideProgress(glidePathBins({}, ['0', '1']))).toBe(0);
    const done = glidePathBins({ '0': entry(MAX_BOX), '1': entry(MAX_BOX) }, ['0', '1']);
    expect(glideProgress(done)).toBe(1);
  });

  it('sits mid-path for a mixed deck', () => {
    // Stages: fresh = 0, box b = b + 1 → (0 + 3) / (2 × 6) = 0.25.
    const bins = glidePathBins({ '1': entry(2) }, ['0', '1']);
    expect(glideProgress(bins)).toBeCloseTo(0.25, 5);
  });
});
