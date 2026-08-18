import { describe, expect, it } from 'vitest';
import { annualSavingsPct, monthlyEquivalent } from '@/lib/services/pricing';

describe('annualSavingsPct', () => {
  it('computes the discount of annual vs 12× monthly', () => {
    expect(annualSavingsPct(59, 349)).toBe(51);
    expect(annualSavingsPct(10, 120)).toBe(0);
    expect(annualSavingsPct(10, 90)).toBe(25);
  });

  it('guards against a zero/negative monthly price', () => {
    expect(annualSavingsPct(0, 100)).toBe(0);
  });
});

describe('monthlyEquivalent', () => {
  it('divides an annual price into a rounded monthly figure', () => {
    expect(monthlyEquivalent(349)).toBe(29);
    expect(monthlyEquivalent(120)).toBe(10);
  });
});
