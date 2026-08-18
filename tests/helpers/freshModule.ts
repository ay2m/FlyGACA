import { vi } from 'vitest';

/**
 * Re-import a module with a clean module registry.
 *
 * The `src/lib/prefs/*` stores hydrate from localStorage once, at import time.
 * To test hydration you therefore have to seed storage and then get a *new*
 * copy of the module — a plain import would hand back the instance the previous
 * test already hydrated. Each prefs spec used to carry its own copy of this
 * three-line dance.
 *
 * Usage keeps full type inference:
 *
 *     const mod = await freshModule<typeof import('@/lib/prefs/toolPrefs')>(
 *       () => import('@/lib/prefs/toolPrefs'),
 *     );
 */
export async function freshModule<T>(load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  return load();
}
