import { describe, expect, it } from 'vitest';
import {
  summarizeLogbook,
  flightsToCsv,
  monthlyHours,
  csvToFlights,
  filterFlights,
  sortFlights,
  aircraftTotals,
  monthTotals,
} from '@/calc/pilot/logbook';
import type { Flight } from '@/lib/services/account';

const now = new Date('2024-06-01T12:00:00Z');

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

describe('summarizeLogbook', () => {
  const flights = [
    flight('2024-05-20', { total: '2.0', pic: '2.0', night: '1.0', ifr: '0.5', ldg: '2' }),
    flight('2024-04-10', { total: '1.5', pic: '1.0', ldg: '1' }),
    flight('2024-01-01', { total: '3.0', pic: '3.0', ldg: '4' }), // outside the 90-day window
  ];

  it('sums every flight for the lifetime totals', () => {
    const s = summarizeLogbook(flights, now);
    expect(s.totalHours).toBeCloseTo(6.5);
    expect(s.picHours).toBeCloseTo(6.0);
    expect(s.nightHours).toBeCloseTo(1.0);
    expect(s.landings).toBe(7);
    expect(s.flightCount).toBe(3);
  });

  it('windows the last-90-day rollup', () => {
    const s = summarizeLogbook(flights, now);
    expect(s.last90.flightCount).toBe(2);
    expect(s.last90.hours).toBeCloseTo(3.5);
    expect(s.last90.landings).toBe(3);
  });

  it('returns the newest-first slice for recent', () => {
    const s = summarizeLogbook(flights, now, 2);
    expect(s.recent.map((f) => f.date)).toEqual(['2024-05-20', '2024-04-10']);
  });
});

describe('monthlyHours', () => {
  it('buckets total hours into the trailing N months, oldest first', () => {
    const flights = [
      flight('2024-06-01', { total: '2.0' }),
      flight('2024-06-20', { total: '1.5' }),
      flight('2024-04-10', { total: '3.0' }),
      flight('2023-12-01', { total: '9.0' }), // outside a 6-month window
    ];
    const buckets = monthlyHours(flights, 6, now);
    expect(buckets).toHaveLength(6);
    expect(buckets[buckets.length - 1].key).toBe('2024-06');
    expect(buckets[buckets.length - 1].hours).toBeCloseTo(3.5);
    expect(buckets[buckets.length - 1].label).toBe('Jun');
    expect(buckets.find((b) => b.key === '2024-04')!.hours).toBeCloseTo(3.0);
    expect(buckets.some((b) => b.key === '2023-12')).toBe(false);
  });

  it('returns zeroed buckets when there are no flights', () => {
    const buckets = monthlyHours([], 3, now);
    expect(buckets).toHaveLength(3);
    expect(buckets.every((b) => b.hours === 0)).toBe(true);
  });
});

describe('flightsToCsv', () => {
  it('emits a header and one row per flight', () => {
    const csv = flightsToCsv([flight('2024-05-20', { type: 'PA28' })]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('date,type,reg,from,to,total,pic,night,ifr,ldg,nightLdg,appr,remarks');
    expect(lines[1].startsWith('2024-05-20,PA28,')).toBe(true);
    expect(lines).toHaveLength(2);
  });

  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const csv = flightsToCsv([flight('2024-05-20', { remarks: 'touch, go\nand "circuits"' })]);
    expect(csv).toContain('"touch, go\nand ""circuits"""');
  });

  it('renders missing optional columns as empty cells', () => {
    const f = flight('2024-05-20');
    delete f.nightLdg;
    delete f.appr;
    const row = flightsToCsv([f]).split('\r\n')[1];
    // ...,ldg,nightLdg,appr,remarks  → trailing empty cells for the two new optionals
    expect(row.endsWith('1,,,')).toBe(true);
  });
});

describe('csvToFlights', () => {
  const flights: Flight[] = [
    flight('2024-05-20', { reg: 'HZ-AAA', remarks: 'a, b "quote"', total: '2.0', ldg: '2' }),
    flight('2024-04-10', { reg: 'HZ-BBB', total: '1.5', ldg: '1' }),
  ];

  it('round-trips flightsToCsv (ignoring the store id)', () => {
    const { flights: parsed, skipped } = csvToFlights(flightsToCsv(flights));
    expect(skipped).toBe(0);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].reg).toBe('HZ-AAA');
    expect(parsed[0].remarks).toBe('a, b "quote"'); // commas + escaped quotes survive
    expect(parsed[0].total).toBe('2.0');
  });

  it('maps columns by header name (order-independent) and skips empty rows', () => {
    const csv = 'reg,date,total\r\nHZ-XYZ,2024-01-02,3.0\r\n,,\r\n';
    const { flights: parsed, skipped } = csvToFlights(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ reg: 'HZ-XYZ', date: '2024-01-02', total: '3.0' });
    expect(skipped).toBe(1);
  });

  it('returns nothing for a header-only or empty file', () => {
    expect(csvToFlights('').flights).toEqual([]);
    expect(csvToFlights('date,total').flights).toEqual([]);
  });
});

describe('filterFlights', () => {
  const flights = [
    flight('2024-05-20', { type: 'C172', reg: 'HZ-AAA', remarks: 'checkride' }),
    flight('2024-04-10', { type: 'PA28', reg: 'HZ-BBB' }),
    flight('2024-01-01', { type: 'C172', reg: 'HZ-CCC' }),
  ];

  it('filters by aircraft type', () => {
    expect(filterFlights(flights, { type: 'C172' })).toHaveLength(2);
  });
  it('filters by an inclusive date range', () => {
    expect(filterFlights(flights, { from: '2024-02-01', to: '2024-05-01' })).toHaveLength(1);
  });
  it('matches free text against reg/type/remarks', () => {
    expect(filterFlights(flights, { q: 'checkride' })).toHaveLength(1);
    expect(filterFlights(flights, { q: 'hz-bbb' })).toHaveLength(1);
  });
});

describe('sortFlights', () => {
  const flights = [
    flight('2024-04-10', { total: '1.5' }),
    flight('2024-05-20', { total: '2.0' }),
    flight('2024-01-01', { total: '3.0' }),
  ];
  it('sorts numeric columns numerically', () => {
    expect(sortFlights(flights, 'total', 'desc').map((f) => f.total)).toEqual([
      '3.0',
      '2.0',
      '1.5',
    ]);
  });
  it('sorts dates ascending', () => {
    expect(sortFlights(flights, 'date', 'asc').map((f) => f.date)).toEqual([
      '2024-01-01',
      '2024-04-10',
      '2024-05-20',
    ]);
  });
});

describe('aircraftTotals', () => {
  it('groups by registration, busiest first', () => {
    const flights = [
      flight('2024-05-20', { reg: 'HZ-AAA', total: '2.0', ldg: '2' }),
      flight('2024-04-10', { reg: 'HZ-BBB', total: '1.0', ldg: '1' }),
      flight('2024-03-10', { reg: 'HZ-AAA', total: '1.0', ldg: '1' }),
    ];
    const rows = aircraftTotals(flights);
    expect(rows[0]).toMatchObject({
      reg: 'HZ-AAA',
      flights: 2,
      hours: 3,
      landings: 3,
      last: '2024-05-20',
    });
    expect(rows[1].reg).toBe('HZ-BBB');
  });
});

describe('monthTotals', () => {
  it('buckets hours, landings and counts by month', () => {
    const flights = [
      flight('2024-06-01', { total: '2.0', ldg: '2' }),
      flight('2024-05-15', { total: '1.0', ldg: '1' }),
    ];
    const rows = monthTotals(flights, 2, now);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ hours: 2, landings: 2, flights: 1 }); // June (current)
    expect(rows[0]).toMatchObject({ hours: 1, landings: 1, flights: 1 }); // May
  });
});
