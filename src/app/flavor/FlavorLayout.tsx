import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FlavorHeader } from './FlavorHeader';
import { FlavorFooter } from './FlavorFooter';
import { ErrorBoundary } from '../ErrorBoundary';
import { ScrollToTop } from '../ScrollToTop';
import { RouteFallback } from '../RouteFallback';
import { PwaPrompts } from '../../components/pwa/PwaPrompts';

/**
 * Chrome for the standalone prep-app (flavor) builds — the Layout counterpart
 * with the full-app surfaces removed: no command palette (searches the whole
 * corpus/tools/chat), no analytics (the store listing truthfully declares
 * "Data Not Collected"), no onboarding tour, no account/bookmark sync.
 */
export function FlavorLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <ScrollToTop />
      <FlavorHeader />
      <main id="main" tabIndex={-1}>
        <div key={location.pathname} className="page-enter">
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <FlavorFooter />
      <PwaPrompts />
    </>
  );
}
