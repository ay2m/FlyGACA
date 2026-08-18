import { describe, expect, it } from 'vitest';
import { readingMinutes } from '@/lib/readingTime';

describe('readingMinutes', () => {
  it('rounds words/wpm to the nearest minute', () => {
    expect(readingMinutes(Array(400).fill('w').join(' '))).toBe(2);
    expect(readingMinutes(Array(500).fill('w').join(' '))).toBe(3); // 2.5 → 3
  });

  it('never returns less than 1 for any content', () => {
    expect(readingMinutes('short text')).toBe(1);
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('   ')).toBe(1);
  });

  it('honours a custom words-per-minute', () => {
    expect(readingMinutes(Array(300).fill('w').join(' '), 100)).toBe(3);
  });
});
