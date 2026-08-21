import { afterEach, describe, expect, it, vi } from 'vitest';

// The SDK is dynamic-imported by the module under test; these mocks stand in so
// the tests can observe whether (and with what) it was loaded.
const initializeApp = vi.fn(() => ({}));
const getAnalytics = vi.fn(() => ({}));
const logEvent = vi.fn();
const isSupported = vi.fn(async () => true);

vi.mock('firebase/app', () => ({ initializeApp }));
vi.mock('firebase/analytics', () => ({ getAnalytics, logEvent, isSupported }));

/** Fresh module instance per test — it keeps `started`/handle state at module level. */
async function loadModule() {
  vi.resetModules();
  return await import('@/lib/firebase-monitoring');
}

const settle = () => new Promise((r) => setTimeout(r, 20));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('initializeFirebaseMonitoring', () => {
  it('is inert outside production — the SDK is never even imported', async () => {
    const mod = await loadModule();
    mod.initializeFirebaseMonitoring();
    await settle();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('is inert in production without VITE_FIREBASE_APP_ID', async () => {
    vi.stubEnv('PROD', true);
    const mod = await loadModule();
    mod.initializeFirebaseMonitoring();
    await settle();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('lazily loads the SDK and logs app_start when configured', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');
    const mod = await loadModule();
    mod.initializeFirebaseMonitoring();
    await vi.waitFor(() => expect(logEvent).toHaveBeenCalled());
    expect(initializeApp).toHaveBeenCalledWith(expect.objectContaining({ appId: '1:123:web:abc' }));
    // logEvent(analytics, eventName, params) — the event name is the 2nd arg.
    expect(logEvent.mock.calls[0][1]).toBe('app_start');

    // Once analytics is up, the ErrorBoundary hook reports through it.
    mod.reportErrorToFirebase(new Error('boom'), { where: 'test' });
    const exception = logEvent.mock.calls.find((c) => c[1] === 'exception');
    expect(exception?.[2]).toMatchObject({ description: 'boom', where: 'test', fatal: false });
  });

  it('bails quietly where analytics is unsupported', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');
    isSupported.mockResolvedValueOnce(false);
    const mod = await loadModule();
    mod.initializeFirebaseMonitoring();
    await settle();
    expect(initializeApp).not.toHaveBeenCalled();
  });
});

describe('reportErrorToFirebase', () => {
  it('never throws before initialization and reports nothing', async () => {
    const mod = await loadModule();
    expect(() => mod.reportErrorToFirebase(new Error('early'))).not.toThrow();
    expect(logEvent).not.toHaveBeenCalled();
  });
});
