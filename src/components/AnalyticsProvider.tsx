import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { isVercelAnalyticsEnabled } from '@/lib/analytics';

/**
 * Vercel Web Analytics + Speed Insights wrapper. Only renders in production
 * on the web build, and only on a host that serves the Vercel beacon endpoints
 * (see `isVercelHost` in `@/lib/analytics`) — the native App Store builds stay
 * free of web beacons, dev/test never emit, and the GCP/Firebase/Netlify fronts
 * don't load scripts whose endpoints don't exist there.
 */
export function AnalyticsProvider() {
  if (!isVercelAnalyticsEnabled()) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
