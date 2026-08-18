import type { Flight } from '@/lib/services/account';

/** A flight without its store id — the shape of the add/edit form draft. */
export type FlightDraft = Omit<Flight, 'id'>;

export const BLANK_FLIGHT: FlightDraft = {
  date: '',
  type: '',
  reg: '',
  from: '',
  to: '',
  total: '',
  pic: '',
  night: '',
  ifr: '',
  ldg: '',
  nightLdg: '',
  appr: '',
  remarks: '',
};
