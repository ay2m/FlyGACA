import { describe, expect, it } from 'vitest';
import { num, sum } from '@/calc/pilot/flightFields';
import type { Flight } from '@/lib/services/account';

function flight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'f1',
    date: '2026-01-01',
    type: 'C172',
    reg: 'HZ-ABC',
    from: 'OERK',
    to: 'OEJN',
    total: '1.5',
    pic: '1.5',
    night: '0',
    ifr: '0',
    ldg: '1',
    remarks: '',
    ...overrides,
  };
}

describe('num', () => {
  it('parses a well-formed decimal string', () => {
    expect(num('1.5')).toBe(1.5);
    expect(num('2')).toBe(2);
  });

  it('reads a blank/whitespace string as 0', () => {
    expect(num('')).toBe(0);
    expect(num('   ')).toBe(0);
  });

  it('reads undefined as 0', () => {
    expect(num(undefined)).toBe(0);
  });

  it('reads fully non-numeric garbage as 0', () => {
    expect(num('abc')).toBe(0);
    expect(num('n/a')).toBe(0);
    expect(num('--')).toBe(0);
  });

  it('parses a leading numeric prefix, ignoring a trailing unit (legacy free text)', () => {
    expect(num('2h')).toBe(2);
    expect(num('1.5 hrs')).toBe(1.5);
    expect(num('3 landings')).toBe(3);
  });

  it('tolerates leading/trailing whitespace around a number', () => {
    expect(num('  3  ')).toBe(3);
  });

  it('parses a negative number', () => {
    expect(num('-1')).toBe(-1);
  });

  it('reads "0" as 0 (not falling through to the || 0 fallback incorrectly)', () => {
    expect(num('0')).toBe(0);
    expect(num('0.0')).toBe(0);
  });

  it('takes only the first well-formed number out of a malformed multi-dot string', () => {
    expect(num('1.5.5')).toBe(1.5);
  });

  it('does not accept a comma as a decimal separator (legacy locale input)', () => {
    // parseFloat stops at the comma, so only the integer part before it parses.
    expect(num('1,5')).toBe(1);
  });
});

describe('sum', () => {
  it('totals a numeric column across flights', () => {
    const flights = [flight({ total: '1.5' }), flight({ total: '2.0' }), flight({ total: '0.5' })];
    expect(sum(flights, 'total')).toBe(4);
  });

  it('returns 0 for an empty flight list', () => {
    expect(sum([], 'total')).toBe(0);
  });

  it('treats malformed/blank entries in the column as 0 rather than propagating NaN', () => {
    const flights = [flight({ total: '1' }), flight({ total: '' }), flight({ total: 'n/a' })];
    expect(sum(flights, 'total')).toBe(1);
    expect(sum(flights, 'total')).not.toBeNaN();
  });

  it('sums an optional column that some legacy flights omit entirely', () => {
    const flights = [
      flight({ nightLdg: '2' }),
      flight({ nightLdg: undefined }),
      flight({ nightLdg: '1' }),
    ];
    expect(sum(flights, 'nightLdg')).toBe(3);
  });
});
