import { describe, expect, it } from 'vitest';
import {
  checkoutErrorCode,
  classifyCompareCell,
  foundingAnnualPrice,
  pricingCheckoutOutcome,
  showFoundingStrike,
} from '@/calc/app/pricingView';

describe('pricingCheckoutOutcome', () => {
  it('routes sign-in-required to the account page', () => {
    expect(pricingCheckoutOutcome('sign-in-required')).toBe('navigate-account');
  });

  it('maps the student-verification code to the student-verify notice', () => {
    expect(pricingCheckoutOutcome('student-verification-required')).toBe('student-verify');
  });

  it('falls back to generic for any other code', () => {
    expect(pricingCheckoutOutcome('network-error')).toBe('generic');
    expect(pricingCheckoutOutcome('')).toBe('generic');
  });
});

describe('checkoutErrorCode', () => {
  it('reads an Error message, else empty string', () => {
    expect(checkoutErrorCode(new Error('sign-in-required'))).toBe('sign-in-required');
    expect(checkoutErrorCode('nope')).toBe('');
    expect(checkoutErrorCode(null)).toBe('');
    expect(checkoutErrorCode(undefined)).toBe('');
  });
});

describe('classifyCompareCell', () => {
  it('classifies the check / cross glyphs and passes text through', () => {
    expect(classifyCompareCell('✓')).toBe('yes');
    expect(classifyCompareCell('✕')).toBe('no');
    expect(classifyCompareCell('5 / day')).toBe('text');
    expect(classifyCompareCell('Unlimited')).toBe('text');
  });
});

describe('foundingAnnualPrice', () => {
  it('uses the founding intro price while the offer is on, else the list price', () => {
    expect(foundingAnnualPrice(true, 349, 449)).toBe(349);
    expect(foundingAnnualPrice(false, 349, 449)).toBe(449);
  });
});

describe('showFoundingStrike', () => {
  it('shows the strike only during the founding launch on the annual view', () => {
    expect(showFoundingStrike(true, true)).toBe(true);
    expect(showFoundingStrike(true, false)).toBe(false);
    expect(showFoundingStrike(false, true)).toBe(false);
    expect(showFoundingStrike(false, false)).toBe(false);
  });
});
