/** Guide slugs (order shown in the index) and the tools each guide links to. */
export const GUIDE_SLUGS = [
  'how-to-become-a-pilot-in-saudi-arabia',
  'gacar-explained',
  'saudi-ppl-requirements',
  'saudi-cpl-requirements',
  'saudi-instrument-rating',
  'night-rating',
  'atpl-requirements',
  'flight-instructor-rating',
  'gaca-medical-class-1',
  'foreign-license-conversion-to-gaca',
  'icao-english-saelpt',
  'radiotelephony-phraseology',
  'airspace-explained',
  'drone-uas-rules-in-ksa',
  'weight-and-balance-basics',
  'density-altitude-and-performance',
  'fuel-planning-and-reserves',
  'reading-metar-taf',
  'decoding-notams',
  'the-airac-cycle',
  'pilot-currency-and-recency',
  'vfr-weather-minimums',
  'gaca-medical-class-2',
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export type GuideTopic =
  | 'regulation'
  | 'licensing'
  | 'medical'
  | 'language'
  | 'airspace'
  | 'weather'
  | 'planning'
  | 'operations'
  | 'performance';
export type GuideLevel = 'beginner' | 'intermediate' | 'advanced';

/** Topic display order in the index. */
export const GUIDE_TOPICS: GuideTopic[] = [
  'regulation',
  'licensing',
  'medical',
  'language',
  'airspace',
  'operations',
  'performance',
  'weather',
  'planning',
];

/** Per-guide classification — structure only; labels are localized in i18n. */
export const GUIDE_META: Record<GuideSlug, { topic: GuideTopic; level: GuideLevel }> = {
  'gaca-medical-class-2': { topic: 'medical', level: 'beginner' },
  'vfr-weather-minimums': { topic: 'operations', level: 'intermediate' },
  'pilot-currency-and-recency': { topic: 'operations', level: 'intermediate' },
  'how-to-become-a-pilot-in-saudi-arabia': { topic: 'licensing', level: 'beginner' },
  'gacar-explained': { topic: 'regulation', level: 'beginner' },
  'saudi-ppl-requirements': { topic: 'licensing', level: 'beginner' },
  'saudi-cpl-requirements': { topic: 'licensing', level: 'intermediate' },
  'saudi-instrument-rating': { topic: 'licensing', level: 'intermediate' },
  'night-rating': { topic: 'licensing', level: 'intermediate' },
  'atpl-requirements': { topic: 'licensing', level: 'advanced' },
  'flight-instructor-rating': { topic: 'licensing', level: 'advanced' },
  'gaca-medical-class-1': { topic: 'medical', level: 'beginner' },
  'foreign-license-conversion-to-gaca': { topic: 'licensing', level: 'intermediate' },
  'icao-english-saelpt': { topic: 'language', level: 'beginner' },
  'radiotelephony-phraseology': { topic: 'language', level: 'beginner' },
  'airspace-explained': { topic: 'airspace', level: 'beginner' },
  'drone-uas-rules-in-ksa': { topic: 'operations', level: 'beginner' },
  'weight-and-balance-basics': { topic: 'performance', level: 'beginner' },
  'density-altitude-and-performance': { topic: 'performance', level: 'intermediate' },
  'fuel-planning-and-reserves': { topic: 'operations', level: 'intermediate' },
  'reading-metar-taf': { topic: 'weather', level: 'beginner' },
  'decoding-notams': { topic: 'planning', level: 'intermediate' },
  'the-airac-cycle': { topic: 'planning', level: 'intermediate' },
};

export type GuideStatus = 'draft' | 'live';

/**
 * Publication state per guide. A 'draft' still renders by direct URL (with a
 * "Draft" badge) but is unlisted — excluded from the index, the catalog
 * structured data, and the sitemap — so reviewers can preview it on the PR's
 * Vercel deployment without it going public. Flip to 'live' to publish.
 * `scripts/new-guide.mjs` seeds every new guide as 'draft'.
 */
export const GUIDE_STATUS: Record<GuideSlug, GuideStatus> = {
  'gaca-medical-class-2': 'live',
  'vfr-weather-minimums': 'live',
  'pilot-currency-and-recency': 'live',
  'how-to-become-a-pilot-in-saudi-arabia': 'live',
  'gacar-explained': 'live',
  'saudi-ppl-requirements': 'live',
  'saudi-cpl-requirements': 'live',
  'saudi-instrument-rating': 'live',
  'night-rating': 'live',
  'atpl-requirements': 'live',
  'flight-instructor-rating': 'live',
  'gaca-medical-class-1': 'live',
  'foreign-license-conversion-to-gaca': 'live',
  'icao-english-saelpt': 'live',
  'radiotelephony-phraseology': 'live',
  'airspace-explained': 'live',
  'drone-uas-rules-in-ksa': 'live',
  'weight-and-balance-basics': 'live',
  'density-altitude-and-performance': 'live',
  'fuel-planning-and-reserves': 'live',
  'reading-metar-taf': 'live',
  'decoding-notams': 'live',
  'the-airac-cycle': 'live',
};

/**
 * The date a guide's regulatory content was last verified against the corpus,
 * ISO `YYYY-MM-DD`. Emitted as schema.org `datePublished`/`dateModified`, shown
 * on the page as "last reviewed", and used as the guide's sitemap `lastmod`.
 *
 * Deliberately PARTIAL: only guides someone has actually re-checked appear here.
 * A guide with no entry ships no date at all rather than a fabricated one —
 * claiming freshness you haven't verified is worse than claiming none, both for
 * readers and for the AI answer engines that weigh recency.
 *
 * Keep the entries as plain `'slug': 'date'` literals on one line each: the
 * sitemap and prerender scripts read this table by regex, not by importing it.
 */
export const GUIDE_UPDATED: Partial<Record<GuideSlug, string>> = {
  'how-to-become-a-pilot-in-saudi-arabia': '2026-09-01',
  'gacar-explained': '2026-09-01',
  'saudi-ppl-requirements': '2026-09-01',
  'saudi-cpl-requirements': '2026-09-01',
  'saudi-instrument-rating': '2026-09-01',
  'atpl-requirements': '2026-09-01',
  'drone-uas-rules-in-ksa': '2026-09-01',
  'foreign-license-conversion-to-gaca': '2026-09-01',
  'gaca-medical-class-1': '2026-09-01',
  'gaca-medical-class-2': '2026-09-01',
  'pilot-currency-and-recency': '2026-09-01',
  'vfr-weather-minimums': '2026-09-01',
  'airspace-explained': '2026-09-01',
  'reading-metar-taf': '2026-09-01',
};

const isLiveGuide = (slug: GuideSlug): boolean => GUIDE_STATUS[slug] === 'live';

/** Published guides, in index order — drafts filtered out. */
export const LIVE_GUIDE_SLUGS: readonly GuideSlug[] = GUIDE_SLUGS.filter(isLiveGuide);

// The section-anchor scheme now lives in a shared, unit-tested module so the
// legal pages reuse the exact same ids; re-exported here so guide call sites
// (and the TOC/copy-link) keep importing it from this module.
export { sectionId } from '@/calc/library/anchor';

/** Related tool routes per guide (label comes from the tool's i18n name). */
export const GUIDE_TOOLS: Record<string, string[]> = {
  'gaca-medical-class-2': ['/tools/medical-validity'],
  'vfr-weather-minimums': ['/tools/vfr-minima', '/tools/airspace'],
  'pilot-currency-and-recency': ['/tools/part61-currency', '/tools/flight-review'],
  'how-to-become-a-pilot-in-saudi-arabia': ['/tools/medical-validity', '/tools/part61-currency'],
  'gaca-medical-class-1': ['/tools/medical-validity'],
  'foreign-license-conversion-to-gaca': ['/tools/conversion-checker'],
  'airspace-explained': ['/tools/airspace', '/tools/vfr-minima'],
  'reading-metar-taf': ['/tools/metar', '/tools/taf'],
  'decoding-notams': ['/tools/notam'],
  'the-airac-cycle': ['/tools/airac'],
  'saudi-ppl-requirements': ['/tools/part61-currency'],
  'night-rating': ['/tools/sun-times'],
  'flight-instructor-rating': ['/tools/flight-review'],
  'radiotelephony-phraseology': ['/tools/phonetic', '/tools/transponder'],
  'weight-and-balance-basics': ['/tools/weight-balance'],
  'density-altitude-and-performance': ['/tools/density-altitude', '/tools/takeoff-landing'],
  'fuel-planning-and-reserves': ['/tools/fuel', '/tools/specific-range'],
};

/** Tool route → i18n name key, for rendering related-tool chips. */
export const TOOL_NAME_KEY: Record<string, string> = {
  '/tools/medical-validity': 'tools.items.medical-validity.name',
  '/tools/conversion-checker': 'tools.items.conversion-checker.name',
  '/tools/airspace': 'tools.items.airspace.name',
  '/tools/vfr-minima': 'tools.items.vfr-minima.name',
  '/tools/metar': 'tools.items.metar.name',
  '/tools/taf': 'tools.items.taf.name',
  '/tools/notam': 'tools.items.notam.name',
  '/tools/airac': 'tools.items.airac.name',
  '/tools/part61-currency': 'tools.items.part61-currency.name',
  '/tools/sun-times': 'tools.items.sun-times.name',
  '/tools/flight-review': 'tools.items.flight-review.name',
  '/tools/phonetic': 'tools.items.phonetic.name',
  '/tools/transponder': 'tools.items.transponder.name',
  '/tools/weight-balance': 'tools.items.weight-balance.name',
  '/tools/density-altitude': 'tools.items.density-altitude.name',
  '/tools/takeoff-landing': 'tools.items.takeoff-landing.name',
  '/tools/fuel': 'tools.items.fuel.name',
  '/tools/specific-range': 'tools.items.specific-range.name',
};

/** GACAR library doc slugs each guide cites (see public/data/gacar-index.json). */
export const GUIDE_REGS: Record<string, string[]> = {
  'gaca-medical-class-2': ['part-67'],
  'vfr-weather-minimums': ['part-91', 'part-71'],
  'pilot-currency-and-recency': ['part-61', 'part-91'],
  'how-to-become-a-pilot-in-saudi-arabia': ['part-61', 'part-67'],
  'gacar-explained': ['part-1', 'part-61', 'part-91'],
  'saudi-ppl-requirements': ['part-61', 'part-91'],
  'saudi-cpl-requirements': ['part-61'],
  'saudi-instrument-rating': ['part-61', 'part-91'],
  'night-rating': ['part-61', 'part-91'],
  'atpl-requirements': ['part-61'],
  'flight-instructor-rating': ['part-61', 'part-141'],
  'gaca-medical-class-1': ['part-67'],
  'foreign-license-conversion-to-gaca': ['part-61'],
  'icao-english-saelpt': ['part-61'],
  'radiotelephony-phraseology': ['part-91'],
  'airspace-explained': ['part-71', 'part-91'],
  'drone-uas-rules-in-ksa': ['part-101', 'part-107'],
  'weight-and-balance-basics': ['part-91'],
  'density-altitude-and-performance': ['part-91'],
  'fuel-planning-and-reserves': ['part-91', 'part-121'],
  'reading-metar-taf': ['part-91'],
  'decoding-notams': ['part-91'],
  'the-airac-cycle': ['part-91'],
};

/** "61" from "part-61" — for the chip label `GACAR Part {{part}}`. */
export const partNumber = (slug: string): string => slug.replace(/^part-/, '');

/** Guide → quiz bank id (quiz.json) for the "Test yourself" cross-link. */
export const GUIDE_QUIZ: Record<string, string> = {
  'gaca-medical-class-2': 'medical',
  'vfr-weather-minimums': 'airspace',
  'pilot-currency-and-recency': 'pilot-licensing',
  'how-to-become-a-pilot-in-saudi-arabia': 'pilot-licensing',
  'gacar-explained': 'air-law',
  'saudi-ppl-requirements': 'pilot-licensing',
  'saudi-cpl-requirements': 'pilot-licensing',
  'saudi-instrument-rating': 'pilot-licensing',
  'atpl-requirements': 'pilot-licensing',
  'flight-instructor-rating': 'pilot-licensing',
  'gaca-medical-class-1': 'medical',
  'icao-english-saelpt': 'radio-elpt',
  'radiotelephony-phraseology': 'radio-elpt',
  'airspace-explained': 'airspace',
  'reading-metar-taf': 'weather',
  'decoding-notams': 'aip-ais',
  'the-airac-cycle': 'aip-ais',
  'fuel-planning-and-reserves': 'navigation',
  'density-altitude-and-performance': 'aerodynamics',
  'weight-and-balance-basics': 'aerodynamics',
  'drone-uas-rules-in-ksa': 'air-law',
};
