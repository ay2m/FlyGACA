/**
 * Climb-gradient conversions: ft per NM ↔ percent ↔ degrees, and the required
 * feet-per-minute at a given groundspeed. Useful for SID/missed-approach
 * minimum gradients. Pure planning aid.
 */
const FT_PER_NM = 6076.12;

export interface ClimbResult {
  ftPerNm: number;
  percent: number;
  degrees: number;
  /** Required rate at the given groundspeed, ft/min (null if GS not given). */
  fpm: number | null;
}

/** From a gradient in ft/NM (and optional groundspeed) derive the others. */
export function climbFromFtPerNm(ftPerNm: number, groundSpeedKt?: number): ClimbResult | null {
  if (!Number.isFinite(ftPerNm)) return null;
  const percent = (ftPerNm / FT_PER_NM) * 100;
  const degrees = (Math.atan(ftPerNm / FT_PER_NM) * 180) / Math.PI;
  const fpm =
    groundSpeedKt != null && Number.isFinite(groundSpeedKt) ? (ftPerNm * groundSpeedKt) / 60 : null;
  return { ftPerNm, percent, degrees, fpm };
}

/** Convert a percentage gradient to ft/NM (then use climbFromFtPerNm). */
export function ftPerNmFromPercent(percent: number): number | null {
  return Number.isFinite(percent) ? (percent / 100) * FT_PER_NM : null;
}

export interface ClimbToAltitude {
  /** Time to climb, minutes. */
  timeMin: number;
  /** Horizontal distance covered in the climb, NM. */
  distNm: number;
  /** Fuel burned in the climb (same unit as the flow), null if no flow given. */
  fuel: number | null;
}

/**
 * Time, distance and fuel to climb a height at an average rate of climb and
 * groundspeed (optional fuel flow per hour). A planning aid — the AFM/POH climb
 * tables are authoritative.
 */
export function timeToClimb(
  altGainFt: number,
  rocFpm: number,
  groundSpeedKt: number,
  fuelFlowPerHr?: number,
): ClimbToAltitude | null {
  if (!Number.isFinite(altGainFt) || !Number.isFinite(rocFpm) || rocFpm <= 0 || altGainFt < 0) {
    return null;
  }
  if (!Number.isFinite(groundSpeedKt) || groundSpeedKt < 0) return null;
  const timeMin = altGainFt / rocFpm;
  const distNm = (groundSpeedKt * timeMin) / 60;
  const fuel =
    fuelFlowPerHr != null && Number.isFinite(fuelFlowPerHr) ? (fuelFlowPerHr * timeMin) / 60 : null;
  return { timeMin, distNm, fuel };
}
