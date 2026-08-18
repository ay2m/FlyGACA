import { describe, expect, it } from 'vitest';
import {
  REGION_FILTERS,
  inRegion,
  regionBadge,
  regionRank,
  compareAirports,
  type RegionFilter,
} from '@/lib/aerodromes';
import type { Airport } from '@/lib/content';

// Minimal Airport factory — the region helpers only read `region`, `country_en`
// and `icao`, so the rest is filled with inert defaults.
const mk = (over: Partial<Airport>): Airport =>
  ({
    icao: 'OERK',
    iata: '',
    name_en: '',
    name_ar: '',
    city_en: '',
    city_ar: '',
    lat: 0,
    lon: 0,
    elev_ft: 0,
    rwys: [],
    freqs: [],
    ...over,
  }) as Airport;

const ksa = mk({ icao: 'OERK', region: 'KSA' });
const ksaByCountry = mk({ icao: 'OEDF', country_en: 'Saudi Arabia' });
const gcc = mk({ icao: 'OMDB', region: 'GCC' });
const mena = mk({ icao: 'OJAI', region: 'MENA' });
const world = mk({ icao: 'EGLL', region: 'EU' });
const noRegion = mk({ icao: '05AK' });

describe('REGION_FILTERS', () => {
  it('lists the buckets widest-first after "all"', () => {
    expect(REGION_FILTERS).toEqual(['all', 'saudi', 'gcc', 'mena', 'world']);
  });
});

describe('inRegion', () => {
  it('"all" matches every airport', () => {
    for (const a of [ksa, gcc, mena, world, noRegion]) {
      expect(inRegion(a, 'all')).toBe(true);
    }
  });

  it('"saudi" matches the KSA region tag and the country_en fallback', () => {
    expect(inRegion(ksa, 'saudi')).toBe(true);
    expect(inRegion(ksaByCountry, 'saudi')).toBe(true);
    expect(inRegion(gcc, 'saudi')).toBe(false);
    expect(inRegion(world, 'saudi')).toBe(false);
  });

  it('"gcc" is hierarchical — includes Saudi but not the wider MENA', () => {
    expect(inRegion(gcc, 'gcc')).toBe(true);
    expect(inRegion(ksa, 'gcc')).toBe(true);
    expect(inRegion(ksaByCountry, 'gcc')).toBe(true);
    expect(inRegion(mena, 'gcc')).toBe(false);
    expect(inRegion(world, 'gcc')).toBe(false);
  });

  it('"mena" includes MENA, GCC and Saudi', () => {
    expect(inRegion(mena, 'mena')).toBe(true);
    expect(inRegion(gcc, 'mena')).toBe(true);
    expect(inRegion(ksa, 'mena')).toBe(true);
    expect(inRegion(world, 'mena')).toBe(false);
  });

  it('"world" is the complement of the regional buckets', () => {
    expect(inRegion(world, 'world')).toBe(true);
    expect(inRegion(noRegion, 'world')).toBe(true);
    expect(inRegion(mena, 'world')).toBe(false);
    expect(inRegion(gcc, 'world')).toBe(false);
    expect(inRegion(ksa, 'world')).toBe(false);
    expect(inRegion(ksaByCountry, 'world')).toBe(false);
  });

  it('treats a missing region as world (no crash)', () => {
    const filters: RegionFilter[] = ['saudi', 'gcc', 'mena'];
    for (const f of filters) expect(inRegion(noRegion, f)).toBe(false);
    expect(inRegion(noRegion, 'world')).toBe(true);
  });

  it('covers every declared filter bucket', () => {
    // Guards against a new RegionFilter being added without a matching branch.
    for (const f of REGION_FILTERS) {
      expect(typeof inRegion(ksa, f)).toBe('boolean');
    }
  });
});

describe('regionBadge', () => {
  it('maps each airport to its single badge bucket', () => {
    expect(regionBadge(ksa)).toBe('saudi');
    expect(regionBadge(ksaByCountry)).toBe('saudi');
    expect(regionBadge(gcc)).toBe('gcc');
    expect(regionBadge(mena)).toBe('mena');
    expect(regionBadge(world)).toBe('world');
    expect(regionBadge(noRegion)).toBe('world');
  });
});

describe('regionRank', () => {
  it('ranks Saudi → GCC → MENA → World', () => {
    expect(regionRank(ksa)).toBe(0);
    expect(regionRank(gcc)).toBe(1);
    expect(regionRank(mena)).toBe(2);
    expect(regionRank(world)).toBe(3);
  });
});

describe('compareAirports', () => {
  it('orders by region rank first, then ICAO', () => {
    const sorted = [world, mena, ksa, gcc].sort(compareAirports);
    expect(sorted.map((a) => a.icao)).toEqual(['OERK', 'OMDB', 'OJAI', 'EGLL']);
  });

  it('falls back to ICAO order within the same region', () => {
    const a = mk({ icao: 'OEJN', region: 'KSA' });
    const b = mk({ icao: 'OEDF', region: 'KSA' });
    expect([a, b].sort(compareAirports).map((x) => x.icao)).toEqual(['OEDF', 'OEJN']);
  });

  it('keeps Saudi airports ahead of low numeric ICAOs in an "All" sort', () => {
    // Regression intent: the directory must not lead with airparks like 05AK.
    const sorted = [noRegion, ksa].sort(compareAirports);
    expect(sorted[0]).toBe(ksa);
  });
});
