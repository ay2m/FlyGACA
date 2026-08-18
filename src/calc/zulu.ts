/** Zulu (UTC) ↔ Saudi local time. KSA is Arabia Standard Time, UTC+3, no DST. */
export const KSA_OFFSET_MIN = 180;

export interface ShiftedTime {
  hh: number;
  mm: number;
  /** −1, 0 or +1 day relative to the input. */
  dayOffset: number;
}

import { fin } from './guards';

/** Shift a HH:MM time by a number of minutes, wrapping across midnight. */
export function shiftTime(hh: number, mm: number, offsetMin: number): ShiftedTime | null {
  if (!fin(hh, mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const total = hh * 60 + mm + offsetMin;
  const dayOffset = Math.floor(total / 1440);
  const wrapped = ((total % 1440) + 1440) % 1440;
  return { hh: Math.floor(wrapped / 60), mm: wrapped % 60, dayOffset };
}

/** UTC → KSA local. */
export const utcToKsa = (hh: number, mm: number) => shiftTime(hh, mm, KSA_OFFSET_MIN);
/** KSA local → UTC. */
export const ksaToUtc = (hh: number, mm: number) => shiftTime(hh, mm, -KSA_OFFSET_MIN);

/** Two-digit zero-padded number — the `07` in `07:45Z`, `0715`, `20260724`. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function formatHm(hh: number, mm: number): string {
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export interface ClockAngles {
  hourDeg: number;
  minDeg: number;
  secDeg: number;
}

/**
 * Clock-hand angles in degrees clockwise from 12 o'clock, for an analog dial.
 * Hands advance continuously (the hour hand creeps with the minutes, the minute
 * hand with the seconds). Values wrap, so any integer h/m/s is accepted.
 */
export function clockAngles(hh: number, mm: number, ss: number): ClockAngles {
  const s = ((ss % 60) + 60) % 60;
  const m = ((((mm % 60) + 60) % 60) + s / 60) % 60;
  const h = (((hh % 12) + 12) % 12) + m / 60;
  return { secDeg: s * 6, minDeg: m * 6, hourDeg: h * 30 };
}
