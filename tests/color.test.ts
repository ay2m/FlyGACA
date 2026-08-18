import { describe, expect, it } from 'vitest';
import { withAlpha } from '@/lib/color';

describe('withAlpha', () => {
  it('rewrites 6-digit hex to rgba with the requested alpha', () => {
    expect(withAlpha('#3fe0ff', 0)).toBe('rgba(63, 224, 255, 0)');
    expect(withAlpha('#3fe0ff', 0.5)).toBe('rgba(63, 224, 255, 0.5)');
    expect(withAlpha('#3fe0ff', 1)).toBe('rgba(63, 224, 255, 1)');
  });

  it('expands 3-digit hex shorthand', () => {
    expect(withAlpha('#3fe', 0)).toBe('rgba(51, 255, 238, 0)');
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(withAlpha(' #FFC23D ', 0)).toBe('rgba(255, 194, 61, 0)');
  });

  it('replaces the alpha of rgb()/rgba() inputs', () => {
    expect(withAlpha('rgb(63, 224, 255)', 0)).toBe('rgba(63, 224, 255, 0)');
    expect(withAlpha('rgba(63, 224, 255, 0.9)', 0.25)).toBe('rgba(63, 224, 255, 0.25)');
  });

  it('clamps alpha to [0, 1]', () => {
    expect(withAlpha('#000000', -1)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#000000', 2)).toBe('rgba(0, 0, 0, 1)');
  });

  it('falls back to color-mix for formats it does not parse', () => {
    expect(withAlpha('oklch(0.7 0.1 200)', 0.4)).toBe(
      'color-mix(in srgb, oklch(0.7 0.1 200) 40%, transparent)',
    );
  });
});
