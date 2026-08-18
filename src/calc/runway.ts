/**
 * Pure helpers for the runway-orientation diagram. No DOM / i18n so they stay
 * unit-testable (see runway.test.ts); the SVG rendering lives in the
 * RunwayDiagram component.
 */

/**
 * Parse a runway designator into its magnetic heading in degrees (0–359),
 * taking the lower-numbered threshold. A designator is the runway number ×10
 * (e.g. "16" → 160°, "09/27" → 90°, "12L/30R" → 120°, "36" → 0°). Returns
 * `null` for anything that isn't a 01–36 runway number (e.g. helipad "H1").
 */
export function parseRunwayHeading(id: string): number | null {
  const m = /^0*(\d{1,2})/.exec((id ?? '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 36) return null;
  return (n % 36) * 10;
}

/** A point on the diagram for a given bearing (degrees) at radius `r`, centred at (cx, cy). */
export function bearingPoint(
  bearingDeg: number,
  r: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const rad = (bearingDeg * Math.PI) / 180;
  // 0° = north (up), increasing clockwise; SVG y grows downward.
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/** The two end labels of a designator, e.g. "12L/30R" → ["12L", "30R"], "16" → ["16", "34"]. */
export function runwayEnds(id: string): [string, string] {
  const parts = (id ?? '').split('/').map((s) => s.trim());
  if (parts.length === 2 && parts[0] && parts[1]) return [parts[0], parts[1]];
  const h = parseRunwayHeading(id);
  if (h === null) return [id, ''];
  const opp = (((h + 180) % 360) / 10 || 36).toString().padStart(2, '0');
  return [parts[0] || id, opp];
}
