/**
 * Convective cloud-base estimate from the surface temperature–dew point spread
 * (the ~2.5 °C per 1000 ft rule → ~400 ft of base per °C of spread). A rough
 * planning aid for cumuliform cloud; not for operational use.
 */
export interface CloudBaseResult {
  /** Temperature–dew point spread, °C. */
  spread: number;
  /** Estimated cloud base above ground level, ft. */
  baseAglFt: number;
}

const FT_PER_DEG_SPREAD = 400;

export function cloudBase(tempC: number, dewC: number): CloudBaseResult | null {
  if (!Number.isFinite(tempC) || !Number.isFinite(dewC)) return null;
  const spread = tempC - dewC;
  if (spread < 0) return null;
  return { spread, baseAglFt: spread * FT_PER_DEG_SPREAD };
}
