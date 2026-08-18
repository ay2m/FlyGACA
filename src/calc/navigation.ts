/** Navigation maths: the wind triangle, great-circle distance/bearing and the
 *  1-in-60 rule. Pure planning aids. Angles in degrees, distances in NM. */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const EARTH_NM = 3440.065;
import { fin, norm360 } from './guards';

export interface WindTriangle {
  /** Wind-correction angle, degrees (+ = correct into wind to the right). */
  wca: number;
  /** Heading to fly, degrees. */
  heading: number;
  /** Groundspeed, kt. */
  groundSpeed: number;
}

/** Heading and groundspeed for a desired course in a given wind. */
export function windTriangle(
  courseDeg: number,
  tasKt: number,
  windDirDeg: number,
  windSpeedKt: number,
): WindTriangle | null {
  if (!fin(courseDeg, tasKt, windDirDeg, windSpeedKt) || tasKt <= 0) return null;
  const wa = (windDirDeg - courseDeg) * D2R; // wind angle relative to course
  const sinWca = (windSpeedKt * Math.sin(wa)) / tasKt;
  if (Math.abs(sinWca) > 1) return null; // wind too strong to hold course
  const wca = Math.asin(sinWca);
  const groundSpeed = tasKt * Math.cos(wca) - windSpeedKt * Math.cos(wa);
  return { wca: wca * R2D, heading: norm360(courseDeg + wca * R2D), groundSpeed };
}

export interface GreatCircle {
  distanceNm: number;
  bearingDeg: number;
}

/** Great-circle distance and initial bearing between two lat/lon points (°). */
export function greatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): GreatCircle | null {
  if (!fin(lat1, lon1, lat2, lon2)) return null;
  const φ1 = lat1 * D2R;
  const φ2 = lat2 * D2R;
  const dφ = (lat2 - lat1) * D2R;
  const dλ = (lon2 - lon1) * D2R;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return { distanceNm: EARTH_NM * c, bearingDeg: norm360(Math.atan2(y, x) * R2D) };
}

export interface OneInSixty {
  /** Track error so far, degrees. */
  trackErrorDeg: number;
  /** Total heading change to reach the destination, degrees. */
  correctionDeg: number;
}

/** Track error and the correction to regain track (1-in-60 rule). */
export function oneInSixty(flownNm: number, offTrackNm: number, toGoNm: number): OneInSixty | null {
  if (!fin(flownNm, offTrackNm) || flownNm <= 0) return null;
  const trackError = (offTrackNm / flownNm) * 60;
  const closing = fin(toGoNm) && toGoNm > 0 ? (offTrackNm / toGoNm) * 60 : 0;
  return { trackErrorDeg: trackError, correctionDeg: trackError + closing };
}

/**
 * Pivotal altitude (ft) for eights-on-pylons: GS(kt)² / 11.3 — the height at
 * which the line of sight to a ground point stays fixed on the wingtip. Pure
 * planning aid for the commercial manoeuvre.
 */
export function pivotalAltitude(groundSpeedKt: number): number | null {
  if (!fin(groundSpeedKt) || groundSpeedKt < 0) return null;
  return (groundSpeedKt * groundSpeedKt) / 11.3;
}
