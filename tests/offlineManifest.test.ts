import { describe, expect, it } from 'vitest';
import { addSaved, formatBytes, listSaved, removeSaved } from '@/calc/library/offlineManifest';

describe('saved-slug list', () => {
  it('adds without duplicating and preserves order', () => {
    expect(addSaved(['part-1'], 'part-91')).toEqual(['part-1', 'part-91']);
    expect(addSaved(['part-1'], 'part-1')).toEqual(['part-1']);
  });

  it('removes a slug', () => {
    expect(removeSaved(['part-1', 'part-91'], 'part-1')).toEqual(['part-91']);
    expect(removeSaved(['part-1'], 'nope')).toEqual(['part-1']);
  });

  it('coerces unknown stored values to a string list', () => {
    expect(listSaved(['a', 1, 'b', null])).toEqual(['a', 'b']);
    expect(listSaved(null)).toEqual([]);
    expect(listSaved('x')).toEqual([]);
  });
});

describe('formatBytes', () => {
  it('formats across units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('guards non-finite / negative input', () => {
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });
});
