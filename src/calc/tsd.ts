/** Time–speed–distance: supply any two of groundspeed (kt), distance (NM) and
 *  time (min) and get the third. Pure. */
export interface Tsd {
  groundSpeed: number;
  distanceNm: number;
  timeMin: number;
}

import { ok } from './guards';

/** Returns the completed triple, or null if fewer than two inputs are valid. */
export function solveTsd(gs: number, distNm: number, timeMin: number): Tsd | null {
  const hasGs = ok(gs);
  const hasD = ok(distNm);
  const hasT = ok(timeMin);
  if (hasGs && hasD) return { groundSpeed: gs, distanceNm: distNm, timeMin: (distNm / gs) * 60 };
  if (hasGs && hasT) return { groundSpeed: gs, distanceNm: (gs * timeMin) / 60, timeMin };
  if (hasD && hasT) return { groundSpeed: distNm / (timeMin / 60), distanceNm: distNm, timeMin };
  return null;
}
