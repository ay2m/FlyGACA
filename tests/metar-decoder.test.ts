import { describe, it, expect } from 'vitest';
import {
  parseMetar,
  computeFlightCategory,
  parseRwyHeading,
  computeRunwayWind,
} from '@/calc/metar';

describe('metarDecoder & runway flight category computations', () => {
  it('computes VFR category for CAVOK reports', () => {
    const r = parseMetar('OERK 121200Z 33015KT CAVOK 38/12 Q1009');
    expect(r.cavok).toBe(true);
    expect(computeFlightCategory(r)).toBe('VFR');
  });

  it('computes MVFR for ceiling between 1000 and 3000 ft', () => {
    const r = parseMetar('OEJN 121200Z 27012KT 8000 SCT020 BKN025 32/24 Q1012');
    expect(computeFlightCategory(r)).toBe('MVFR');
  });

  it('computes IFR for ceiling below 1000 ft', () => {
    const r = parseMetar('OEDF 121200Z 09008KT 4000 OVC008 28/22 Q1015');
    expect(computeFlightCategory(r)).toBe('IFR');
  });

  it('computes LIFR for ceiling below 500 ft or low visibility', () => {
    const r = parseMetar('OEAH 121200Z 18015KT 1200 FG BKN003 16/15 Q1020');
    expect(computeFlightCategory(r)).toBe('LIFR');
  });

  it('parses runway designators into headings correctly', () => {
    expect(parseRwyHeading('33L')).toBe(330);
    expect(parseRwyHeading('33R')).toBe(330);
    expect(parseRwyHeading('15')).toBe(150);
    expect(parseRwyHeading('05C')).toBe(50);
    expect(parseRwyHeading('99')).toBe(null);
    expect(parseRwyHeading('')).toBe(null);
  });

  it('computes headwind and crosswind components for runway 33L with wind 300/20KT', () => {
    const wind = { dir: 300, speedKt: 20, gustKt: null };
    const res = computeRunwayWind('33L', wind);
    expect(res).not.toBeNull();
    if (res) {
      expect(res.rwyHeading).toBe(330);
      // Angle diff = 300 - 330 = -30 deg.
      // Headwind = 20 * cos(-30) = 20 * 0.866 = ~17 kt
      expect(res.headwindKt).toBe(17);
      // Crosswind = 20 * sin(30) = 10 kt from left
      expect(res.crosswindKt).toBe(10);
      expect(res.crosswindSide).toBe('left');
    }
  });

  it('identifies tailwind condition on reciprocal runway', () => {
    const wind = { dir: 330, speedKt: 15, gustKt: null };
    const res = computeRunwayWind('15R', wind);
    expect(res).not.toBeNull();
    if (res) {
      expect(res.rwyHeading).toBe(150);
      expect(res.headwindKt).toBe(-15); // Tailwind
      expect(res.crosswindKt).toBe(0);
    }
  });

  it('parses a variable wind direction range', () => {
    // dddVddd appears whenever the direction varies by 60° or more at 3kt+, so
    // it rides along with a normal wind group rather than replacing it.
    const r = parseMetar('OERK 121200Z 32012KT 280V350 9999 FEW040 30/10 Q1011');

    expect(r.wind?.dir).toBe(320);
    expect(r.wind?.speedKt).toBe(12);
    expect(r.wind?.variableFrom).toBe(280);
    expect(r.wind?.variableTo).toBe(350);
  });

  it('reports a pure headwind with no crosswind side bias', () => {
    // Wind exactly down the runway: crosswind is 0, so the side is decided by
    // the sign of the headwind rather than by which way the wind is skewed.
    const res = computeRunwayWind('33', { dir: 330, speedKt: 18, gustKt: null });

    expect(res?.crosswindKt).toBe(0);
    expect(res?.headwindKt).toBe(18);
    expect(res?.crosswindSide).toBe('head');
  });

  it('reports a crosswind from the right', () => {
    // Wind from 360 onto runway 33 (330°) sits 30° clockwise of the centreline,
    // so it pushes from the right — the mirror of the 300/20KT case above.
    const res = computeRunwayWind('33', { dir: 360, speedKt: 20, gustKt: null });

    expect(res?.crosswindKt).toBe(10);
    expect(res?.crosswindSide).toBe('right');
  });

  it('reports a pure tailwind as the tail side', () => {
    const res = computeRunwayWind('15', { dir: 330, speedKt: 18, gustKt: null });

    expect(res?.crosswindKt).toBe(0);
    expect(res?.headwindKt).toBe(-18);
    expect(res?.crosswindSide).toBe('tail');
  });

  it('returns null when the runway wind cannot be computed', () => {
    const wind = { dir: 300, speedKt: 20, gustKt: null };

    expect(computeRunwayWind('99', wind)).toBeNull(); // unparseable runway
    expect(computeRunwayWind('33L', null)).toBeNull(); // no wind group
    // A variable-direction METAR reports VRB, which carries no numeric heading
    // to resolve components against.
    expect(computeRunwayWind('33L', { dir: null, speedKt: 20, gustKt: null })).toBeNull();
    expect(computeRunwayWind('33L', { dir: 300, speedKt: null, gustKt: null })).toBeNull();
  });
});
