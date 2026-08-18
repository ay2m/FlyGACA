import { describe, expect, it } from 'vitest';
import { parseISO, recencyByDays, validityByMonths } from '@/calc/recency';

const now = new Date('2024-02-01T12:00:00Z');

describe('parseISO', () => {
  it('parses an ISO date and rejects junk', () => {
    expect(parseISO('2024-01-01')).not.toBeNull();
    expect(parseISO('nope')).toBeNull();
  });
});

describe('recencyByDays', () => {
  it('expires window days after the start and is current before then', () => {
    const v = recencyByDays(parseISO('2024-01-01'), 90, now)!;
    expect(v.expiry.toISOString().slice(0, 10)).toBe('2024-03-31');
    expect(v.current).toBe(true);
    expect(v.daysLeft).toBe(59);
  });
  it('flags an expired window', () => {
    const v = recencyByDays(parseISO('2023-10-01'), 90, now)!;
    expect(v.current).toBe(false);
    expect(v.daysLeft).toBeLessThan(0);
  });
});

describe('validityByMonths', () => {
  it('adds calendar months', () => {
    const v = validityByMonths(parseISO('2024-01-15'), 12, now)!;
    expect(v.expiry.toISOString().slice(0, 10)).toBe('2025-01-15');
    expect(v.current).toBe(true);
  });
  it('returns null on bad input', () => {
    expect(validityByMonths(null, 12, now)).toBeNull();
    expect(validityByMonths(parseISO('2024-01-01'), 0, now)).toBeNull();
  });
});
