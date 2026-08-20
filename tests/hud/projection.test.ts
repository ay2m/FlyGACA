/**
 * `src/calc/hud/projection.ts` — the orthographic globe projection, great-circle
 * geometry, the camera drag/zoom model, the terminator path and the radar scope.
 *
 * Pure, DOM-free math that the repo's own convention says gets a Vitest spec,
 * but the module sat at 5% statements and **0% branch and function coverage** —
 * reached only transitively through a component render test, so every guard and
 * every degenerate case below was unexercised.
 *
 * Assertions are on invariants (a projected point stays on the unit disc, a
 * slerp midpoint is equidistant from both ends, a destination lies the requested
 * distance away) rather than on transcribed constants, so the tests describe the
 * geometry instead of freezing an implementation detail.
 */
import { describe, expect, it } from 'vitest';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  clampZoom,
  normLon,
  projectOrtho,
  angularDist,
  gcPointAt,
  sampleGreatCircle,
  destPoint,
  circlePoints,
  graticule,
  dragToRotation,
  nightPath,
  projectRadar,
  type Camera,
} from '@/calc/hud/projection';

const RIYADH = { lat: 24.9576, lon: 46.6988 }; // OERK
const JEDDAH = { lat: 21.6796, lon: 39.1564 }; // OEJN
const CAM: Camera = { lat0: 24, lon0: 45, zoom: 1 };

const R2D = 180 / Math.PI;

describe('clampZoom', () => {
  it('holds the zoom inside its range', () => {
    expect(clampZoom(MIN_ZOOM - 5)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM + 5)).toBe(MAX_ZOOM);
    expect(clampZoom(3)).toBe(3);
  });

  it('falls back to the minimum for any non-finite input', () => {
    // A pinch gesture that divides by zero must not strand the globe. `fin`
    // rejects the infinities too, so they land on MIN_ZOOM rather than being
    // clamped to the nearer bound.
    expect(clampZoom(NaN)).toBe(MIN_ZOOM);
    expect(clampZoom(Infinity)).toBe(MIN_ZOOM);
    expect(clampZoom(-Infinity)).toBe(MIN_ZOOM);
  });
});

describe('normLon', () => {
  it('wraps into [-180, 180)', () => {
    expect(normLon(0)).toBe(0);
    expect(normLon(190)).toBeCloseTo(-170, 9);
    expect(normLon(-190)).toBeCloseTo(170, 9);
    expect(normLon(540)).toBeCloseTo(-180, 9);
  });

  it('is idempotent for an already-normalized value', () => {
    for (const lon of [-179.9, -90, 0, 45.5, 179.9]) {
      expect(normLon(normLon(lon))).toBeCloseTo(normLon(lon), 9);
    }
  });
});

describe('projectOrtho', () => {
  it('puts the camera centre at the origin, fully visible', () => {
    const p = projectOrtho(CAM.lat0, CAM.lon0, CAM);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.cosC).toBeCloseTo(1, 9);
    expect(p.visible).toBe(true);
  });

  it('keeps every projected point on the unit disc', () => {
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = -180; lon < 180; lon += 30) {
        const p = projectOrtho(lat, lon, CAM);
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('marks the far hemisphere hidden', () => {
    // The antipode of the camera centre is exactly behind the globe.
    const p = projectOrtho(-CAM.lat0, normLon(CAM.lon0 + 180), CAM);
    expect(p.cosC).toBeLessThan(0);
    expect(p.visible).toBe(false);
  });

  it('places a point due east of the centre at positive x', () => {
    const p = projectOrtho(CAM.lat0, CAM.lon0 + 10, CAM);
    expect(p.x).toBeGreaterThan(0);
    expect(p.visible).toBe(true);
  });
});

describe('angularDist', () => {
  it('is zero for a point against itself', () => {
    expect(angularDist(RIYADH, RIYADH)).toBeCloseTo(0, 9);
  });

  it('is symmetric', () => {
    expect(angularDist(RIYADH, JEDDAH)).toBeCloseTo(angularDist(JEDDAH, RIYADH), 12);
  });

  it('is π for antipodes and never NaN at the domain edge', () => {
    // acos is clamped, so floating-point overshoot past ±1 cannot produce NaN.
    const anti = { lat: -RIYADH.lat, lon: normLon(RIYADH.lon + 180) };
    expect(angularDist(RIYADH, anti)).toBeCloseTo(Math.PI, 6);
    expect(angularDist({ lat: 90, lon: 0 }, { lat: -90, lon: 0 })).toBeCloseTo(Math.PI, 9);
  });
});

describe('gcPointAt', () => {
  it('returns the endpoints at f = 0 and f = 1', () => {
    const a = gcPointAt(RIYADH, JEDDAH, 0);
    expect(a.lat).toBeCloseTo(RIYADH.lat, 6);
    expect(a.lon).toBeCloseTo(RIYADH.lon, 6);

    const b = gcPointAt(RIYADH, JEDDAH, 1);
    expect(b.lat).toBeCloseTo(JEDDAH.lat, 6);
    expect(b.lon).toBeCloseTo(JEDDAH.lon, 6);
  });

  it('puts the midpoint equidistant from both ends', () => {
    const mid = gcPointAt(RIYADH, JEDDAH, 0.5);
    expect(angularDist(RIYADH, mid)).toBeCloseTo(angularDist(mid, JEDDAH), 9);
  });

  it('clamps a fraction outside 0..1 rather than extrapolating off the leg', () => {
    expect(gcPointAt(RIYADH, JEDDAH, -2)).toMatchObject({
      lat: expect.closeTo(RIYADH.lat, 6),
    });
    expect(gcPointAt(RIYADH, JEDDAH, 5)).toMatchObject({
      lat: expect.closeTo(JEDDAH.lat, 6),
    });
  });

  it('degenerates to the origin for a zero-length leg', () => {
    expect(gcPointAt(RIYADH, RIYADH, 0.5)).toEqual({ lat: RIYADH.lat, lon: RIYADH.lon });
  });

  it('returns the origin for a non-finite fraction rather than NaN coordinates', () => {
    const p = gcPointAt(RIYADH, JEDDAH, NaN);
    expect(p).toEqual({ lat: RIYADH.lat, lon: RIYADH.lon });
  });
});

describe('sampleGreatCircle', () => {
  it('returns n + 1 points spanning the leg inclusively', () => {
    const pts = sampleGreatCircle(RIYADH, JEDDAH, 8);
    expect(pts).toHaveLength(9);
    expect(pts[0].lat).toBeCloseTo(RIYADH.lat, 6);
    expect(pts[8].lat).toBeCloseTo(JEDDAH.lat, 6);
  });

  it('advances monotonically along the route', () => {
    const pts = sampleGreatCircle(RIYADH, JEDDAH, 12);
    const gaps = pts.map((p) => angularDist(RIYADH, p));
    for (let i = 1; i < gaps.length; i += 1) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
  });

  it('never returns fewer than two points, whatever n is asked for', () => {
    expect(sampleGreatCircle(RIYADH, JEDDAH, 0)).toHaveLength(2);
    expect(sampleGreatCircle(RIYADH, JEDDAH, -5)).toHaveLength(2);
    expect(sampleGreatCircle(RIYADH, JEDDAH, 3.7)).toHaveLength(4); // floored
  });
});

describe('destPoint', () => {
  it('lands the requested distance away', () => {
    const d = destPoint(RIYADH, 90, 100);
    // 100 NM ≈ 100/3440.065 rad.
    expect(angularDist(RIYADH, d)).toBeCloseTo(100 / 3440.065, 6);
  });

  it('moves north on 000 and south on 180', () => {
    expect(destPoint(RIYADH, 0, 60).lat).toBeGreaterThan(RIYADH.lat);
    expect(destPoint(RIYADH, 180, 60).lat).toBeLessThan(RIYADH.lat);
  });

  it('stays put for a zero distance', () => {
    const d = destPoint(RIYADH, 42, 0);
    expect(d.lat).toBeCloseTo(RIYADH.lat, 9);
    expect(d.lon).toBeCloseTo(RIYADH.lon, 9);
  });

  it('normalizes a longitude that wraps the antimeridian', () => {
    const d = destPoint({ lat: 0, lon: 179 }, 90, 500);
    expect(d.lon).toBeGreaterThanOrEqual(-180);
    expect(d.lon).toBeLessThan(180);
  });
});

describe('circlePoints', () => {
  it('closes the ring and holds a constant radius', () => {
    const pts = circlePoints(RIYADH, 120, 36);
    expect(pts).toHaveLength(37);
    expect(pts[0].lat).toBeCloseTo(pts[36].lat, 6);
    expect(pts[0].lon).toBeCloseTo(pts[36].lon, 6);
    for (const p of pts) {
      expect(angularDist(RIYADH, p) * 3440.065).toBeCloseTo(120, 3);
    }
  });
});

describe('graticule', () => {
  it('emits parallels and meridians at the requested spacing', () => {
    const lines = graticule(30);
    // Parallels −75..75 step 30 → 6; meridians −180..<180 step 30 → 12.
    expect(lines).toHaveLength(18);
    expect(lines.every((l) => l.length >= 2)).toBe(true);
  });

  it('keeps every vertex inside valid lat/lon bounds', () => {
    for (const line of graticule()) {
      for (const p of line) {
        expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(p.lon)).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('dragToRotation', () => {
  it('pulls the globe east when dragging right', () => {
    const next = dragToRotation(CAM, 50, 0, 300);
    expect(next.lon0).toBeLessThan(CAM.lon0);
  });

  it('scales rotation by the disc radius', () => {
    const small = dragToRotation(CAM, 50, 0, 150);
    const large = dragToRotation(CAM, 50, 0, 600);
    expect(Math.abs(small.lon0 - CAM.lon0)).toBeGreaterThan(Math.abs(large.lon0 - CAM.lon0));
  });

  it('clamps latitude so the camera can never flip over a pole', () => {
    const north = dragToRotation({ ...CAM, lat0: 80 }, 0, 100_000, 300);
    expect(north.lat0).toBe(85);
    const south = dragToRotation({ ...CAM, lat0: -80 }, 0, -100_000, 300);
    expect(south.lat0).toBe(-85);
  });

  it('keeps the camera unchanged for a degenerate or non-finite drag', () => {
    expect(dragToRotation(CAM, 10, 10, 0)).toBe(CAM);
    expect(dragToRotation(CAM, NaN, 10, 300)).toBe(CAM);
    expect(dragToRotation(CAM, 10, Infinity, 300)).toBe(CAM);
  });

  it('preserves zoom across a drag', () => {
    expect(dragToRotation({ ...CAM, zoom: 4 }, 30, 20, 300).zoom).toBe(4);
  });
});

describe('nightPath', () => {
  it('shades nothing when the camera looks straight at the sun', () => {
    const shade = nightPath({ lat: CAM.lat0, lon: CAM.lon0 }, CAM);
    expect(shade.kind).toBe('none');
  });

  it('shades the whole disc when the camera looks at the antisolar point', () => {
    const subsolar = { lat: -CAM.lat0, lon: normLon(CAM.lon0 + 180) };
    expect(nightPath(subsolar, CAM).kind).toBe('full');
  });

  it('returns a closed path at the terminator, on the unit disc', () => {
    // Subsolar point 90° away: the terminator runs through the camera centre.
    const shade = nightPath({ lat: 0, lon: normLon(CAM.lon0 + 90) }, CAM);
    expect(shade.kind).toBe('path');
    if (shade.kind !== 'path') return;
    expect(shade.points.length).toBeGreaterThan(2);
    for (const p of shade.points) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('never yields NaN coordinates as the sun sweeps all longitudes', () => {
    for (let lon = -180; lon < 180; lon += 15) {
      const shade = nightPath({ lat: 10, lon }, CAM, 60);
      if (shade.kind !== 'path') continue;
      for (const p of shade.points) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
  });
});

describe('projectRadar', () => {
  it('puts the scope centre at the origin', () => {
    const p = projectRadar(RIYADH.lat, RIYADH.lon, RIYADH, 80);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.r01).toBeCloseTo(0, 6);
    expect(p.inRange).toBe(true);
  });

  it('maps a target due north to +y and due east to +x', () => {
    const north = destPoint(RIYADH, 0, 40);
    const east = destPoint(RIYADH, 90, 40);

    const pn = projectRadar(north.lat, north.lon, RIYADH, 80);
    expect(pn.y).toBeGreaterThan(0);
    expect(pn.x).toBeCloseTo(0, 3);

    const pe = projectRadar(east.lat, east.lon, RIYADH, 80);
    expect(pe.x).toBeGreaterThan(0);
    expect(pe.y).toBeCloseTo(0, 3);
  });

  it('reports r01 as the fraction of range, flagging out-of-range targets', () => {
    const half = destPoint(RIYADH, 45, 40);
    expect(projectRadar(half.lat, half.lon, RIYADH, 80).r01).toBeCloseTo(0.5, 3);

    const far = destPoint(RIYADH, 45, 200);
    const p = projectRadar(far.lat, far.lon, RIYADH, 80);
    expect(p.r01).toBeGreaterThan(1);
    expect(p.inRange).toBe(false);
  });

  it('degenerates safely for a non-positive or non-finite range', () => {
    for (const range of [0, -10, NaN, Infinity]) {
      expect(projectRadar(JEDDAH.lat, JEDDAH.lon, RIYADH, range)).toEqual({
        x: 0,
        y: 0,
        r01: 0,
        inRange: false,
      });
    }
  });

  it('degenerates safely for a non-finite target position', () => {
    expect(projectRadar(NaN, RIYADH.lon, RIYADH, 80).inRange).toBe(false);
  });
});

describe('projection round-trips', () => {
  it('gcPointAt agrees with destPoint along a leg bearing', () => {
    // Walking 25% of the way by slerp lands where walking 25% of the distance
    // on the initial bearing lands, to within the leg's curvature.
    const total = angularDist(RIYADH, JEDDAH) * R2D;
    const quarter = gcPointAt(RIYADH, JEDDAH, 0.25);
    expect(angularDist(RIYADH, quarter) * R2D).toBeCloseTo(total * 0.25, 6);
  });
});
