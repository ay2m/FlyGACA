import { describe, expect, it } from 'vitest';
import { parseTaf } from '@/calc/taf';

describe('parseTaf', () => {
  const r = parseTaf(
    'TAF OERK 121100Z 1212/1318 33012KT 9999 FEW040 BECMG 1318/1320 02008KT TEMPO 1212/1216 5000 TSRA BKN030',
  );
  it('reads header and validity', () => {
    expect(r.station).toBe('OERK');
    expect(r.issue).toMatchObject({ day: 12, hour: 11 });
    expect(r.validity).toBe('1212/1318');
  });
  it('splits base + change groups', () => {
    expect(r.groups.map((g) => g.type)).toEqual(['BASE', 'BECMG', 'TEMPO']);
    expect(r.groups[0].wind).toMatchObject({ dir: 330, speedKt: 12 });
    expect(r.groups[2].visibilityM).toBe(5000);
    expect(r.groups[2].weather).toContain('TSRA');
    expect(r.groups[2].clouds[0]).toMatchObject({ cover: 'BKN', baseFt: 3000 });
  });
  it('handles FM and PROB groups', () => {
    const t = parseTaf(
      'TAF OEJN 010500Z 0106/0212 14010KT CAVOK FM011000 18015G25KT PROB30 0114/0118 4000 BR',
    );
    const types = t.groups.map((g) => g.type);
    expect(types).toContain('FM');
    expect(types).toContain('PROB');
    expect(t.groups.find((g) => g.type === 'PROB')!.prob).toBe(30);
    expect(t.groups[0].cavok).toBe(true);
  });
});
