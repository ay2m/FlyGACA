import { afterEach, describe, expect, it, vi } from 'vitest';
import { shuffle } from '@/calc/study/shuffle';

// The study surfaces (quiz runner, flashcards) rely on an unbiased, pure
// shuffle: same multiset back, input untouched, and the Fisher–Yates walk
// driven by Math.random from the top index down.

afterEach(() => vi.restoreAllMocks());

describe('shuffle', () => {
  it('returns a new array with the same elements and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5];
    const snapshot = [...input];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect(input).toEqual(snapshot);
    expect([...out].sort()).toEqual([...snapshot].sort());
  });

  it('is deterministic under a stubbed Math.random (reverses on always-0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // j is always 0: each element swaps to the front — [1,2,3,4] walks to [2,3,4,1].
    expect(shuffle([1, 2, 3, 4])).toEqual([2, 3, 4, 1]);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([7])).toEqual([7]);
  });
});
