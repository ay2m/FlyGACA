import { lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Footer } from './Footer';
import { ErrorBoundary } from './ErrorBoundary';
import { ScrollToTop } from './ScrollToTop';
import { RouteFallback } from './RouteFallback';
import { ScrollProgress } from '@/components/ScrollProgress';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { PwaPrompts } from '@/components/pwa/PwaPrompts';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { useTourOpen } from '@/lib/prefs/onboardingPrefs';

// Lazy so the modal + its CSS stay out of the initial bundle (160 kB budget) —
// only fetched on a genuine first visit to the home route.
const OnboardingTour = lazy(() => import('@/components/onboarding/OnboardingTour'));
import { useOfflineBookmarkSync } from '@/hooks/useOfflineSync';

/** The shared chrome: header + routed page + footer. Replaces the legacy
 *  build-chrome.js stamper — the chrome is now a component, never copied.
 *  The Suspense boundary covers lazily code-split route chunks.
 *  The keyed wrapper div restarts the global page-enter CSS animation on
 *  every route change — zero bundle cost, prefers-reduced-motion aware. */
export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();

  // The welcome tour is on-demand — opened from the dismissible Home hint or the
  // Settings "replay" — so it never auto-covers the hero on a first visit.
  const showTour = useTourOpen();
  useOfflineBookmarkSync();

  return (
    <>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <ScrollToTop />
      <CommandPalette />
      <Header />
      {/* After Header: equal z-index, so DOM order keeps the bar visible on top. */}
      <ScrollProgress />
      <main id="main" tabIndex={-1}>
        <div key={location.pathname} className="page-enter">
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <Footer />
      <PwaPrompts />
      <AnalyticsProvider />
      {showTour && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}
    </>
  );
}
