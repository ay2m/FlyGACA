/**
 * The flavor this bundle was built as. `VITE_APP_FLAVOR` is stamped at build
 * time by `scripts/build-flavor.mjs` (never set for the main web build, so the
 * default — the full Fly GACA app — is byte-for-byte unchanged). Unknown values
 * fall back to `main` rather than throwing: a mis-set env must never brick the
 * production web build.
 */
import { FLAVORS, toFlavorId, type Flavor, type FlavorId } from './registry';

export const FLAVOR_ID: FlavorId = toFlavorId(import.meta.env.VITE_APP_FLAVOR) ?? 'main';

export const FLAVOR: Flavor = FLAVORS[FLAVOR_ID];

/** True in a standalone prep-app build; false in the full Fly GACA app. */
export const IS_FLAVOR_APP = FLAVOR_ID !== 'main';

/**
 * Packs this build grants by construction: a flavor app is paid-upfront, so
 * owning the app IS owning its pack (consumed by `hasPackAccess`). Always empty
 * on main builds — the web paywall is untouched.
 */
export const FLAVOR_GRANTED_PACK_IDS: readonly string[] =
  IS_FLAVOR_APP && FLAVOR.packId ? [FLAVOR.packId] : [];
