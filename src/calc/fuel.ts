/** Fuel planning — endurance, range and specific range. Fuel is in generic
 *  units (L, kg or gal — be consistent). Pure planning aids. */

import { ok } from './guards';

export interface FuelPlan {
  /** Endurance in hours. */
  enduranceHr: number;
  /** Still-air/over-ground range in NM (0 if no groundspeed given). */
  rangeNm: number;
}

/** Endurance from fuel on board and burn; range too if a groundspeed is given. */
export function fuelPlan(fob: number, burnPerHr: number, groundSpeedKt: number): FuelPlan | null {
  if (!ok(fob) || !ok(burnPerHr)) return null;
  const enduranceHr = fob / burnPerHr;
  return { enduranceHr, rangeNm: ok(groundSpeedKt) ? enduranceHr * groundSpeedKt : 0 };
}

/** Specific range: NM per unit of fuel = groundspeed ÷ fuel flow. */
export function specificRange(groundSpeedKt: number, burnPerHr: number): number | null {
  return ok(groundSpeedKt) && ok(burnPerHr) ? groundSpeedKt / burnPerHr : null;
}

/** Format decimal hours as "Hh MMm". */
export function formatHours(hr: number): string {
  const h = Math.floor(hr);
  const m = Math.round((hr - h) * 60);
  return m === 60 ? `${h + 1}h 00m` : `${h}h ${String(m).padStart(2, '0')}m`;
}
