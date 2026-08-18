import { afterEach, describe, expect, it, vi } from 'vitest';
import { FLAVORS, FLAVOR_IDS, toFlavorId } from '../src/flavors/registry';
import { FLAVOR_ID, FLAVOR_GRANTED_PACK_IDS, IS_FLAVOR_APP } from '../src/flavors/current';
import { findPack } from '../src/lib/prepCatalog';

// The flavor registry is the structural source of truth for the standalone
// prep-app suite (one paid-upfront app per pack). These invariants keep it in
// lockstep with the pack catalog and with vite.config.ts's PWA manifest.

describe('flavor registry', () => {
  it('maps every non-main flavor to a live, paid pack', () => {
    for (const id of FLAVOR_IDS) {
      const flavor = FLAVORS[id];
      if (id === 'main') {
        expect(flavor.packId).toBeUndefined();
        continue;
      }
      const pack = findPack(flavor.packId);
      expect(pack, `flavor ${id} → pack ${flavor.packId}`).toBeDefined();
      expect(pack?.status).toBe('live');
      expect(pack?.access).toBe('paid');
    }
  });

  it('gives every flavor a unique com.flygaca.* bundle id', () => {
    const appIds = FLAVOR_IDS.map((id) => FLAVORS[id].appId);
    expect(new Set(appIds).size).toBe(appIds.length);
    for (const appId of appIds) expect(appId).toMatch(/^com\.flygaca\./);
    expect(FLAVORS.main.appId).toBe('com.flygaca.app');
  });

  it('keeps main.manifest mirroring the vite.config.ts PWA manifest literals', () => {
    // vite.config.ts reads these fields from the registry; if either side is
    // edited alone the main web app's shipped manifest would silently change.
    expect(FLAVORS.main.manifest).toEqual({
      name: 'Fly GACA — Saudi Aviation Library',
      shortName: 'Fly GACA',
      description:
        "A fast, free reference library of Saudi civil-aviation regulations (GACAR) for the Kingdom's pilots, instructors and cadets.",
      themeColor: '#0A0E12',
    });
  });

  it('narrows only known flavor ids', () => {
    expect(toFlavorId('elp')).toBe('elp');
    expect(toFlavorId('main')).toBe('main');
    expect(toFlavorId('nope')).toBeUndefined();
    expect(toFlavorId(undefined)).toBeUndefined();
    expect(toFlavorId('')).toBeUndefined();
  });
});

describe('flavor selection (current.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to main with no grants when VITE_APP_FLAVOR is unset', () => {
    // The suite runs without the env var — this asserts the production web
    // build's identity: full app, empty grant list, paywall untouched.
    expect(FLAVOR_ID).toBe('main');
    expect(IS_FLAVOR_APP).toBe(false);
    expect(FLAVOR_GRANTED_PACK_IDS).toEqual([]);
  });

  it('selects the flavor and grants exactly its pack when the env is set', async () => {
    vi.stubEnv('VITE_APP_FLAVOR', 'elp');
    vi.resetModules();
    const fresh = await import('../src/flavors/current');
    expect(fresh.FLAVOR_ID).toBe('elp');
    expect(fresh.IS_FLAVOR_APP).toBe(true);
    expect(fresh.FLAVOR_GRANTED_PACK_IDS).toEqual(['elp']);
  });

  it('falls back to main on an unknown flavor id', async () => {
    vi.stubEnv('VITE_APP_FLAVOR', 'not-a-flavor');
    vi.resetModules();
    const fresh = await import('../src/flavors/current');
    expect(fresh.FLAVOR_ID).toBe('main');
    expect(fresh.FLAVOR_GRANTED_PACK_IDS).toEqual([]);
  });
});
