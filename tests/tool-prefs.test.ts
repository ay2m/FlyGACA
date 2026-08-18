import { describe, expect, it } from 'vitest';
import { addRecent, moveId, toggleId } from '@/lib/prefs/toolPrefs';

describe('addRecent', () => {
  it('prepends most-recent-first and de-duplicates', () => {
    expect(addRecent(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
    expect(addRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('caps the list at max, dropping the oldest', () => {
    expect(addRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});

describe('toggleId', () => {
  it('adds when absent and removes when present', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('moveId', () => {
  it('moves an item earlier or later by delta', () => {
    expect(moveId(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(moveId(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c', 'd'], 'd', -2)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps at the bounds (first up / last down are no-ops)', () => {
    expect(moveId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveId(['a', 'b', 'c'], 'c', 5)).toEqual(['a', 'b', 'c']);
  });

  it('returns the list unchanged when the id is absent', () => {
    expect(moveId(['a', 'b'], 'z', 1)).toEqual(['a', 'b']);
  });
});
