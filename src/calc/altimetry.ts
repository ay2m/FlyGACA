/**
 * Altimetry helpers — flight level and QNH/QFE conversion. Builds on the ISA
 * core (src/calc/isa.ts). hPa throughout (the unit used in KSA). Planning aids.
 */
import { isaTemperature, pressureAltitude } from './isa';

const FT_PER_HPA = 27.3;

/** Flight level (hundreds of feet) for a pressure altitude. */
export function flightLevel(paFt: number): number | null {
  return Number.isFinite(paFt) ? Math.round(paFt / 100) : null;
}

/** QFE (hPa) at field elevation from the QNH. */
export function qnhToQfe(qnhHpa: number, elevFt: number): number | null {
  if (!Number.isFinite(qnhHpa) || !Number.isFinite(elevFt)) return null;
  return qnhHpa - elevFt / FT_PER_HPA;
}

/** QNH (hPa) from a measured QFE at field elevation. */
export function qfeToQnh(qfeHpa: number, elevFt: number): number | null {
  if (!Number.isFinite(qfeHpa) || !Number.isFinite(elevFt)) return null;
  return qfeHpa + elevFt / FT_PER_HPA;
}

export interface AltimeterResult {
  qfe: number;
  pressureAltitude: number;
}

/** QFE + pressure altitude for a field elevation and QNH. */
export function altimeter(qnhHpa: number, elevFt: number): AltimeterResult | null {
  const qfe = qnhToQfe(qnhHpa, elevFt);
  const pa = pressureAltitude(elevFt, qnhHpa, 'hpa');
  if (qfe == null || pa == null) return null;
  return { qfe, pressureAltitude: pa };
}

export interface TrueAltitudeResult {
  /** True altitude, ft. */
  trueAltFt: number;
  /** Temperature-error correction applied, ft (+ when warmer than ISA). */
  correctionFt: number;
  /** ISA deviation used, °C. */
  isaDevC: number;
}

/**
 * True altitude from an indicated/pressure altitude corrected for non-standard
 * temperature, using the standard ~4 ft per 1,000 ft per °C of ISA deviation
 * approximation (height measured above the altimeter-setting source). Warm air
 * → true altitude higher than indicated. An approximation — see the AIP/ICAO
 * cold-temperature tables for terrain-critical operations.
 */
export function trueAltitude(
  indicatedFt: number,
  sourceElevFt: number,
  oatC: number,
): TrueAltitudeResult | null {
  if (!Number.isFinite(indicatedFt) || !Number.isFinite(sourceElevFt) || !Number.isFinite(oatC)) {
    return null;
  }
  const isaTemp = isaTemperature(indicatedFt);
  if (isaTemp == null) return null;
  const isaDevC = oatC - isaTemp;
  const correctionFt = 4 * isaDevC * ((indicatedFt - sourceElevFt) / 1000);
  return { trueAltFt: indicatedFt + correctionFt, correctionFt, isaDevC };
}
