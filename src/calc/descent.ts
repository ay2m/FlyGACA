/** Descent planning: top-of-descent distance and rate, and a visual descent
 *  point (VDP) for a non-precision approach. Pure planning aids. */

const FT_PER_NM = 6076.12;
const D2R = Math.PI / 180;
import { fin } from './guards';

export interface TopOfDescent {
  /** Distance back from the target at which to start down, NM. */
  distanceNm: number;
  /** Required rate of descent, ft/min. */
  rodFpm: number;
}

/** Where to start a descent for a height to lose at a path angle and groundspeed. */
export function topOfDescent(
  altToLoseFt: number,
  angleDeg: number,
  groundSpeedKt: number,
): TopOfDescent | null {
  if (!fin(altToLoseFt, angleDeg, groundSpeedKt) || angleDeg <= 0 || altToLoseFt < 0) return null;
  const gradientFtPerNm = Math.tan(angleDeg * D2R) * FT_PER_NM;
  return {
    distanceNm: altToLoseFt / gradientFtPerNm,
    rodFpm: (gradientFtPerNm * groundSpeedKt) / 60,
  };
}

export interface Vdp {
  /** Distance of the VDP before the threshold, NM. */
  distanceNm: number;
  /** Required rate of descent from the VDP, ft/min. */
  rodFpm: number;
}

/** Visual descent point for a height above touchdown at a path angle/groundspeed. */
export function visualDescentPoint(
  hatFt: number,
  angleDeg: number,
  groundSpeedKt: number,
): Vdp | null {
  if (!fin(hatFt, angleDeg, groundSpeedKt) || angleDeg <= 0 || hatFt < 0) return null;
  const gradientFtPerNm = Math.tan(angleDeg * D2R) * FT_PER_NM;
  return {
    distanceNm: hatFt / gradientFtPerNm,
    rodFpm: (gradientFtPerNm * groundSpeedKt) / 60,
  };
}
