/**
 * Critical-point planning: the Equal Time Point (ETP) and the Point of No Return
 * (PNR / radius of action). Pure planning aids — real diversion decisions use the
 * operator's fuel policy and the AFM. Distances in NM, speeds in kt, times in min.
 */
import { fin } from './guards';

export interface CriticalPoint {
  /** Distance from departure, NM. */
  distNm: number;
  /** Time from departure, minutes. */
  timeMin: number;
}

/**
 * Equal Time Point — the position from which it takes the same time to continue
 * to the destination as to return to the departure aerodrome.
 *   dist = D·GSh / (GSo + GSh),  time = dist / GSo
 */
export function equalTimePoint(
  distanceNm: number,
  gsOutKt: number,
  gsHomeKt: number,
): CriticalPoint | null {
  if (!fin(distanceNm, gsOutKt, gsHomeKt) || gsOutKt <= 0 || gsHomeKt <= 0 || distanceNm <= 0) {
    return null;
  }
  const distNm = (distanceNm * gsHomeKt) / (gsOutKt + gsHomeKt);
  return { distNm, timeMin: (distNm / gsOutKt) * 60 };
}

/**
 * Point of No Return — the farthest point you can fly and still return to the
 * departure aerodrome within the usable (safe) endurance.
 *   time = E·GSh / (GSo + GSh),  dist = time · GSo
 */
export function pointOfNoReturn(
  enduranceMin: number,
  gsOutKt: number,
  gsHomeKt: number,
): CriticalPoint | null {
  if (!fin(enduranceMin, gsOutKt, gsHomeKt) || gsOutKt <= 0 || gsHomeKt <= 0 || enduranceMin <= 0) {
    return null;
  }
  const timeMin = (enduranceMin * gsHomeKt) / (gsOutKt + gsHomeKt);
  return { distNm: (timeMin / 60) * gsOutKt, timeMin };
}
