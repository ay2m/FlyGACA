/**
 * Pure logbook aggregation + CSV serialization. No DOM / store imports (only the
 * Flight type) so it stays unit-testable and free of the account store's side
 * effects. Hour/landing columns are free-text strings in the store, so every
 * read is coerced through `num`.
 */
import type { Flight } from '@/lib/services/account';
import { addDays, addMonths, parseISO } from '@/calc/recency';
import { num, sum } from './flightFields';

const LAST_N_DAYS = 90;

export interface LogbookSummary {
  totalHours: number;
  picHours: number;
  nightHours: number;
  ifrHours: number;
  landings: number;
  flightCount: number;
  /** Rolling totals over the trailing 90 days. */
  last90: { hours: number; landings: number; flightCount: number };
  /** The `recentN` most recent flights (input is already newest-first). */
  recent: Flight[];
}

export function summarizeLogbook(
  flights: Flight[],
  now: Date = new Date(),
  recentN = 5,
): LogbookSummary {
  const lo = addDays(now, -LAST_N_DAYS).getTime();
  const within = flights.filter((f) => {
    const d = parseISO(f.date);
    return d != null && d.getTime() >= lo && d.getTime() <= now.getTime();
  });
  return {
    totalHours: sum(flights, 'total'),
    picHours: sum(flights, 'pic'),
    nightHours: sum(flights, 'night'),
    ifrHours: sum(flights, 'ifr'),
    landings: sum(flights, 'ldg'),
    flightCount: flights.length,
    last90: {
      hours: sum(within, 'total'),
      landings: sum(within, 'ldg'),
      flightCount: within.length,
    },
    recent: flights.slice(0, recentN),
  };
}

const CSV_FIELDS: (keyof Flight)[] = [
  'date',
  'type',
  'reg',
  'from',
  'to',
  'total',
  'pic',
  'night',
  'ifr',
  'ldg',
  'nightLdg',
  'appr',
  'remarks',
];

/** RFC 4180 cell: quote when it contains a comma, quote or newline; double inner quotes. */
function csvCell(v: string | undefined): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface MonthBucket {
  /** Short month label, e.g. "Jan". */
  label: string;
  /** YYYY-MM key (stable, locale-independent). */
  key: string;
  hours: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Flight `total` hours bucketed by calendar month over the trailing `months`
 * (oldest → newest), so the dashboard can chart recent activity. Months with no
 * flights report 0.
 */
export function monthlyHours(flights: Flight[], months = 6, now: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = addMonths(now, -i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    index.set(key, buckets.length);
    buckets.push({ label: MONTHS[d.getUTCMonth()], key, hours: 0 });
  }
  for (const f of flights) {
    const d = parseISO(f.date);
    if (!d) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const at = index.get(key);
    if (at != null) buckets[at].hours += num(f.total);
  }
  return buckets;
}

/** Serialize the logbook to CSV (header + one row per flight), CRLF-terminated. */
export function flightsToCsv(flights: Flight[]): string {
  const header = CSV_FIELDS.join(',');
  const rows = flights.map((f) => CSV_FIELDS.map((k) => csvCell(f[k] as string)).join(','));
  return [header, ...rows].join('\r\n');
}

export type FlightDraft = Omit<Flight, 'id'>;

/** Parse one RFC-4180 record (handles quoted cells, escaped quotes, embedded commas). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Parse a CSV logbook (as produced by `flightsToCsv`, or a compatible export)
 * into flight drafts. The header row maps columns by name to the known fields,
 * so column order and extra/missing optional columns are tolerated. Rows with no
 * date and no hours are skipped. Pure — the caller persists via `addFlight`.
 */
export function csvToFlights(text: string): { flights: FlightDraft[]; skipped: number } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  // Drop a trailing empty line; need at least a header + one row.
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length < 2) return { flights: [], skipped: 0 };

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const colAt = new Map<keyof Flight, number>();
  for (const field of CSV_FIELDS) {
    const idx = header.indexOf(field.toLowerCase());
    if (idx >= 0) colAt.set(field, idx);
  }

  const flights: FlightDraft[] = [];
  let skipped = 0;
  for (let r = 1; r < lines.length; r++) {
    if (lines[r].trim() === '') continue;
    const cells = parseCsvLine(lines[r]);
    const get = (k: keyof Flight): string => {
      const at = colAt.get(k);
      return at != null ? (cells[at] ?? '').trim() : '';
    };
    const draft: FlightDraft = {
      date: get('date'),
      type: get('type'),
      reg: get('reg'),
      from: get('from'),
      to: get('to'),
      total: get('total'),
      pic: get('pic'),
      night: get('night'),
      ifr: get('ifr'),
      ldg: get('ldg'),
      nightLdg: get('nightLdg'),
      appr: get('appr'),
      remarks: get('remarks'),
    };
    // A usable row needs at least a date or some logged time/landings.
    if (!draft.date && num(draft.total) === 0 && num(draft.ldg) === 0) {
      skipped++;
      continue;
    }
    flights.push(draft);
  }
  return { flights, skipped };
}

export interface FlightFilter {
  /** Free-text needle matched against reg/type/from/to/remarks. */
  q?: string;
  /** Exact aircraft type, or '' for any. */
  type?: string;
  /** Inclusive ISO date bounds, or '' for open-ended. */
  from?: string;
  to?: string;
}

/** Filter flights by text, aircraft type and an inclusive date range (pure). */
export function filterFlights(flights: Flight[], f: FlightFilter): Flight[] {
  const q = (f.q ?? '').trim().toLowerCase();
  const type = (f.type ?? '').trim();
  return flights.filter((fl) => {
    if (type && fl.type !== type) return false;
    if (f.from && fl.date && fl.date < f.from) return false;
    if (f.to && fl.date && fl.date > f.to) return false;
    if (q) {
      const hay = `${fl.reg} ${fl.type} ${fl.from} ${fl.to} ${fl.remarks}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type SortDir = 'asc' | 'desc';
const NUMERIC_COLS = new Set<keyof Flight>([
  'total',
  'pic',
  'night',
  'ifr',
  'ldg',
  'nightLdg',
  'appr',
]);

/** Sort a copy of `flights` by a column (numeric columns numerically, date as date). */
export function sortFlights(flights: Flight[], key: keyof Flight, dir: SortDir = 'desc'): Flight[] {
  const mul = dir === 'asc' ? 1 : -1;
  const numeric = NUMERIC_COLS.has(key);
  return [...flights].sort((a, b) => {
    let cmp: number;
    if (numeric) cmp = num(a[key] as string) - num(b[key] as string);
    else cmp = String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
    return cmp * mul;
  });
}

export interface AircraftRow {
  reg: string;
  type: string;
  flights: number;
  hours: number;
  landings: number;
  /** Most recent flight date for this registration (ISO), or ''. */
  last: string;
}

/** Group flights by registration with per-aircraft totals, busiest first (pure). */
export function aircraftTotals(flights: Flight[]): AircraftRow[] {
  const by = new Map<string, AircraftRow>();
  for (const f of flights) {
    const reg = f.reg || '—';
    const row = by.get(reg) ?? { reg, type: f.type, flights: 0, hours: 0, landings: 0, last: '' };
    row.flights += 1;
    row.hours += num(f.total);
    row.landings += num(f.ldg);
    if (!row.type && f.type) row.type = f.type;
    if (f.date && f.date > row.last) row.last = f.date;
    by.set(reg, row);
  }
  return [...by.values()].sort((a, b) => b.hours - a.hours);
}

export interface MonthTotal {
  label: string;
  key: string;
  hours: number;
  landings: number;
  flights: number;
}

/** Hours, landings and flight count bucketed by month over the trailing `months` (pure). */
export function monthTotals(flights: Flight[], months = 6, now: Date = new Date()): MonthTotal[] {
  const buckets: MonthTotal[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = addMonths(now, -i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    index.set(key, buckets.length);
    buckets.push({ label: MONTHS[d.getUTCMonth()], key, hours: 0, landings: 0, flights: 0 });
  }
  for (const f of flights) {
    const d = parseISO(f.date);
    if (!d) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const at = index.get(key);
    if (at == null) continue;
    buckets[at].hours += num(f.total);
    buckets[at].landings += num(f.ldg);
    buckets[at].flights += 1;
  }
  return buckets;
}
