/**
 * Pure logbook milestones. No DOM/store side effects (only the Flight type) so
 * it is unit-testable. Hour/landing columns are free-text in the store, so reads
 * coerce through `num`. The UI renders these as earned/locked badges.
 */
import type { Flight } from '@/lib/services/account';
import { sum } from './flightFields';

export interface Achievement {
  /** Stable id; the i18n label lives at `dashboard.achievementItems.<id>`. */
  id: string;
  earned: boolean;
  /** Progress so far (rounded to 1 dp) and the target to earn it. */
  have: number;
  target: number;
}

interface Spec {
  id: string;
  target: number;
  value: (flights: Flight[]) => number;
}

const SPECS: Spec[] = [
  { id: 'flights-100', target: 100, value: (f) => f.length },
  { id: 'hours-50', target: 50, value: (f) => sum(f, 'total') },
  { id: 'hours-100', target: 100, value: (f) => sum(f, 'total') },
  { id: 'hours-500', target: 500, value: (f) => sum(f, 'total') },
  { id: 'hours-1000', target: 1000, value: (f) => sum(f, 'total') },
  { id: 'pic-50', target: 50, value: (f) => sum(f, 'pic') },
  { id: 'pic-100', target: 100, value: (f) => sum(f, 'pic') },
  { id: 'night-first', target: 1, value: (f) => (sum(f, 'night') > 0 ? 1 : 0) },
  { id: 'night-50', target: 50, value: (f) => sum(f, 'night') },
  { id: 'ifr-first', target: 1, value: (f) => (sum(f, 'ifr') > 0 ? 1 : 0) },
  { id: 'ldg-100', target: 100, value: (f) => sum(f, 'ldg') },
  { id: 'ldg-500', target: 500, value: (f) => sum(f, 'ldg') },
  {
    id: 'xc-first',
    target: 1,
    value: (f) => (f.some((x) => x.from && x.to && x.from !== x.to) ? 1 : 0),
  },
];

/** Every milestone with its progress, in a stable order. */
export function achievements(flights: Flight[]): Achievement[] {
  return SPECS.map((s) => {
    const have = Math.round(s.value(flights) * 10) / 10;
    return { id: s.id, have, target: s.target, earned: have >= s.target };
  });
}

/** Convenience: how many milestones are earned. */
export function earnedCount(items: Achievement[]): number {
  return items.filter((a) => a.earned).length;
}
