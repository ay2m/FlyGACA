import { describe, expect, it } from 'vitest';
import { fin, norm360, ok } from '@/calc/guards';

describe('fin', () => {
  it('accepts finite numbers, including zero and negatives', () => {
    expect(fin(0)).toBe(true);
    expect(fin(1, 2, 3)).toBe(true);
    expect(fin(-42.5)).toBe(true);
  });

  it('rejects NaN', () => {
    expect(fin(NaN)).toBe(false);
    expect(fin(1, NaN)).toBe(false);
  });

  it('rejects +Infinity and -Infinity', () => {
    expect(fin(Infinity)).toBe(false);
    expect(fin(-Infinity)).toBe(false);
    expect(fin(1, 2, Infinity)).toBe(false);
  });

  it('is vacuously true with no arguments', () => {
    expect(fin()).toBe(true);
  });
});

describe('ok', () => {
  it('accepts strictly positive finite numbers', () => {
    expect(ok(1)).toBe(true);
    expect(ok(0.0001)).toBe(true);
    expect(ok(1e6)).toBe(true);
  });

  it('rejects zero and negative numbers', () => {
    expect(ok(0)).toBe(false);
    expect(ok(-1)).toBe(false);
    expect(ok(-0.0001)).toBe(false);
  });

  it('rejects NaN and +/-Infinity', () => {
    expect(ok(NaN)).toBe(false);
    expect(ok(Infinity)).toBe(false);
    expect(ok(-Infinity)).toBe(false);
  });
});

describe('norm360', () => {
  it('leaves an in-range bearing unchanged', () => {
    expect(norm360(0)).toBe(0);
    expect(norm360(90)).toBe(90);
    expect(norm360(359)).toBe(359);
  });

  it('wraps a value of exactly 360 down to 0', () => {
    expect(norm360(360)).toBe(0);
  });

  it('wraps large positive overshoots', () => {
    expect(norm360(361)).toBe(1);
    expect(norm360(720)).toBe(0);
    expect(norm360(725)).toBe(5);
    expect(norm360(3600)).toBe(0);
  });

  it('wraps negative angles into [0, 360)', () => {
    expect(norm360(-1)).toBe(359);
    expect(norm360(-90)).toBe(270);
    expect(norm360(-360)).toBe(0);
    expect(norm360(-361)).toBe(359);
    expect(norm360(-720)).toBe(0);
  });

  it('handles fractional degrees', () => {
    expect(norm360(360.5)).toBeCloseTo(0.5, 10);
    expect(norm360(-0.5)).toBeCloseTo(359.5, 10);
  });

  it('produces NaN for non-finite input (garbage-in/garbage-out, not a throw)', () => {
    expect(norm360(NaN)).toBeNaN();
    expect(norm360(Infinity)).toBeNaN();
    expect(norm360(-Infinity)).toBeNaN();
  });
});
