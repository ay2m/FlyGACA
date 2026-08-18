import { afterEach, describe, expect, it, vi } from 'vitest';

// The router pulls in the app chrome, whose PwaPrompts imports the build-only
// `virtual:pwa-register/react` module (provided by vite-plugin-pwa, absent from
// the Vitest config) — stub the component so the tree resolves under Vitest.
vi.mock('../src/components/pwa/PwaPrompts', () => ({ PwaPrompts: () => null }));

const { routes } = await import('../src/router');

// Route-tree contract for the flavor system. Two invariants:
//  1. With VITE_APP_FLAVOR unset, the main web app mounts EXACTLY the table it
//     had before flavors existed — pinned literally so an accidental edit to
//     the shared tree (or the flavor switch leaking) fails loudly.
//  2. A flavor build mounts exactly the reduced standalone-prep set, and every
//     flavor path also exists in the main table — which is what keeps
//     scripts/build-sitemap.mjs's textual `path:` scan of router.tsx stable.

interface Routeish {
  path?: string;
  index?: boolean;
  children?: Routeish[];
}

const childPaths = (tree: Routeish[]) => (tree[0].children ?? []).map((r) => r.path ?? '<index>');

const MAIN_PATHS = [
  'library',
  'library/charts',
  'library/map',
  'library/glossary',
  'library/reference/:slug',
  'library/handbook/:slug',
  'library/:slug',
  'updates',
  'chat',
  'tools',
  'tools/crosswind',
  'tools/density-altitude',
  'tools/tas',
  'tools/pressure-altitude',
  'tools/isa',
  'tools/altimeter',
  'tools/cloud-base',
  'tools/mach',
  'tools/climb-gradient',
  'tools/standard-rate-turn',
  'tools/wind-table',
  'tools/hydroplaning',
  'tools/takeoff-landing',
  'tools/wind-triangle',
  'tools/great-circle',
  'tools/one-in-sixty',
  'tools/tsd',
  'tools/e6b',
  'tools/top-of-descent',
  'tools/descent-vdp',
  'tools/fuel',
  'tools/specific-range',
  'tools/weight-balance',
  'tools/zulu-clock',
  'tools/airac',
  'tools/sun-times',
  'tools/part61-currency',
  'tools/medical-validity',
  'tools/flight-review',
  'tools/holding',
  'tools/procedural-separation',
  'tools/vfr-brief',
  'tools/loa',
  'tools/units',
  'tools/transponder',
  'tools/phonetic',
  'tools/metar',
  'tools/taf',
  'tools/notam',
  'tools/met-brief',
  'tools/chart-symbols',
  'tools/vfr-minima',
  'tools/oxygen',
  'tools/fuel-reserves',
  'tools/conversion-checker',
  'tools/aerodromes',
  'tools/aerodromes/:icao',
  'tools/airspace',
  'tools/definitions',
  'tools/route-planner',
  'tools/flight-plan',
  'tools/critical-point',
  'tools/top-of-climb',
  'tools/turn-performance',
  'tools/pivotal-altitude',
  'tools/true-altitude',
  'learn',
  'guides',
  'guides/:slug',
  'study',
  'study/quiz',
  'study/flashcards',
  'study/groundschool',
  'study/exam',
  'study/paths',
  'study/packs',
  'study/packs/:id',
  'study/sheets',
  'account',
  'signin',
  'signup',
  'dashboard',
  'currency',
  'logbook',
  'records',
  'settings',
  'checkout',
  'checkout/return',
  'pricing',
  'schools',
  'developers',
  'hud',
  'business/admin',
  'about',
  'support',
  'disclaimer',
  'terms',
  'privacy',
  'refund',
  'safety',
  'offline',
  '*',
];

const FLAVOR_PATHS = [
  '<index>',
  'study/quiz',
  'study/flashcards',
  'study/groundschool',
  'study/exam',
  'study/paths',
  'study/sheets',
  'study/packs',
  'study/packs/:id',
  'library/reference/:slug',
  'library/handbook/:slug',
  'library/:slug',
  'settings',
  'disclaimer',
  'terms',
  'privacy',
  'refund',
  'safety',
  'offline',
  '*',
];

describe('router flavor switch', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('mounts the untouched main table when no flavor is set', () => {
    expect(childPaths(routes as Routeish[])).toEqual(['<index>', ...MAIN_PATHS]);
    expect((routes as Routeish[])[0].path).toBe('/');
  });

  it('mounts exactly the standalone-prep set in a flavor build', async () => {
    vi.stubEnv('VITE_APP_FLAVOR', 'elp');
    vi.resetModules();
    const fresh = await import('../src/router');
    expect(childPaths(fresh.routes as Routeish[])).toEqual(FLAVOR_PATHS);
  });

  it('keeps every flavor path inside the main table (sitemap-scan invariance)', () => {
    const main = new Set(MAIN_PATHS);
    for (const p of FLAVOR_PATHS) {
      if (p === '<index>') continue;
      expect(main.has(p), `flavor path ${p} must exist in the main table`).toBe(true);
    }
  });
});
