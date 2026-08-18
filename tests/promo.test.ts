/**
 * Promo-code client helpers (src/lib/services/promo.ts) — mirrors referral.test.ts.
 * `normalizePromo` is the client mirror of functions/src/promo-core.ts
 * `normalizePromoCode`; its sanitization rules (uppercase, strip non-alphanumerics,
 * cap at 24 chars) are asserted against that exact implementation.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizePromo, capturePromoFromUrl, getStoredPromo } from '@/lib/services/promo';

const PROMO_KEY = 'flygaca:promo';
const origHref = window.location.href;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  window.history.replaceState({}, '', origHref);
});

describe('normalizePromo', () => {
  it('upper-cases the input', () => {
    expect(normalizePromo('launch25')).toBe('LAUNCH25');
  });

  it('strips every non-alphanumeric character', () => {
    expect(normalizePromo('fly-gaca_25!')).toBe('FLYGACA25');
    expect(normalizePromo('  hi there  ')).toBe('HITHERE');
    expect(normalizePromo('50%off')).toBe('50OFF');
  });

  it('caps the result at 24 characters', () => {
    const long = 'A'.repeat(30);
    const result = normalizePromo(long);
    expect(result).toHaveLength(24);
    expect(result).toBe('A'.repeat(24));
  });

  it('truncates AFTER stripping/upper-casing, not before', () => {
    // 30 raw chars, half of which are stripped — the surviving 15 alnum chars are
    // well under the 24 cap, so nothing should be lost to a premature slice.
    const raw = 'a-b-c-d-e-f-g-h-i-j-k-l-m-n-o';
    expect(normalizePromo(raw)).toBe('ABCDEFGHIJKLMNO');
  });

  it('returns empty string for nullish or empty input', () => {
    expect(normalizePromo(null)).toBe('');
    expect(normalizePromo(undefined)).toBe('');
    expect(normalizePromo('')).toBe('');
  });

  it('returns empty string for input that is entirely non-alphanumeric', () => {
    expect(normalizePromo('---!!!')).toBe('');
  });
});

describe('capturePromoFromUrl / getStoredPromo', () => {
  it('captures and normalizes a ?promo= from the URL into localStorage', () => {
    window.history.replaceState({}, '', '/pricing?promo=launch-25');
    capturePromoFromUrl();
    expect(localStorage.getItem(PROMO_KEY)).toBe('LAUNCH25');
    expect(getStoredPromo()).toBe('LAUNCH25');
  });

  it('stores nothing when there is no promo param', () => {
    window.history.replaceState({}, '', '/pricing');
    capturePromoFromUrl();
    expect(localStorage.getItem(PROMO_KEY)).toBeNull();
    expect(getStoredPromo()).toBeUndefined();
  });

  it('stores nothing when the promo param normalizes to empty', () => {
    window.history.replaceState({}, '', '/pricing?promo=---');
    capturePromoFromUrl();
    expect(localStorage.getItem(PROMO_KEY)).toBeNull();
  });

  it('returns undefined when nothing is stored yet', () => {
    expect(getStoredPromo()).toBeUndefined();
  });
});
