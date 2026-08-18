import { describe, expect, it } from 'vitest';
import { gacarSectionAnchor } from '@/calc/library/anchor';

// The clean clause-anchor scheme the reader injects beside each GACAR section
// heading, so citation deep links resolve even where the corpus heading id is
// OCR-noisy. Pure text → id, no DOM.
describe('gacarSectionAnchor', () => {
  it('derives a clean anchor from a well-formed § heading', () => {
    expect(gacarSectionAnchor('§ 91.155 Basic VFR Weather Minimums.')).toBe('sec-91-155');
  });

  it('recovers the section number from OCR-noisy headings', () => {
    expect(gacarSectionAnchor('bfxi91.65 Aircraft Speed.')).toBe('sec-91-65');
    expect(gacarSectionAnchor('mathbf§91.13 Civil Aircraft Flight Manual.')).toBe('sec-91-13');
  });

  it('handles single-digit sections and other Parts', () => {
    expect(gacarSectionAnchor('§ 91.8 Flight Logbook.')).toBe('sec-91-8');
    expect(gacarSectionAnchor('§ 61.57 Recent Flight Experience.')).toBe('sec-61-57');
    expect(gacarSectionAnchor('§ 25.561 (b)(3)')).toBe('sec-25-561');
  });

  it('returns null for running headers and subpart titles (no P.n)', () => {
    expect(gacarSectionAnchor('GACAR PART 91 - GENERAL OPERATING AND FLIGHT RULES')).toBeNull();
    expect(gacarSectionAnchor('SUBPART A -GENERAL')).toBeNull();
    expect(gacarSectionAnchor('')).toBeNull();
  });
});
