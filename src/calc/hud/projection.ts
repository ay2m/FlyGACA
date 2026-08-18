/**
 * Pure spherical projection math for the HUD viewport.
 *
 * Globe mode is an orthographic projection about a camera (lat0, lon0, zoom);
 * radar mode is an azimuthal-equidistant scope about a sector centre. All
 * outputs are in **unit-sphere coordinates** with y pointing north — the
 * canvas multiplies by its pixel radius and negates y (canvas y grows down).
 */
import { fin, norm360, ok } from '@/calc/guards';
import { greatCircle } from '@/calc/navigation';
import type { HudPoint } from './types';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export interface Camera {
  lat0: number;
  lon0: number;
  /** 1 = whole disc fits the viewport; clamped by `clampZoom`. */
  zoom: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

export const clampZoom = (z: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fin(z) ? z : MIN_ZOOM));

/** Wrap a longitude into [−180, 180). */
export const normLon = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;

export interface Projected {
  x: number;
  y: number;
  /** Cosine of the angular distance to the camera centre; visible when > 0. */
  cosC: number;
  visible: boolean;
}

/** Orthographic forward projection onto the unit disc. */
export function projectOrtho(latDeg: number, lonDeg: number, cam: Camera): Projected {
  const φ = latDeg * D2R;
  const φ0 = cam.lat0 * D2R;
  const dλ = (lonDeg - cam.lon0) * D2R;
  const cosφ = Math.cos(φ);
  const x = cosφ * Math.sin(dλ);
  const y = Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * cosφ * Math.cos(dλ);
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * cosφ * Math.cos(dλ);
  return { x, y, cosC, visible: cosC > 0 };
}

/** Angular distance between two points, radians. */
export function angularDist(a: HudPoint, b: HudPoint): number {
  const φ1 = a.lat * D2R;
  const φ2 = b.lat * D2R;
  const dλ = (b.lon - a.lon) * D2R;
  const s = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return Math.acos(Math.min(1, Math.max(-1, s)));
}

/** Point a fraction `f` (0..1) along the great circle from `a` to `b` (slerp). */
export function gcPointAt(a: HudPoint, b: HudPoint, f: number): HudPoint {
  const d = angularDist(a, b);
  if (d < 1e-9 || !fin(f)) return { lat: a.lat, lon: a.lon };
  const t = Math.min(1, Math.max(0, f));
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const φ1 = a.lat * D2R;
  const λ1 = a.lon * D2R;
  const φ2 = b.lat * D2R;
  const λ2 = b.lon * D2R;
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) * R2D, lon: Math.atan2(y, x) * R2D };
}

/** `n + 1` points sampling the great circle from `a` to `b` (inclusive). */
export function sampleGreatCircle(a: HudPoint, b: HudPoint, n: number): HudPoint[] {
  const count = Math.max(1, Math.floor(n));
  const pts: HudPoint[] = [];
  for (let i = 0; i <= count; i += 1) pts.push(gcPointAt(a, b, i / count));
  return pts;
}

/** Destination point from `p` on the given initial bearing and distance. */
export function destPoint(p: HudPoint, bearingDeg: number, distNm: number): HudPoint {
  const δ = distNm / 3440.065; // Earth radius in NM, matching calc/navigation
  const θ = bearingDeg * D2R;
  const φ1 = p.lat * D2R;
  const λ1 = p.lon * D2R;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: φ2 * R2D, lon: normLon(λ2 * R2D) };
}

/** Closed geodesic circle of `radiusNm` about `center` (`n` points). */
export function circlePoints(center: HudPoint, radiusNm: number, n = 72): HudPoint[] {
  const pts: HudPoint[] = [];
  for (let i = 0; i <= n; i += 1) pts.push(destPoint(center, (i / n) * 360, radiusNm));
  return pts;
}

/** Graticule polylines: parallels + meridians every `stepDeg`, sampled at 5°. */
export function graticule(stepDeg = 15): HudPoint[][] {
  const lines: HudPoint[][] = [];
  for (let lat = -75; lat <= 75; lat += stepDeg) {
    const line: HudPoint[] = [];
    for (let lon = -180; lon <= 180; lon += 5) line.push({ lat, lon });
    lines.push(line);
  }
  for (let lon = -180; lon < 180; lon += stepDeg) {
    const line: HudPoint[] = [];
    for (let lat = -85; lat <= 85; lat += 5) line.push({ lat, lon });
    lines.push(line);
  }
  return lines;
}

/**
 * Rotate the camera for a pointer drag of (dxPx, dyPx) given the disc's pixel
 * radius. Dragging right pulls the globe east under the cursor; latitude is
 * clamped so the camera can never flip over a pole.
 */
export function dragToRotation(cam: Camera, dxPx: number, dyPx: number, radiusPx: number): Camera {
  if (!fin(dxPx, dyPx, radiusPx) || radiusPx <= 0) return cam;
  const degPerPx = R2D / radiusPx;
  return {
    lat0: Math.min(85, Math.max(-85, cam.lat0 + dyPx * degPerPx)),
    lon0: normLon(cam.lon0 - dxPx * degPerPx),
    zoom: cam.zoom,
  };
}

export type NightShade =
  { kind: 'none' } | { kind: 'full' } | { kind: 'path'; points: { x: number; y: number }[] };

/** Closed circle of points at a fixed angular distance from `center`. */
function angularCircle(center: HudPoint, angDeg: number, n: number): HudPoint[] {
  return circlePoints(center, (angDeg / 360) * 2 * Math.PI * 3440.065, n).map((p) => ({
    lat: p.lat,
    lon: p.lon,
  }));
}

/**
 * The night-side region for the current camera, as a closed path on the unit
 * disc: the visible run of the terminator (90° from the subsolar point),
 * closed along the disc's limb on the antisolar side. Degenerate configurations
 * collapse to `full` (whole visible hemisphere in night) or `none`.
 */
export function nightPath(subsolar: HudPoint, cam: Camera, samples = 180): NightShade {
  const terminator = angularCircle(subsolar, 90, samples);
  const projected = terminator.map((p) => projectOrtho(p.lat, p.lon, cam));

  // Rotate the ring so it starts on an invisible point, keeping one contiguous
  // visible run instead of a run split across the array seam.
  const firstHidden = projected.findIndex((p) => !p.visible);
  if (firstHidden === -1) {
    // Terminator fully visible cannot happen for a great circle (it always
    // crosses the limb) except through numeric edge cases — treat as none/full
    // by centre test below.
  }
  const camCenter: HudPoint = { lat: cam.lat0, lon: cam.lon0 };
  const centerInNight = angularDist(camCenter, subsolar) > Math.PI / 2;
  const visibleRun: { x: number; y: number }[] = [];
  if (firstHidden !== -1) {
    for (let i = 0; i <= samples; i += 1) {
      const p = projected[(firstHidden + i) % (samples + 1)];
      if (p.visible) visibleRun.push({ x: p.x, y: p.y });
      else if (visibleRun.length > 0) break;
    }
  }
  if (visibleRun.length < 2) return centerInNight ? { kind: 'full' } : { kind: 'none' };

  // Close along the limb through the antisolar direction.
  const anti = projectOrtho(-subsolar.lat, normLon(subsolar.lon + 180), cam);
  const antiAngle = Math.atan2(anti.y, anti.x);
  const start = visibleRun[0];
  const end = visibleRun[visibleRun.length - 1];
  const θEnd = Math.atan2(end.y, end.x);
  const θStart = Math.atan2(start.y, start.x);
  const TAU = 2 * Math.PI;
  // Walk the limb from θEnd to θStart in the direction that passes antiAngle.
  const ccwSpan = (θStart - θEnd + TAU) % TAU;
  const ccwToAnti = (antiAngle - θEnd + TAU) % TAU;
  const goCcw = ccwToAnti <= ccwSpan;
  const span = goCcw ? ccwSpan : ccwSpan - TAU;
  const steps = Math.max(2, Math.ceil((Math.abs(span) / TAU) * 90));
  const points = [...visibleRun];
  for (let i = 1; i <= steps; i += 1) {
    const θ = θEnd + (span * i) / steps;
    points.push({ x: Math.cos(θ), y: Math.sin(θ) });
  }
  return { kind: 'path', points };
}

export interface RadarProjected {
  x: number;
  y: number;
  /** Distance from the scope centre as a fraction of the range (0..1+). */
  r01: number;
  inRange: boolean;
}

/** Azimuthal-equidistant scope projection about `center` with `rangeNm`. */
export function projectRadar(
  latDeg: number,
  lonDeg: number,
  center: HudPoint,
  rangeNm: number,
): RadarProjected {
  const gc = greatCircle(center.lat, center.lon, latDeg, lonDeg);
  if (!gc || !ok(rangeNm)) return { x: 0, y: 0, r01: 0, inRange: false };
  const r01 = gc.distanceNm / rangeNm;
  const θ = norm360(gc.bearingDeg) * D2R;
  return { x: r01 * Math.sin(θ), y: r01 * Math.cos(θ), r01, inRange: r01 <= 1 };
}
