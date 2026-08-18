import { describe, expect, it } from 'vitest';
import {
  computeCurrency,
  currencyRingFraction,
  recordCurrency,
  rollingLandingExpiry,
  statusFromValidity,
  EXPIRING_SOON_DAYS,
} from '@/calc/pilot/currency';
import { recencyByDays, validityByMonths, parseISO } from '@/calc/recency';
import type { Flight, Profile } from '@/lib/services/account';

const now = new Date('2024-06-01T12:00:00Z');

const blankProfile: Pick<Profile, 'medicalExpiry' | 'lastFlightReview'> = {
  medicalExpiry: '',
  lastFlightReview: '',
};

const flight = (date: string, over: Partial<Flight> = {}): Flight => ({
  id: date,
  date,
  type: 'C172',
  reg: 'HZ-ABC',
  from: 'OERK',
  to: 'OEDF',
  total: '1.0',
  pic: '1.0',
  night: '0',
  ifr: '0',
  ldg: '1',
  remarks: '',
  ...over,
});

const item = (items: ReturnType<typeof computeCurrency>, id: string) =>
  items.find((i) => i.id === id)!;

describe('statusFromValidity', () => {
  it('maps null / expired / expiring / current', () => {
    expect(statusFromValidity(null)).toBe('unknown');
    expect(statusFromValidity(recencyByDays(parseISO('2024-01-01'), 30, now))).toBe('expired');
    expect(statusFromValidity(validityByMonths(parseISO('2024-05-20'), 1, now))).toBe('expiring');
    expect(statusFromValidity(validityByMonths(parseISO('2024-01-01'), 12, now))).toBe('current');
  });

  it('treats the EXPIRING_SOON_DAYS boundary as expiring', () => {
    const v = recencyByDays(parseISO('2024-06-01'), EXPIRING_SOON_DAYS, now)!;
    expect(v.daysLeft).toBe(EXPIRING_SOON_DAYS);
    expect(statusFromValidity(v)).toBe('expiring');
  });
});

describe('computeCurrency — medical & flight review', () => {
  it('reports unknown when nothing is set', () => {
    const items = computeCurrency(blankProfile, [], now);
    expect(item(items, 'medical').status).toBe('unknown');
    expect(item(items, 'medical').detailKey).toBe('currency.notSet');
    expect(item(items, 'flightReview').status).toBe('unknown');
  });

  it('flags an expired medical and a current one', () => {
    expect(
      item(computeCurrency({ ...blankProfile, medicalExpiry: '2024-05-01' }, [], now), 'medical')
        .status,
    ).toBe('expired');
    expect(
      item(computeCurrency({ ...blankProfile, medicalExpiry: '2025-05-01' }, [], now), 'medical')
        .status,
    ).toBe('current');
  });

  it('derives the flight-review renewal 24 months on', () => {
    const it1 = item(
      computeCurrency({ ...blankProfile, lastFlightReview: '2023-01-15' }, [], now),
      'flightReview',
    );
    expect(it1.status).toBe('current');
    expect(it1.expiry?.toISOString().slice(0, 10)).toBe('2025-01-15');
  });
});

describe('rollingLandingExpiry', () => {
  const pickLdg = (f: Flight) => parseFloat(f.ldg) || 0;

  it('is current with exactly 3 landings and lapses 90 days after the 3rd-newest', () => {
    const flights = [
      flight('2024-05-20', { ldg: '1' }),
      flight('2024-05-10', { ldg: '1' }),
      flight('2024-04-15', { ldg: '1' }), // the 3rd most-recent landing
      flight('2023-01-01', { ldg: '5' }), // outside the 90-day window
    ];
    const r = rollingLandingExpiry(flights, 90, 3, pickLdg, now);
    expect(r.count).toBe(3);
    expect(r.current).toBe(true);
    expect(r.expiry?.toISOString().slice(0, 10)).toBe('2024-07-14'); // 2024-04-15 + 90d
  });

  it('is not current with only 2 landings in window', () => {
    const r = rollingLandingExpiry(
      [flight('2024-05-20'), flight('2024-05-10')],
      90,
      3,
      pickLdg,
      now,
    );
    expect(r.count).toBe(2);
    expect(r.current).toBe(false);
    expect(r.expiry).toBeNull();
  });

  it('does not depend on input order', () => {
    const a = rollingLandingExpiry(
      [flight('2024-04-15'), flight('2024-05-20'), flight('2024-05-10')],
      90,
      3,
      pickLdg,
      now,
    );
    expect(a.current).toBe(true);
    expect(a.expiry?.toISOString().slice(0, 10)).toBe('2024-07-14');
  });
});

describe('computeCurrency — passenger & night & ifr', () => {
  it('passes day passenger currency with 3 landings, expired night without night landings', () => {
    const flights = [flight('2024-05-20', { ldg: '3', nightLdg: '0' })];
    const items = computeCurrency(blankProfile, flights, now);
    expect(item(items, 'passenger90').status).not.toBe('expired');
    expect(item(items, 'nightPassenger').status).toBe('expired');
  });

  it('passes night currency when night landings are logged', () => {
    const flights = [flight('2024-05-20', { ldg: '3', nightLdg: '3' })];
    expect(item(computeCurrency(blankProfile, flights, now), 'nightPassenger').status).not.toBe(
      'expired',
    );
  });

  it('reports IFR as unknown until approaches are logged', () => {
    expect(item(computeCurrency(blankProfile, [flight('2024-05-20')], now), 'ifr').status).toBe(
      'unknown',
    );
    const withAppr = computeCurrency(blankProfile, [flight('2024-05-20', { appr: '6' })], now);
    expect(item(withAppr, 'ifr').status).not.toBe('unknown');
  });

  it('exposes count progress on landing items but not time-based ones', () => {
    const flights = [flight('2024-05-20', { ldg: '2', nightLdg: '0' })];
    const items = computeCurrency(blankProfile, flights, now);
    expect(item(items, 'passenger90').count).toEqual({ have: 2, need: 3 });
    expect(item(items, 'medical').count).toBeUndefined();
    expect(item(items, 'flightReview').count).toBeUndefined();
  });
});

describe('recordCurrency', () => {
  const rec = (over: Partial<import('@/lib/services/account').PilotRecord> = {}) => ({
    id: 'r1',
    category: 'rating' as const,
    title: 'Instrument Rating',
    ref: '',
    issued: '',
    expires: '',
    remarks: '',
    ...over,
  });

  it('skips records without an expiry', () => {
    expect(recordCurrency([rec({ expires: '' })], now)).toEqual([]);
  });

  it('builds an item with the record title as its label and a status from the expiry', () => {
    const items = recordCurrency(
      [
        rec({ id: 'a', expires: '2024-05-01' }), // past → expired
        rec({ id: 'b', expires: '2024-06-20' }), // within 30 days → expiring
        rec({ id: 'c', expires: '2025-01-01' }), // far future → current
      ],
      now,
    );
    expect(items.map((i) => i.status)).toEqual(['expired', 'expiring', 'current']);
    expect(items[0].label).toBe('Instrument Rating');
    expect(items[0].id).toBe('record-a');
    expect(items[0].fixTo).toBe('/records');
  });
});

describe('currencyRingFraction', () => {
  it('fills proportionally over the 90-day horizon and caps at full', () => {
    expect(currencyRingFraction({ daysLeft: 90 })).toBeCloseTo(1, 5);
    expect(currencyRingFraction({ daysLeft: 45 })).toBeCloseTo(0.5, 5);
    expect(currencyRingFraction({ daysLeft: 300 })).toBe(1); // far off → full
  });
  it('reads empty for a lapsed or unassessable item', () => {
    expect(currencyRingFraction({ daysLeft: -5 })).toBe(0);
    expect(currencyRingFraction({ daysLeft: null })).toBe(0);
  });
});
