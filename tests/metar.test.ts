import { describe, expect, it } from 'vitest';
import { parseMetar, parseWind, parseCloud } from '@/calc/metar';

describe('parseWind', () => {
  it('parses direction, speed and gust', () => {
    expect(parseWind('33015G25KT')).toMatchObject({ dir: 330, speedKt: 15, gustKt: 25 });
  });
  it('parses variable wind', () => {
    expect(parseWind('VRB03KT')).toMatchObject({ dir: 'VRB', speedKt: 3 });
  });
  it('converts MPS to knots', () => {
    expect(parseWind('18010MPS')!.speedKt).toBe(19);
  });
});

describe('parseCloud', () => {
  it('reads cover and base', () => {
    expect(parseCloud('BKN040')).toMatchObject({ cover: 'BKN', baseFt: 4000, cb: false });
    expect(parseCloud('SCT025CB')).toMatchObject({ cover: 'SCT', baseFt: 2500, cb: true });
  });
});

describe('parseMetar', () => {
  it('decodes a full Riyadh METAR', () => {
    const r = parseMetar('OERK 121200Z 33015G25KT 9999 FEW040 SCT100 38/12 Q1009');
    expect(r.station).toBe('OERK');
    expect(r).toMatchObject({ day: 12, hour: 12, minute: 0 });
    expect(r.wind).toMatchObject({ dir: 330, speedKt: 15, gustKt: 25 });
    expect(r.visibilityM).toBe(9999);
    expect(r.clouds).toHaveLength(2);
    expect(r.tempC).toBe(38);
    expect(r.dewC).toBe(12);
    expect(r.qnhHpa).toBe(1009);
  });
  it('handles CAVOK, AUTO, negative temps and inHg', () => {
    const r = parseMetar('METAR OEDF 010600Z AUTO 09008KT CAVOK M01/M03 A2992');
    expect(r.auto).toBe(true);
    expect(r.cavok).toBe(true);
    expect(r.tempC).toBe(-1);
    expect(r.dewC).toBe(-3);
    expect(r.altimInHg).toBeCloseTo(29.92, 2);
  });
  it('collects weather phenomena', () => {
    expect(parseMetar('OERK 121200Z 00000KT 3000 +TSRA BKN030 20/18 Q1010').weather).toContain(
      '+TSRA',
    );
  });
});
