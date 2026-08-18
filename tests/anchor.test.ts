import { describe, expect, it } from 'vitest';
import { sectionId } from '@/calc/library/anchor';

describe('sectionId', () => {
  it('slugs the heading and prefixes the index', () => {
    expect(sectionId(0, 'Fuel reserves')).toBe('sec-0-fuel-reserves');
    expect(sectionId(3, 'VFR weather minima')).toBe('sec-3-vfr-weather-minima');
  });

  it('collapses punctuation and trims stray separators', () => {
    expect(sectionId(1, '  §91.155 — Basic VFR!  ')).toBe('sec-1-91-155-basic-vfr');
  });

  it('falls back to "section" when the heading has no usable characters', () => {
    expect(sectionId(2, '—')).toBe('sec-2-section');
    expect(sectionId(4, '')).toBe('sec-4-section');
  });

  it('lowercases and keeps digits', () => {
    expect(sectionId(5, 'Part 61 Rules')).toBe('sec-5-part-61-rules');
  });
});
