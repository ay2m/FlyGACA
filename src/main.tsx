import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { bootI18n, resolveInitialLang } from './i18n';
// Self-hosted fonts, replacing the Google Fonts CDN we used to depend on — that
// stylesheet 503'd intermittently and flashed a fallback face. Imported before the
// tokens that name them; Vite emits hashed woff2 the PWA precaches. We pull only the
// subsets this bilingual app renders — Latin (+ Latin-ext) for both faces, plus
// Arabic for Readex (RTL) — so unused Cyrillic/Greek/Vietnamese never enter the bundle.
import '@fontsource/readex-pro/latin-300.css';
import '@fontsource/readex-pro/latin-400.css';
import '@fontsource/readex-pro/latin-500.css';
import '@fontsource/readex-pro/latin-600.css';
import '@fontsource/readex-pro/latin-700.css';
import '@fontsource/readex-pro/latin-ext-400.css';
import '@fontsource/readex-pro/arabic-400.css';
import '@fontsource/readex-pro/arabic-500.css';
import '@fontsource/readex-pro/arabic-600.css';
import '@fontsource/readex-pro/arabic-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-ext-400.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/native.css';
import { router } from './router';
import { initNative } from '@/lib/native/nativeBridge';
import { reportWebVitals, initializeGoogleAnalytics } from '@/lib/analytics';
import { captureReferral } from '@/lib/share';
import { canonicalRedirect, isMirrorHost, localeRedirect } from '@/lib/seo/seo';
import { applyTheme, readTheme } from '@/lib/theme';

// Reflect the persisted theme on <html> before first paint. The inline script in
// index.html already does this for the cockpit case to avoid a colour flash; this
// is the canonical, belt-and-suspenders application (and restores Falcon cleanly).
applyTheme(readTheme());

// Mirror/preview fronts (*.web.app, *.vercel.app, *.netlify.app, *.pages.dev)
// serve the same build for redundancy but must not be indexed as duplicates of
// flygaca.com. Emit noindex (still follow links so equity flows to the canonical).
// Host-conditional at runtime, so flygaca.com and the prerender host stay
// indexable. Belt-and-suspenders to the static X-Robots-Tag headers on the mirrors.
if (isMirrorHost(window.location.hostname)) {
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, follow';
  document.head.appendChild(robots);
}

// Two pre-boot redirects, host first: a duplicate host (e.g. captadel.com) folds
// onto the canonical origin; then the locale reconciler moves the URL so its path
// prefix matches the language — a legacy `?lang=ar` link, a stored Arabic choice,
// or an Arabic browser on a clean URL lands on `/ar`. Both are `location.replace`
// (full nav) so the router remounts under the right basename. `localeRedirect`
// returns null when already consistent, so this can't loop.
const redirectTo =
  canonicalRedirect(window.location) ?? localeRedirect(window.location, resolveInitialLang());

if (redirectTo) {
  window.location.replace(redirectTo);
} else {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element #root not found');

  // Initialize Google Analytics (production web only).
  initializeGoogleAnalytics();

  // Capture an inbound ?ref= (from a shared link), stash it, and strip it from
  // the URL before the router reads the location — keeps the canonical clean.
  captureReferral();

  // Load only the active language's strings before the first render — no flash of
  // untranslated keys, and the other language stays off the boot path.
  void bootI18n().then(() => {
    createRoot(rootEl).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });

  // Native shell bootstrap (no-op on the web). Deep links route through the
  // same data router the rest of the app uses.
  void initNative({ onDeepLink: (path) => void router.navigate(path) });

  // Field-measure Core Web Vitals (LCP/INP/CLS/FCP/TTFB) → analytics. Registers
  // early so nothing is missed; web-vitals is dynamic-imported (off the initial
  // bundle) and the call is a no-op off the web/prod path.
  reportWebVitals();
}
