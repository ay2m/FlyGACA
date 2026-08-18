/**
 * Shared value formatters for calculator output.
 *
 * Every tool that reports a whole-number quantity (altitudes, distances,
 * weights) used to declare its own identical `fmt` helper. Keeping one here
 * means a change to how the tools group thousands lands everywhere at once.
 */

/** Round to a whole number and group thousands for the active locale: `12,500`. */
export const fmtInt = (n: number): string => Math.round(n).toLocaleString();
