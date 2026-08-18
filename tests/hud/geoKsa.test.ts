import { describe, expect, it } from 'vitest';
import { KSA_OUTLINE } from '@/calc/hud/geoKsa';
import { pointInPolygon } from '@/calc/hud/sectors';

describe('KSA_OUTLINE', () => {
  it('ships at least one substantial closed ring', () => {
    expect(KSA_OUTLINE.length).toBeGreaterThanOrEqual(1);
    const ring = KSA_OUTLINE[0];
    expect(ring.length).toBeGreaterThanOrEqual(40);
    expect(ring[0].lat).toBeCloseTo(ring[ring.length - 1].lat, 9);
    expect(ring[0].lon).toBeCloseTo(ring[ring.length - 1].lon, 9);
  });
  it('stays inside the peninsula bounding box', () => {
    for (const ring of KSA_OUTLINE) {
      for (const p of ring) {
        expect(p.lat).toBeGreaterThan(15);
        expect(p.lat).toBeLessThan(33.5);
        expect(p.lon).toBeGreaterThan(33.5);
        expect(p.lon).toBeLessThan(56.5);
      }
    }
  });
  it('contains the major hubs and excludes points far outside', () => {
    const ring = KSA_OUTLINE[0].map((p) => [p.lat, p.lon] as [number, number]);
    expect(pointInPolygon({ lat: 24.96278, lon: 46.70806 }, ring)).toBe(true); // OERK
    expect(pointInPolygon({ lat: 21.68111, lon: 39.15611 }, ring)).toBe(true); // OEJN
    expect(pointInPolygon({ lat: 26.47111, lon: 49.79778 }, ring)).toBe(true); // OEDF
    expect(pointInPolygon({ lat: 30.05, lon: 31.23 }, ring)).toBe(false); // Cairo
    expect(pointInPolygon({ lat: 25.25, lon: 55.36 }, ring)).toBe(false); // Dubai
  });
});
