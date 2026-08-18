import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/** Resets the window scroll to the top on every route change and moves keyboard /
 *  screen-reader focus to the `#main` landmark so an in-place SPA navigation is
 *  announced (a screen reader otherwise gets no signal that the page changed).
 *  Without the scroll reset a new page would open at the previous scroll offset
 *  (often the footer).
 *
 *  Keys on `pathname` only — hash/search changes are left alone so in-page anchor
 *  jumps and query-string calculator state keep working. The scroll jump is
 *  instant (`behavior: 'auto'`) to bypass the global `html { scroll-behavior:
 *  smooth }`, which would otherwise animate a long scroll on every navigation. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const firstRun = useRef(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // Skip the initial load / deep link so focus stays natural on first paint and
    // we don't fight the browser; only move focus on subsequent in-app navigations.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    // `preventScroll` — the scrollTo above already placed the viewport. Programmatic
    // focus on a tabIndex=-1 landmark doesn't trigger :focus-visible, so no ring.
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
