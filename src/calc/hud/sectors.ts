/**
 * Sector occupancy and density derivations for the HUD.
 *
 * Enroute sectors are circles; imported AIP terminal areas may be published
 * polygons — both membership tests live here so the stat card, the shield and
 * the canvas all agree on one definition of "inside".
 */
import { fin } from '@/calc/guards';
import { greatCircle } from '@/calc/navigation';
import type { FlightState, HudPoint, Scenario, Sector } from './types';

/** Ray-cast point-in-polygon on a closed [lat, lon] ring. */
export function pointInPolygon(pt: HudPoint, ring: readonly [number, number][]): boolean {
  if (!fin(pt.lat, pt.lon) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [latI, lonI] = ring[i];
    const [latJ, lonJ] = ring[j];
    const crosses =
      lonI > pt.lon !== lonJ > pt.lon &&
      pt.lat < ((latJ - latI) * (pt.lon - lonI)) / (lonJ - lonI) + latI;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** True when `pt` lies within `radiusNm` of `center` along the great circle. */
export function inCircle(pt: HudPoint, center: HudPoint, radiusNm: number): boolean {
  const gc = greatCircle(pt.lat, pt.lon, center.lat, center.lon);
  return gc !== null && gc.distanceNm <= radiusNm;
}

/** Flights inside each sector's circle, keyed by sector id. */
export function sectorOccupancy(
  states: readonly FlightState[],
  sectors: readonly Sector[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sector of sectors) {
    let n = 0;
    for (const s of states) {
      if (inCircle({ lat: s.lat, lon: s.lon }, sector.center, sector.radiusNm)) n += 1;
    }
    counts[sector.id] = n;
  }
  return counts;
}

/** Peak sector load as a percentage of capacity, clamped to 0–100. */
export function densityPct(occupancy: Record<string, number>, sectors: readonly Sector[]): number {
  let peak = 0;
  for (const sector of sectors) {
    if (sector.capacity <= 0) continue;
    peak = Math.max(peak, (occupancy[sector.id] ?? 0) / sector.capacity);
  }
  return Math.round(Math.min(1, Math.max(0, peak)) * 100);
}

/** `safe` while every sector is at or under its simulated capacity. */
export function airspaceStatus(
  occupancy: Record<string, number>,
  sectors: readonly Sector[],
): 'safe' | 'busy' {
  return sectors.some((s) => (occupancy[s.id] ?? 0) > s.capacity) ? 'busy' : 'safe';
}

/** Convenience: occupancy/density/status for a scenario's own sectors. */
export function sectorReport(
  scenario: Scenario,
  states: readonly FlightState[],
): { occupancy: Record<string, number>; densityPct: number; status: 'safe' | 'busy' } {
  const occupancy = sectorOccupancy(states, scenario.sectors);
  return {
    occupancy,
    densityPct: densityPct(occupancy, scenario.sectors),
    status: airspaceStatus(occupancy, scenario.sectors),
  };
}
