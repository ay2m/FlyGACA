import { describe, expect, it } from 'vitest';
import {
  formatISODate,
  parseISO,
  recencyByDays,
  validityByMonths,
  withinDays,
} from '@/calc/recency';

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

describe('formatISODate', () => {
  it("formats an ISO date in UTC, not the runner's local zone", () => {
    // The whole module works in UTC on purpose: a logbook entry dated 2024-01-01
    // must not render as 31 Dec for a pilot west of Greenwich.
    expect(formatISODate('2024-01-01')).toContain('2024');
    expect(formatISODate('2024-01-01')).toContain('1');
  });

  it('returns the fallback for anything unparseable rather than "Invalid Date"', () => {
    expect(formatISODate('nope')).toBe('—');
    expect(formatISODate('')).toBe('—');
    expect(formatISODate('nope', 'n/a')).toBe('n/a');
  });
});

describe('withinDays', () => {
  it('includes both ends of the trailing window', () => {
    // Inclusive on both sides: currency rules count the qualifying flight itself,
    // so an off-by-one here silently makes a current pilot look lapsed. The exact
    // 90-day boundary is in, because `parseISO` anchors a date to NOON UTC and
    // `now` here is midday — that noon anchoring is what keeps the window from
    // shifting by a day either side of the date line.
    expect(withinDays('2024-02-01', 90, now)).toBe(true);
    expect(withinDays('2023-11-03', 90, now)).toBe(true);
  });

  it('excludes the day before the window opens', () => {
    expect(withinDays('2023-11-02', 90, now)).toBe(false);
  });

  it('excludes a future date', () => {
    // `now` is midday; a date after it is outside the trailing window by
    // definition, and treating it as inside would let a typo grant currency.
    expect(withinDays('2024-02-02', 90, now)).toBe(false);
  });

  it('is false for an unparseable date rather than throwing', () => {
    expect(withinDays('nope', 90, now)).toBe(false);
  });
});
