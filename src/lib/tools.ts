/**
 * The flight-tools registry — the single source of truth for the catalog.
 * Names/blurbs/category labels are resolved from i18n by id (so they stay
 * bilingual); this file holds only structure (route, category, status, search
 * keywords). Flip `status` to 'live' as each tool ships, and add its route to
 * src/router.tsx.
 */

export type ToolCategoryId =
  | 'performance'
  | 'atmosphere-weather'
  | 'navigation'
  | 'weight-fuel'
  | 'procedures'
  | 'regulations'
  | 'reference';

export interface ToolMeta {
  id: string;
  route: string;
  category: ToolCategoryId;
  status: 'live' | 'soon';
  badge?: 'new';
  /** Language-neutral search hints (abbreviations, alt names). */
  keywords?: string[];
}

/** Display order of the categories in the hub. */
export const TOOL_CATEGORIES: ToolCategoryId[] = [
  'performance',
  'atmosphere-weather',
  'navigation',
  'weight-fuel',
  'procedures',
  'regulations',
  'reference',
];

const t = (
  id: string,
  category: ToolCategoryId,
  status: 'live' | 'soon',
  opts: { badge?: 'new'; keywords?: string[]; route?: string } = {},
): ToolMeta => ({
  id,
  route: opts.route ?? `/tools/${id}`,
  category,
  status,
  badge: opts.badge,
  keywords: opts.keywords,
});

export const TOOLS: ToolMeta[] = [
  // Performance & runway — wind/runway, speed, climb/descent/turns
  t('crosswind', 'performance', 'live', { keywords: ['xwind', 'headwind', 'runway'] }),
  t('wind-table', 'performance', 'live', { keywords: ['all runways', 'components'] }),
  t('hydroplaning', 'performance', 'live', {
    keywords: ['aquaplaning', 'tyre', 'tire'],
  }),
  t('takeoff-landing', 'performance', 'live', {
    keywords: ['tora', 'lda', 'distance', 'performance'],
  }),
  t('tas', 'performance', 'live', { keywords: ['true airspeed', 'cas', 'mach'] }),
  t('mach', 'performance', 'live', { keywords: ['speed of sound', 'tas'] }),
  t('climb-gradient', 'performance', 'live', {
    keywords: ['ft/nm', 'fpm', 'sid', 'percent'],
  }),
  t('top-of-descent', 'performance', 'live', { keywords: ['tod', 'descent point'] }),
  t('descent-vdp', 'performance', 'live', {
    keywords: ['rate', 'vdp', 'glidepath'],
  }),
  t('standard-rate-turn', 'performance', 'live', {
    keywords: ['rate one', 'bank', 'radius'],
  }),
  t('top-of-climb', 'performance', 'live', {
    keywords: ['toc', 'time to climb', 'fuel'],
  }),
  t('turn-performance', 'performance', 'live', {
    keywords: ['turn radius', 'rate of turn', 'bank'],
  }),

  // Atmosphere & weather — atmosphere/altitude, weather decoding
  t('density-altitude', 'atmosphere-weather', 'live', { keywords: ['da', 'pa', 'isa'] }),
  t('pressure-altitude', 'atmosphere-weather', 'live', {
    keywords: ['pa', 'flight level', 'fl'],
  }),
  t('isa', 'atmosphere-weather', 'live', { keywords: ['standard atmosphere', 'deviation'] }),
  t('altimeter', 'atmosphere-weather', 'live', { keywords: ['qnh', 'qfe', 'setting'] }),
  t('cloud-base', 'atmosphere-weather', 'live', { keywords: ['dew point', 'spread', 'lcl'] }),
  t('true-altitude', 'atmosphere-weather', 'live', {
    keywords: ['temperature error', 'cold weather', 'isa deviation'],
  }),
  t('metar', 'atmosphere-weather', 'live', { keywords: ['decode', 'observation'] }),
  t('taf', 'atmosphere-weather', 'live', { badge: 'new', keywords: ['forecast', 'decode'] }),
  t('notam', 'atmosphere-weather', 'live', { keywords: ['q code', 'decode'] }),
  t('met-brief', 'atmosphere-weather', 'live', { keywords: ['route', 'weather briefing'] }),

  // Navigation & planning — navigation, time & cycles
  t('wind-triangle', 'navigation', 'live', {
    keywords: ['heading', 'groundspeed', 'wca'],
  }),
  t('great-circle', 'navigation', 'live', {
    keywords: ['distance', 'bearing', 'gc'],
  }),
  t('one-in-sixty', 'navigation', 'live', {
    keywords: ['track error', 'correction'],
  }),
  t('tsd', 'navigation', 'live', { keywords: ['time speed distance'] }),
  t('e6b', 'navigation', 'live', { keywords: ['flight computer', 'whiz wheel'] }),
  t('route-planner', 'navigation', 'live', { keywords: ['leg', 'eta', 'wind'] }),
  t('flight-plan', 'navigation', 'live', { keywords: ['icao fpl', 'filing'] }),
  t('critical-point', 'navigation', 'live', {
    keywords: ['etp', 'pnr', 'point of no return', 'radius of action'],
  }),
  t('pivotal-altitude', 'navigation', 'live', {
    keywords: ['eights on pylons', 'commercial maneuver'],
  }),
  t('zulu-clock', 'navigation', 'live', { keywords: ['utc', 'ksa', 'local', 'z'] }),
  t('airac', 'navigation', 'live', { keywords: ['cycle', '28 day', 'effective'] }),
  t('sun-times', 'navigation', 'live', { keywords: ['sunrise', 'sunset', 'twilight', 'night'] }),

  // Weight & fuel
  t('fuel', 'weight-fuel', 'live', { keywords: ['burn', 'endurance', 'range'] }),
  t('specific-range', 'weight-fuel', 'live', {
    keywords: ['nm per kg', 'efficiency'],
  }),
  t('weight-balance', 'weight-fuel', 'live', { keywords: ['cg', 'mac', 'moment', 'wb'] }),

  // Procedures & airspace — procedures/R/T, directory & glossary
  t('holding', 'procedures', 'live', { keywords: ['entry', 'teardrop', 'parallel'] }),
  t('procedural-separation', 'procedures', 'live', { keywords: ['separation', 'minima'] }),
  t('vfr-brief', 'procedures', 'live', { keywords: ['checklist', 'preflight'] }),
  t('loa', 'procedures', 'live', { keywords: ['letter of authorization'] }),
  t('aerodromes', 'procedures', 'live', { keywords: ['airport', 'icao', 'oerk', 'oejn'] }),
  t('airspace', 'procedures', 'live', { keywords: ['frequency', 'acc', 'tma', 'ctr'] }),
  t('definitions', 'procedures', 'live', { keywords: ['glossary', 'part 1', 'terms'] }),

  // Regulations & currency — GACAR lookups, currency & validity
  t('vfr-minima', 'regulations', 'live', {
    badge: 'new',
    keywords: ['visibility', 'cloud clearance', 'airspace'],
  }),
  t('oxygen', 'regulations', 'live', { badge: 'new', keywords: ['o2', 'altitude', 'part 91'] }),
  t('fuel-reserves', 'regulations', 'live', {
    keywords: ['reserve', 'alternate', 'part 121'],
  }),
  t('conversion-checker', 'regulations', 'live', { keywords: ['foreign licence', 'convert'] }),
  t('part61-currency', 'regulations', 'live', {
    keywords: ['90 day', 'night', 'passenger', 'recency'],
  }),
  t('medical-validity', 'regulations', 'live', {
    badge: 'new',
    keywords: ['class 1', 'class 2', 'expiry'],
  }),
  t('flight-review', 'regulations', 'live', { badge: 'new', keywords: ['ipc', 'bfr', 'due'] }),

  // Quick reference
  t('transponder', 'reference', 'live', {
    keywords: ['squawk', '7500', '7600', '7700'],
  }),
  t('phonetic', 'reference', 'live', {
    keywords: ['alphabet', 'morse', 'alpha bravo'],
  }),
  t('units', 'reference', 'live', { keywords: ['converter', 'feet', 'metres', 'knots'] }),
  t('chart-symbols', 'reference', 'live', { keywords: ['legend', 'vfr chart'] }),
];

export const liveTools = () => TOOLS.filter((x) => x.status === 'live');
