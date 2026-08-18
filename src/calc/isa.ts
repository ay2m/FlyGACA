/**
 * ISA standard-atmosphere maths — pressure altitude, ISA temperature/deviation
 * and density altitude. Pure functions, ported from the legacy isa-core.js
 * (the canonical, unit-tested definitions). A study/planning aid — real
 * performance must come from the POH/AFM.
 */

const FT_PER_HPA = 27.3; // ~feet of pressure altitude per hPa off 1013.25
const FT_PER_INHG = 1000; // ~feet per inHg off 29.92
const LAPSE_PER_KFT = 1.98; // ISA temperature lapse, °C per 1000 ft
const FT_PER_ISA_DEG = 118.8; // ~feet of density altitude per °C of ISA deviation

export type QnhUnit = 'hpa' | 'inhg';

import { fin } from './guards';

/** Pressure altitude (ft) from field elevation and the altimeter setting. */
export function pressureAltitude(
  elevFt: number,
  qnh: number,
  unit: QnhUnit = 'hpa',
): number | null {
  if (!fin(elevFt, qnh)) return null;
  return unit === 'inhg'
    ? elevFt + (29.92 - qnh) * FT_PER_INHG
    : elevFt + (1013.25 - qnh) * FT_PER_HPA;
}

/** ISA standard temperature (°C) at a pressure altitude. */
export function isaTemperature(paFt: number): number | null {
  return fin(paFt) ? 15 - LAPSE_PER_KFT * (paFt / 1000) : null;
}

/** ISA deviation (°C): how much warmer (+) or colder (−) than standard. */
export function isaDeviation(oatC: number, paFt: number): number | null {
  const isa = isaTemperature(paFt);
  return fin(oatC) && isa != null ? oatC - isa : null;
}

export interface DensityAltitude {
  /** Pressure altitude, ft. */
  pa: number;
  /** ISA standard temperature at PA, °C. */
  isaTemp: number;
  /** ISA deviation, °C. */
  isaDev: number;
  /** Density altitude, ft. */
  da: number;
}

/** Density altitude and its components from field conditions. */
export function densityAltitude(
  elevFt: number,
  qnh: number,
  oatC: number,
  unit: QnhUnit = 'hpa',
): DensityAltitude | null {
  const pa = pressureAltitude(elevFt, qnh, unit);
  if (pa == null || !fin(oatC)) return null;
  const isaTemp = isaTemperature(pa) as number;
  const isaDev = oatC - isaTemp;
  return { pa, isaTemp, isaDev, da: pa + FT_PER_ISA_DEG * isaDev };
}
