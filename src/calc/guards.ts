/**
 * Shared numeric guards for the calculators.
 *
 * Every tool module has to reject blank/garbage input before it computes —
 * `useNumericInputs` hands over `NaN` for an empty field — and each one used to
 * declare its own copy of these three one-liners. Keeping them here means every
 * tool rejects bad input the same way, and there is one place to look when
 * asking "which variant is this?".
 *
 * This is flat-core (`src/calc/`), so every `calc/` subfolder may import it.
 */

/** True when every argument is a finite number (rejects NaN / ±Infinity). */
export const fin = (...xs: number[]): boolean => xs.every(Number.isFinite);

/** True when `n` is finite AND strictly positive — for speeds, distances, flows. */
export const ok = (n: number): boolean => Number.isFinite(n) && n > 0;

/** Wrap any bearing/heading into [0, 360). Handles negatives and >360 alike. */
export const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;
