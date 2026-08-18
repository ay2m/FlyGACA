/**
 * The bento motion constants, in framer-motion's units (seconds / bezier array).
 * Each mirrors a design token in `src/styles/tokens.css` — framer animates via
 * inline styles, so it cannot read the CSS custom properties directly;
 * `tests/bento-motion-parity.test.ts` fails the build if the two drift.
 */

/** Mirrors `--ease-entry` — ultra-premium dampened deceleration. */
export const BENTO_EASE_ENTRY: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Mirrors `--dur-entry` (620ms) — per-card scale + fade settle. */
export const BENTO_DUR_ENTRY_S = 0.62;

/** Mirrors `--dur-stagger` (70ms) — delay step between bento items. */
export const BENTO_STAGGER_S = 0.07;

/** Mirrors `--lift-hover` — micro scale-lift on hover. */
export const BENTO_LIFT_HOVER = 1.015;

/** Grid-level lead-in before the first tile enters. Framer-only orchestration —
 *  deliberately has no CSS token counterpart. */
export const BENTO_DELAY_CHILDREN_S = 0.05;
