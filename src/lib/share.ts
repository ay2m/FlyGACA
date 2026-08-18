/**
 * Sharing + lightweight referral attribution.
 *
 * Every share appends `?ref=<source>` so an inbound visit from a shared link is
 * attributable, and `captureReferral()` (called once at boot) reads that param,
 * stashes it, strips it from the URL, and emits a best-effort analytics event.
 * Built on the existing native-bridge `share()` (native sheet → Web Share →
 * clipboard). Decoupled from any specific analytics vendor via the backend's
 * best-effort `logAnalyticsEvent`.
 */
import { share, type ShareResult } from '@/lib/native/nativeBridge';

/** Which surface a link was shared from. */
export type ShareSource = 'tool' | 'library' | 'chat';

const REF_KEY = 'flygaca:ref';

/** Return `url` with `?ref=<source>` merged in, preserving existing query + hash. */
export function withRef(url: string, source: ShareSource): string {
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('ref', source);
    return u.toString();
  } catch {
    return url;
  }
}

/** Share the current page, tagged with the referral source. Returns how the
 *  share resolved ('shared' or 'copied') so callers can show the right feedback. */
export function shareCurrent(
  source: ShareSource,
  opts: { title?: string; text?: string } = {},
): Promise<ShareResult> {
  return share({ ...opts, url: withRef(window.location.href, source) });
}

/** The referral source captured this session, if any (for later conversion
 *  attribution — e.g. tagging a sign-up with where the visitor came from). */
export function getReferralSource(): string | null {
  try {
    return sessionStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

/**
 * Read `?ref=` once at boot: stash it for the session, strip only that param
 * from the URL (keeping `?lang`, tool state, and the hash), and emit a
 * best-effort analytics event. No-op when there's no `ref`. Web-side; safe to
 * call before the first render.
 */
export function captureReferral(): void {
  if (typeof window === 'undefined') return;
  let ref: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    ref = params.get('ref');
    if (!ref) return;

    try {
      sessionStorage.setItem(REF_KEY, ref);
    } catch {
      /* storage unavailable — attribution is best-effort */
    }

    // Strip only `ref`, leaving every other param and the hash intact.
    params.delete('ref');
    const query = params.toString();
    const clean = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
    window.history.replaceState(null, '', clean);
  } catch {
    return;
  }

  // Best-effort, lazily-loaded so the analytics path never enters the boot chunk.
  void import('@/lib/services/backend')
    .then((m) => m.logAnalyticsEvent('referral_landing', { ref }))
    .catch(() => {});
}
