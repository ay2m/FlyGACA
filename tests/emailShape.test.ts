import { describe, expect, it } from 'vitest';
import { looksLikeEmail } from '@/calc/app/emailShape';

describe('looksLikeEmail', () => {
  it('accepts a plausible address', () => {
    expect(looksLikeEmail('you@example.com')).toBe(true);
    expect(looksLikeEmail('a.b+tag@sub.example.co')).toBe(true);
  });

  it('rejects missing parts, spaces, or no dot in the domain', () => {
    expect(looksLikeEmail('you@example')).toBe(false);
    expect(looksLikeEmail('you.example.com')).toBe(false);
    expect(looksLikeEmail('@example.com')).toBe(false);
    expect(looksLikeEmail('you @example.com')).toBe(false);
    expect(looksLikeEmail('')).toBe(false);
  });
});
