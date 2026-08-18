/**
 * Runway margin from a book (AFM/POH) take-off or landing distance, factored by
 * widely-taught conservative rules of thumb: +10% per 1000 ft of density
 * altitude, +5% per 1% of upslope, and a user safety factor. These are PLANNING
 * RULES OF THUMB — the authoritative figures are the AFM/POH and the operator's
 * performance data.
 */
export interface RunwayMargin {
  /** Factored distance required, same unit as the book distance. */
  required: number;
  /** Available − required (null when no available runway given). */
  margin: number | null;
  /** True only when an available runway is given and covers the requirement. */
  ok: boolean;
  /** The overall multiplier applied to the book distance. */
  factor: number;
}

export interface RunwayMarginInput {
  bookM: number;
  daFt?: number;
  slopePct?: number;
  safetyPct?: number;
  availableM?: number;
}

export function factoredRunway({
  bookM,
  daFt,
  slopePct,
  safetyPct,
  availableM,
}: RunwayMarginInput): RunwayMargin | null {
  if (!Number.isFinite(bookM) || bookM <= 0) return null;
  const da = Number.isFinite(daFt) ? Math.max(daFt as number, 0) : 0;
  const slope = Number.isFinite(slopePct) ? Math.max(slopePct as number, 0) : 0;
  const safety = Number.isFinite(safetyPct) ? (safetyPct as number) : 0;

  const factor = (1 + 0.1 * (da / 1000)) * (1 + 0.05 * slope) * (1 + safety / 100);
  const required = bookM * factor;

  const hasAvail = Number.isFinite(availableM);
  return {
    required,
    factor,
    margin: hasAvail ? (availableM as number) - required : null,
    ok: hasAvail ? (availableM as number) >= required : false,
  };
}
