import type { Airport } from '@/lib/content';

/** Region filter buckets for the aerodromes directory. */
export type RegionFilter = 'all' | 'saudi' | 'gcc' | 'mena' | 'world';

export const REGION_FILTERS: RegionFilter[] = ['all', 'saudi', 'gcc', 'mena', 'world'];

/** A concrete region a single airport belongs to (the `all` bucket excluded). */
export type RegionBadge = Exclude<RegionFilter, 'all'>;

/**
 * Region tags as written by scripts/build-airports.mjs: curated Saudi rows carry
 * 'KSA', other Gulf states 'GCC', the wider region 'MENA', the rest a continent
 * code. The filter buckets are hierarchical (Saudi ⊂ GCC ⊂ MENA).
 */
export function inRegion(a: Airport, filter: RegionFilter): boolean {
  const r = a.region ?? '';
  const saudi = r === 'KSA' || a.country_en === 'Saudi Arabia';
  switch (filter) {
    case 'all':
      return true;
    case 'saudi':
      return saudi;
    case 'gcc':
      return r === 'GCC' || saudi;
    case 'mena':
      return r === 'MENA' || r === 'GCC' || saudi;
    case 'world':
      return r !== 'MENA' && r !== 'GCC' && !saudi;
  }
}

/** The badge bucket shown on a card / detail page for a single airport. */
export function regionBadge(a: Airport): RegionBadge {
  const r = a.region ?? '';
  if (r === 'KSA' || a.country_en === 'Saudi Arabia') return 'saudi';
  if (r === 'GCC') return 'gcc';
  if (r === 'MENA') return 'mena';
  return 'world';
}

/**
 * Sort rank for a single airport: Saudi first, then GCC, MENA, the wider world.
 * Keeps the directory Saudi-first in the "All" view instead of leading with the
 * lowest ICAO identifiers (numeric US airparks like 05AK). Derived from
 * regionBadge so the bucketing stays a single source of truth.
 */
export function regionRank(a: Airport): number {
  switch (regionBadge(a)) {
    case 'saudi':
      return 0;
    case 'gcc':
      return 1;
    case 'mena':
      return 2;
    case 'world':
      return 3;
  }
}

/** Directory sort: by region rank (Saudi → GCC → MENA → World), then ICAO. */
export function compareAirports(a: Airport, b: Airport): number {
  return regionRank(a) - regionRank(b) || a.icao.localeCompare(b.icao);
}
