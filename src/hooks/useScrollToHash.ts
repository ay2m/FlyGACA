import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls the URL-hash anchor into view once the page's content exists.
 * Route chunks are lazy and ScrollToTop resets the window on every pathname
 * change, so the browser's native on-load anchor jump always misses — each
 * long-form page re-runs the jump itself after it has rendered its headings
 * (the headings' scroll-margin-block-start keeps them clear of the header).
 * Pass `ready` when content arrives async; it defaults to true for pages
 * whose sections render synchronously on mount.
 */
export function useScrollToHash(ready: unknown = true) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [ready, hash]);
}
