/**
 * Tiny colour utilities for canvas paint code, which cannot use CSS `color-mix`
 * on gradient stops. Kept out of `theme.ts` (part of the app-shell chunk) so
 * only the chunks that paint pay for it.
 */

/**
 * Returns `color` with its alpha replaced by `alpha` (clamped to [0, 1]).
 * Handles `#rgb`/`#rrggbb` hex (every theme's token format today) and
 * `rgb()`/`rgba()` strings; anything else falls back to a `color-mix()`
 * expression, which canvas gradients accept in all evergreen browsers.
 */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1];
    const wide = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits;
    const r = parseInt(wide.slice(0, 2), 16);
    const g = parseInt(wide.slice(2, 4), 16);
    const b = parseInt(wide.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const rgb = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((part) => part.trim());
    if (r !== undefined && g !== undefined && b !== undefined) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  return `color-mix(in srgb, ${color} ${a * 100}%, transparent)`;
}
