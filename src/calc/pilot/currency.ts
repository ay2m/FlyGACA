/**
 * Pilot currency / recency engine. Pure: given the profile and logbook it
 * derives a list of CurrencyItems (medical, flight review, day/night passenger
 * recency, instrument recency) with a status, renewal date and days remaining.
 *
 * The regulatory windows below are the commonly-cited ICAO-aligned defaults and
 * are kept as named constants — they MUST be confirmed against GACAR Part 61 /
 * Part 67 before relying on them. The UI renders the standard <Disclaimer />,
 * and any item we cannot assess from the logged data reports `unknown` rather
 * than asserting a pass: the tool never overstates currency.
 */
import type { Flight, PilotRecord, Profile } from '@/lib/services/account';
import { DAY_MS as DAY, addDays, parseISO, validityByMonths, type Validity } from '@/calc/recency';
import { num } from './flightFields';

// ── Regulatory windows — verify against GACAR Part 61 / Part 67 ──
export const FLIGHT_REVIEW_MONTHS = 24;
export const PASSENGER_RECENCY_DAYS = 90;
export const PASSENGER_MIN_LANDINGS = 3;
export const IFR_RECENCY_DAYS = 180;
export const IFR_MIN_APPROACHES = 6;
/** Days-out threshold at which a still-valid item flips to the amber "expiring" pill. */
export const EXPIRING_SOON_DAYS = 30;

export type CurrencyStatus = 'current' | 'expiring' | 'expired' | 'unknown';

export interface CurrencyItem {
  /** Stable id (built-in items use a fixed key; records use `record-<id>`). */
  id: string;
  /** i18n key for the item name (built-in items). */
  labelKey: string;
  /** Raw display label (user records), preferred over `labelKey` when present. */
  label?: string;
  status: CurrencyStatus;
  /** Renewal / lapse date, or null when it cannot be computed. */
  expiry: Date | null;
  daysLeft: number | null;
  /** i18n key for the sub-line, with optional interpolation vars. */
  detailKey: string;
  detailVars?: Record<string, string | number>;
  /** Count progress for landing/approach recency (absent for time-based items). */
  count?: { have: number; need: number };
  /** Route to the tool that explains how to renew this item. */
  fixTo: string;
}

/** Map a validity window to a status, flipping to "expiring" within `soonDays`. */
export function statusFromValidity(
  v: Validity | null,
  soonDays = EXPIRING_SOON_DAYS,
): CurrencyStatus {
  if (!v) return 'unknown';
  if (v.daysLeft < 0) return 'expired';
  if (v.daysLeft <= soonDays) return 'expiring';
  return 'current';
}

/** Build a Validity from an absolute expiry date (e.g. a medical certificate). */
function validityFromExpiry(expiry: Date | null, now: Date): Validity | null {
  if (!expiry) return null;
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / DAY);
  return { expiry, daysLeft, current: daysLeft >= 0 };
}

export interface Rolling {
  /** Qualifying events (landings / approaches) inside the trailing window. */
  count: number;
  current: boolean;
  /** When currency lapses — the day the oldest of the most-recent `min` events ages out. */
  expiry: Date | null;
}

/**
 * Rolling-window recency: counts events (via `pick`) inside the trailing
 * `windowDays`, and — when the minimum is met — returns the date currency
 * lapses, i.e. the date of the flight carrying the `minEvents`-th most-recent
 * event, plus the window. Input is not mutated; flights are sorted newest-first
 * so callers needn't pre-sort.
 */
export function rollingLandingExpiry(
  flights: Flight[],
  windowDays: number,
  minEvents: number,
  pick: (f: Flight) => number,
  now: Date = new Date(),
): Rolling {
  const lo = now.getTime() - windowDays * DAY;
  const sorted = [...flights].sort(
    (a, b) => (parseISO(b.date)?.getTime() ?? 0) - (parseISO(a.date)?.getTime() ?? 0),
  );

  let count = 0;
  let running = 0;
  let qualifyingDate: Date | null = null;

  for (const f of sorted) {
    const d = parseISO(f.date);
    if (!d) continue;
    const t = d.getTime();
    if (t < lo || t > now.getTime()) continue;
    const n = Math.max(0, Math.floor(pick(f)));
    if (n <= 0) continue;
    count += n;
    if (qualifyingDate == null) {
      running += n;
      if (running >= minEvents) qualifyingDate = d;
    }
  }

  const current = count >= minEvents;
  return {
    count,
    current,
    expiry: current && qualifyingDate ? addDays(qualifyingDate, windowDays) : null,
  };
}

/** Turn a rolling-window result into a CurrencyItem. */
function rollingItem(
  id: CurrencyItem['id'],
  labelKey: string,
  detailKey: string,
  r: Rolling,
  need: number,
  days: number,
  now: Date,
): CurrencyItem {
  const daysLeft = r.expiry ? Math.ceil((r.expiry.getTime() - now.getTime()) / DAY) : null;
  const status: CurrencyStatus = !r.current
    ? 'expired'
    : daysLeft == null
      ? 'current'
      : daysLeft < 0
        ? 'expired'
        : daysLeft <= EXPIRING_SOON_DAYS
          ? 'expiring'
          : 'current';
  return {
    id,
    labelKey,
    status,
    expiry: r.expiry,
    daysLeft,
    detailKey,
    detailVars: { have: r.count, need, days },
    count: { have: r.count, need },
    fixTo: '/tools/part61-currency',
  };
}

/** Compute the pilot's full currency board from profile + logbook. */
export function computeCurrency(
  profile: Pick<Profile, 'medicalExpiry' | 'lastFlightReview'>,
  flights: Flight[],
  now: Date = new Date(),
): CurrencyItem[] {
  const items: CurrencyItem[] = [];

  // Medical — medicalExpiry is already an absolute expiry date.
  const med = validityFromExpiry(parseISO(profile.medicalExpiry), now);
  items.push({
    id: 'medical',
    labelKey: 'currency.items.medical.label',
    status: statusFromValidity(med),
    expiry: med?.expiry ?? null,
    daysLeft: med?.daysLeft ?? null,
    detailKey: med ? 'currency.medicalDetail' : 'currency.notSet',
    fixTo: '/tools/medical-validity',
  });

  // Flight review — 24 months after the last review.
  const rev = validityByMonths(parseISO(profile.lastFlightReview), FLIGHT_REVIEW_MONTHS, now);
  items.push({
    id: 'flightReview',
    labelKey: 'currency.items.flightReview.label',
    status: statusFromValidity(rev),
    expiry: rev?.expiry ?? null,
    daysLeft: rev?.daysLeft ?? null,
    detailKey: rev ? 'currency.reviewDetail' : 'currency.notSet',
    detailVars: rev ? { months: FLIGHT_REVIEW_MONTHS } : undefined,
    fixTo: '/tools/flight-review',
  });

  // Day passenger recency — 3 landings in 90 days.
  items.push(
    rollingItem(
      'passenger90',
      'currency.items.passenger90.label',
      'currency.landingsDetail',
      rollingLandingExpiry(
        flights,
        PASSENGER_RECENCY_DAYS,
        PASSENGER_MIN_LANDINGS,
        (f) => num(f.ldg),
        now,
      ),
      PASSENGER_MIN_LANDINGS,
      PASSENGER_RECENCY_DAYS,
      now,
    ),
  );

  // Night passenger recency — 3 night landings in 90 days.
  items.push(
    rollingItem(
      'nightPassenger',
      'currency.items.nightPassenger.label',
      'currency.landingsDetail',
      rollingLandingExpiry(
        flights,
        PASSENGER_RECENCY_DAYS,
        PASSENGER_MIN_LANDINGS,
        (f) => num(f.nightLdg),
        now,
      ),
      PASSENGER_MIN_LANDINGS,
      PASSENGER_RECENCY_DAYS,
      now,
    ),
  );

  // Instrument recency — needs logged approaches; otherwise we can't assess it.
  const totalAppr = flights.reduce((s, f) => s + num(f.appr), 0);
  if (totalAppr <= 0) {
    items.push({
      id: 'ifr',
      labelKey: 'currency.items.ifr.label',
      status: 'unknown',
      expiry: null,
      daysLeft: null,
      detailKey: 'currency.logApproaches',
      fixTo: '/tools/part61-currency',
    });
  } else {
    items.push(
      rollingItem(
        'ifr',
        'currency.items.ifr.label',
        'currency.approachesDetail',
        rollingLandingExpiry(
          flights,
          IFR_RECENCY_DAYS,
          IFR_MIN_APPROACHES,
          (f) => num(f.appr),
          now,
        ),
        IFR_MIN_APPROACHES,
        IFR_RECENCY_DAYS,
        now,
      ),
    );
  }

  return items;
}

/**
 * Currency items for user-entered records that carry an expiry date (ratings,
 * documents, etc.). Records without an expiry are skipped. The display label is
 * the record's own title, so no i18n key is needed.
 */
export function recordCurrency(records: PilotRecord[], now: Date = new Date()): CurrencyItem[] {
  const out: CurrencyItem[] = [];
  for (const r of records) {
    const expiry = parseISO(r.expires);
    if (!expiry) continue;
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / DAY);
    const status: CurrencyStatus =
      daysLeft < 0 ? 'expired' : daysLeft <= EXPIRING_SOON_DAYS ? 'expiring' : 'current';
    out.push({
      id: `record-${r.id}`,
      labelKey: '',
      label: r.title || r.ref,
      status,
      expiry,
      daysLeft,
      detailKey: `records.categories.${r.category}`,
      fixTo: '/records',
    });
  }
  return out;
}

/** True when any item needs attention (expired or expiring soon) — drives the dashboard headline. */
export function actionNeeded(items: CurrencyItem[]): boolean {
  return items.some((i) => i.status === 'expired' || i.status === 'expiring');
}

/** Planning horizon (days) the currency ring fills against — a full ring means
 *  at least this much runway remains before renewal is due. */
export const CURRENCY_RING_HORIZON_DAYS = 90;

/**
 * How full the currency ring should draw for an item, 0…1 — a uniform "runway"
 * fill from `daysLeft` over the planning horizon (so a far-off expiry reads
 * nearly full and a near one drains). Items with no assessable date (unknown /
 * not set / lapsed count recency) read empty. Pure — the ring is a view of the
 * status the engine already asserts, it computes no new policy.
 */
export function currencyRingFraction(
  item: Pick<CurrencyItem, 'daysLeft'>,
  horizonDays = CURRENCY_RING_HORIZON_DAYS,
): number {
  if (item.daysLeft == null || horizonDays <= 0) return 0;
  return Math.min(1, Math.max(0, item.daysLeft / horizonDays));
}
