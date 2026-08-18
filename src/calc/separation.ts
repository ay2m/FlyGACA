/**
 * Longitudinal (same-track) separation helper: closure rate between a leading
 * and a following aircraft and, if closing, the time for the spacing to reach
 * zero. The required minima themselves are set by ATC procedures — this only
 * does the geometry. Pure.
 */
import { fin } from './guards';

export interface Separation {
  /** Closure rate, kt (positive = the follower is catching up). */
  closureKt: number;
  closing: boolean;
  /** Minutes until the spacing reaches zero (null unless closing with spacing). */
  timeToZeroMin: number | null;
}

export function longitudinalSeparation(
  gsLead: number,
  gsFollow: number,
  spacingNm: number,
): Separation | null {
  if (!fin(gsLead, gsFollow)) return null;
  const closureKt = gsFollow - gsLead;
  const closing = closureKt > 0;
  const timeToZeroMin =
    closing && fin(spacingNm) && spacingNm > 0 ? (spacingNm / closureKt) * 60 : null;
  return { closureKt, closing, timeToZeroMin };
}
