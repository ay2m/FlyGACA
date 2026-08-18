import { describe, expect, it } from 'vitest';
import { addId } from '@/lib/prefs/guidePrefs';
import { toggleId } from '@/lib/prefs/toolPrefs';

describe('addId', () => {
  it('appends when absent and is idempotent when present', () => {
    expect(addId(['a'], 'b')).toEqual(['a', 'b']);
    const list = ['a', 'b'];
    expect(addId(list, 'a')).toBe(list); // same reference — no change
  });
});

describe('toggleId (guide bookmarks reuse)', () => {
  it('adds when absent and removes when present', () => {
    expect(toggleId([], 'g1')).toEqual(['g1']);
    expect(toggleId(['g1', 'g2'], 'g1')).toEqual(['g2']);
  });
});
