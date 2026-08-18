/**
 * Mach ↔ TAS via the local speed of sound (a = 38.967·√T_K kt, T from OAT).
 * Pure planning aid.
 */
import { fin } from './guards';

/** Local speed of sound (kt) for an outside air temperature (°C). */
export function speedOfSound(oatC: number): number | null {
  return Number.isFinite(oatC) ? 38.967 * Math.sqrt(oatC + 273.15) : null;
}

export interface MachResult {
  mach: number;
  tas: number;
  lss: number;
}

/** Mach number (and echo of TAS / speed of sound) from a true airspeed. */
export function machFromTas(tasKt: number, oatC: number): MachResult | null {
  const lss = speedOfSound(oatC);
  if (lss == null || !fin(tasKt)) return null;
  return { mach: tasKt / lss, tas: tasKt, lss };
}

/** True airspeed (and echo of Mach / speed of sound) from a Mach number. */
export function tasFromMach(mach: number, oatC: number): MachResult | null {
  const lss = speedOfSound(oatC);
  if (lss == null || !fin(mach)) return null;
  return { mach, tas: mach * lss, lss };
}
