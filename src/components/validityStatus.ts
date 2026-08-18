import type { StatusTone } from './StatusPill';
import type { CurrencyStatus } from '@/calc/pilot/currency';

/**
 * How a validity status is presented — the single mapping from a `CurrencyStatus`
 * to a `StatusPill` tone and an i18n key.
 *
 * The currency board and the records list both show "is this document still
 * valid?" chips. They used to carry their own copies of these maps, which is
 * exactly the kind of thing that drifts: a pilot must not see a medical read
 * "expiring" on one screen and "current" on another.
 */
export const VALIDITY_TONE: Record<CurrencyStatus, StatusTone> = {
  current: 'success',
  expiring: 'warning',
  expired: 'danger',
  unknown: 'data',
};

export const VALIDITY_LABEL: Record<CurrencyStatus, string> = {
  current: 'validity.current',
  expiring: 'validity.expiring',
  expired: 'validity.expired',
  unknown: 'validity.unknown',
};
