/**
 * Capacitor native-bridge adapter. On the web every entry point is inert (or
 * falls back to a web API); inside the iOS/Android shell it drives the native
 * chrome (status bar, splash, safe-area class), routes the Android hardware
 * back button and deep links, and persists through the Preferences plugin.
 *
 * Plugins are loaded with dynamic import() behind an `isNative()` guard so the
 * web build only ships `@capacitor/core`, never the native plugin code.
 */
import { Capacitor } from '@capacitor/core';

/** True when running inside the native Capacitor shell. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** 'ios' | 'android' | 'web'. */
export function platform(): string {
  return Capacitor.getPlatform();
}

/** Billing flavour: iOS uses RevenueCat IAP; web uses Moyasar checkout. */
export function billingChannel(): 'revenuecat' | 'moyasar' {
  return platform() === 'ios' ? 'revenuecat' : 'moyasar';
}

interface InitOptions {
  /** Navigate the SPA router in response to a deep link (custom scheme / app URL). */
  onDeepLink?: (path: string) => void;
}

/**
 * One-time native bootstrap, called from main.tsx. No-op on the web.
 * Configures the status bar, hides the splash once the shell is ready, marks
 * the document so CSS can apply safe-area insets, and wires the back button +
 * deep links.
 */
export async function initNative({ onDeepLink }: InitOptions = {}): Promise<void> {
  if (!isNative()) return;

  document.documentElement.classList.add('is-native', `platform-${platform()}`);

  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
  ]);

  // The app is dark-first (Falcon palette), so request light status-bar glyphs.
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  if (platform() === 'android') {
    await StatusBar.setBackgroundColor({ color: '#0A0E12' }).catch(() => {});
  }
  await SplashScreen.hide().catch(() => {});

  // Android hardware back: walk SPA history, exit at the root.
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) window.history.back();
    else void App.exitApp();
  });

  // Deep links: turn an incoming app URL into an in-app route.
  void App.addListener('appUrlOpen', ({ url }) => {
    const path = toAppPath(url);
    if (path && onDeepLink) onDeepLink(path);
  });
}

/** Extract the in-app path from a deep-link URL (custom scheme or universal link). */
export function toAppPath(url: string): string | null {
  try {
    const u = new URL(url);
    // Universal/app links (https://flygaca.com/library/...) — the path is intact.
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return `${u.pathname}${u.search}${u.hash}` || '/';
    }
    // Custom scheme (com.flygaca.app://library/part-1) — URL parsing folds the
    // first segment into the host, so recover the path from the raw string.
    const rest = url.slice(url.indexOf('://') + 3);
    return rest.startsWith('/') ? rest : `/${rest}`;
  } catch {
    return null;
  }
}

/**
 * Key/value persistence. Uses the Preferences plugin on native (survives
 * WebView storage eviction) and localStorage on the web.
 */
export const nativeStore = {
  async get(key: string): Promise<string | null> {
    if (!isNative()) return localStorage.getItem(key);
    const { Preferences } = await import('@capacitor/preferences');
    return (await Preferences.get({ key })).value;
  },
  async set(key: string, value: string): Promise<void> {
    if (!isNative()) {
      localStorage.setItem(key, value);
      return;
    }
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  },
  async remove(key: string): Promise<void> {
    if (!isNative()) {
      localStorage.removeItem(key);
      return;
    }
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  },
};

/** How a share resolved: the OS/browser sheet handled it, or we fell back to
 *  copying the link to the clipboard. */
export type ShareResult = 'shared' | 'copied';

/** Share a link via the native sheet, the Web Share API, or clipboard fallback.
 *  Returns how it resolved so callers can give the right feedback (e.g. a tool
 *  page showing "Link copied" when the desktop clipboard fallback runs). */
export async function share(opts: {
  title?: string;
  text?: string;
  url: string;
}): Promise<ShareResult> {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    await Share.share(opts);
    return 'shared';
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(opts);
      return 'shared';
    } catch (err) {
      // The user dismissed the sheet — it was shown, so don't force a copy.
      if (err instanceof Error && err.name === 'AbortError') return 'shared';
      // Otherwise the Web Share call failed — fall through to the clipboard.
    }
  }
  await navigator.clipboard?.writeText(opts.url).catch(() => {});
  return 'copied';
}

/** Open an external URL in the in-app browser (native) or a new tab (web). */
export async function openExternal(url: string): Promise<void> {
  if (isNative()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener');
}
