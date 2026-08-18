/**
 * The five rotating category accent tokens, in order.
 *
 * The library, the tools hub and ground school each colour their category
 * sections from this rotation. Keeping one list means a sixth accent (or a
 * reordering) lands on all three surfaces at once instead of two of them.
 * Values are token references only — never raw colours.
 */
export const CAT_TOKENS = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
] as const;

/** The accent for the nth category, wrapping round the list. Negative indexes clamp to the first. */
export const catToken = (index: number): string =>
  CAT_TOKENS[Math.max(0, index) % CAT_TOKENS.length];
