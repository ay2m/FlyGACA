/**
 * True airspeed from calibrated airspeed, pressure altitude and OAT, via the
 * ISA standard atmosphere (troposphere, < 36,089 ft). Pure; ported from the
 * legacy tools-tas.js. A planning aid — not a substitute for the POH/AFM.
 */

export interface TasInput {
  /** Calibrated airspeed, kt. */
  cas: number;
  /** Pressure altitude, ft. */
  pa: number;
  /** Outside air temperature, °C. */
  oat: number;
}

export interface TasResult {
  /** True airspeed, kt. */
  tas: number;
  /** Mach number. */
  mach: number;
  /** ISA deviation, °C. */
  isaDev: number;
}

import { fin } from './guards';

export function trueAirspeed({ cas, pa, oat }: TasInput): TasResult | null {
  if (!fin(cas, pa, oat)) return null;
  const delta = Math.pow(1 - 6.87535e-6 * pa, 5.2559); // pressure ratio
  const T = oat + 273.15; // K
  const sigma = delta * (288.15 / T); // density ratio
  const tas = cas / Math.sqrt(sigma);
  const a = 38.967 * Math.sqrt(T); // speed of sound, kt
  const mach = tas / a;
  const isaDev = oat - (15 - 1.98 * (pa / 1000));
  return { tas, mach, isaDev };
}
