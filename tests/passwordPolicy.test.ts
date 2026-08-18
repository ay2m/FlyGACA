import { describe, expect, it } from 'vitest';
import { meetsPasswordPolicy, passwordRuleResults, passwordScore } from '@/calc/app/passwordPolicy';

describe('passwordRuleResults', () => {
  it('reports each rule in display order', () => {
    expect(passwordRuleResults('Ab1!xxxx').map((r) => r.id)).toEqual([
      'length',
      'mixed',
      'number',
      'special',
    ]);
    expect(passwordRuleResults('ab').map((r) => r.met)).toEqual([false, false, false, false]);
    // Mixed case only.
    expect(passwordRuleResults('Abcdefgh').map((r) => r.met)).toEqual([true, true, false, false]);
  });
});

describe('meetsPasswordPolicy', () => {
  it('is true only when all four rules pass', () => {
    expect(meetsPasswordPolicy('Abcdef1!')).toBe(true);
    expect(meetsPasswordPolicy('Abcdef1')).toBe(false); // no special
    expect(meetsPasswordPolicy('abcdef1!')).toBe(false); // no uppercase
    expect(meetsPasswordPolicy('Abcde1!')).toBe(false); // too short (7)
  });
});

describe('passwordScore', () => {
  it('grades the meter from empty to strong', () => {
    expect(passwordScore('')).toBe(-1);
    // Length rule unmet → 0 regardless of the others.
    expect(passwordScore('Ab1!')).toBe(0);
    // Length met, none of the other three → 1.
    expect(passwordScore('abcdefgh')).toBe(1);
    // Length + one/two others → 2.
    expect(passwordScore('Abcdefgh')).toBe(2);
    expect(passwordScore('Abcdefg1')).toBe(2);
    // All four → 3.
    expect(passwordScore('Abcdef1!')).toBe(3);
  });
});
