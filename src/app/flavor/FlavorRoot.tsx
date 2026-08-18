import { lazy, Suspense } from 'react';

// Lazy so the flavor chrome (and its CSS) stays out of the main web bundle —
// this file is the only piece of the flavor UI the router imports eagerly.
const FlavorLayout = lazy(() =>
  import('./FlavorLayout').then((m) => ({ default: m.FlavorLayout })),
);

/**
 * Root element of a standalone prep-app (flavor) build. A lazy component at the
 * routing root needs its own Suspense boundary; below it, FlavorLayout provides
 * the usual per-page one. The null fallback is fine — the native splash screen
 * covers boot (capacitor.config.ts hides it manually via initNative()).
 */
export function FlavorRoot() {
  return (
    <Suspense fallback={null}>
      <FlavorLayout />
    </Suspense>
  );
}
