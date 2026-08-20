/**
 * `src/lib/services/backend.ts` — the single transport every frontend service
 * calls through: `isBackendConfigured`, `apiUrl`, `ApiError`, `apiFetch`,
 * `apiTry` and the analytics shim.
 *
 * It sat at 30% statements / 18% branches, and the reason is structural rather
 * than an oversight: `tests/helpers/mockBackend.ts` replaces this exact module
 * for every service spec, so nothing ever exercised the real thing. On top of
 * that `isBackendConfigured()` deliberately returns false under Vitest, which
 * short-circuits `apiFetch` before it reaches `fetch` at all.
 *
 * So each test here re-imports the module with a clean registry under stubbed
 * env (`freshModule`), pretending to be a configured production build, and
 * stubs `fetch`. That makes the error mapping, the JSON envelope handling and
 * the local-first degradation assertable for the first time.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshModule } from './helpers/freshModule';

type Backend = typeof import('@/lib/services/backend');

/**
 * Load backend.ts as if this were a configured production build.
 *
 * `isBackendConfigured()` bails out when `process.env.NODE_ENV === 'test'` or
 * `import.meta.env.VITEST` is set, and the base URL is captured at module load —
 * so all three have to be in place before the import.
 */
async function loadConfigured(base = 'https://api.flygaca.com'): Promise<Backend> {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('VITEST', '');
  vi.stubEnv('VITE_API_BASE_URL', base);
  vi.stubEnv('VITE_API_SAME_ORIGIN', '');
  return freshModule<Backend>(() => import('@/lib/services/backend'));
}

/** Load it the way a contributor without a backend gets it. */
async function loadUnconfigured(): Promise<Backend> {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('VITEST', '');
  vi.stubEnv('VITE_API_BASE_URL', '');
  vi.stubEnv('VITE_API_SAME_ORIGIN', '');
  return freshModule<Backend>(() => import('@/lib/services/backend'));
}

/** A `fetch` returning one canned response. */
function stubFetch(init: { status?: number; body?: string }) {
  const fn = vi.fn().mockResolvedValue({
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    text: async () => init.body ?? '',
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('isBackendConfigured', () => {
  it('is true once an API origin is known', async () => {
    const { isBackendConfigured } = await loadConfigured();
    expect(isBackendConfigured()).toBe(true);
  });

  it('is true in same-origin mode with no base URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITEST', '');
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_SAME_ORIGIN', '1');
    const { isBackendConfigured } = await freshModule<Backend>(
      () => import('@/lib/services/backend'),
    );
    expect(isBackendConfigured()).toBe(true);
  });

  it('is false with no base URL and no same-origin opt-in — the local-first default', async () => {
    const { isBackendConfigured } = await loadUnconfigured();
    expect(isBackendConfigured()).toBe(false);
  });

  it('is false under the test runner however the env is set', async () => {
    // The guard that keeps a stray suite from talking to a real API.
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.flygaca.com');
    const { isBackendConfigured } = await freshModule<Backend>(
      () => import('@/lib/services/backend'),
    );
    expect(isBackendConfigured()).toBe(false);
  });
});

describe('apiUrl', () => {
  it('builds an absolute URL under the /api prefix', async () => {
    const { apiUrl } = await loadConfigured();
    expect(apiUrl('/auth/session')).toBe('https://api.flygaca.com/api/auth/session');
  });

  it('tolerates a path given without its leading slash', async () => {
    const { apiUrl } = await loadConfigured();
    expect(apiUrl('auth/session')).toBe('https://api.flygaca.com/api/auth/session');
  });

  it('strips trailing slashes from the configured origin', async () => {
    const { apiUrl } = await loadConfigured('https://api.flygaca.com///');
    expect(apiUrl('/x')).toBe('https://api.flygaca.com/api/x');
  });

  it('produces a same-origin path when no base URL is set', async () => {
    // Everything must stay under /api/* so the mirrors' rewrite and the strict
    // CSP (connect-src 'self') keep working.
    const { apiUrl } = await loadConfigured('');
    expect(apiUrl('/chat')).toBe('/api/chat');
  });
});

describe('ApiError', () => {
  it('carries the machine code and status, defaulting its message to the code', async () => {
    const { ApiError } = await loadConfigured();
    const err = new ApiError('auth/wrong-password', 401);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.code).toBe('auth/wrong-password');
    expect(err.status).toBe(401);
    expect(err.message).toBe('auth/wrong-password');
  });

  it('keeps an explicit message alongside the code', async () => {
    const { ApiError } = await loadConfigured();
    expect(new ApiError('invalid-argument', 400, 'seats must be positive').message).toBe(
      'seats must be positive',
    );
  });
});

describe('apiFetch', () => {
  it('sends credentials so the HttpOnly session cookie travels', async () => {
    const { apiFetch } = await loadConfigured();
    const fetchMock = stubFetch({ body: '{"ok":true}' });

    await apiFetch('/account/profile');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.flygaca.com/api/account/profile');
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('GET');
  });

  it('omits a JSON content-type and body on a bodyless request', async () => {
    const { apiFetch } = await loadConfigured();
    const fetchMock = stubFetch({ body: '{}' });

    await apiFetch('/account/profile');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('serializes a body and sets the JSON content-type', async () => {
    const { apiFetch } = await loadConfigured();
    const fetchMock = stubFetch({ body: '{"ok":true}' });

    await apiFetch('/auth/login', { method: 'POST', body: { email: 'a@b.com' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com' });
  });

  it('forwards an abort signal', async () => {
    const { apiFetch } = await loadConfigured();
    const fetchMock = stubFetch({ body: '{}' });
    const ctrl = new AbortController();

    await apiFetch('/x', { signal: ctrl.signal });

    expect(fetchMock.mock.calls[0][1].signal).toBe(ctrl.signal);
  });

  it('parses the JSON envelope', async () => {
    const { apiFetch } = await loadConfigured();
    stubFetch({ body: '{"plan":"pro","credits":50}' });

    await expect(apiFetch('/account/entitlement')).resolves.toEqual({ plan: 'pro', credits: 50 });
  });

  it('resolves to null for an empty body (a 204)', async () => {
    const { apiFetch } = await loadConfigured();
    stubFetch({ status: 204, body: '' });

    await expect(
      apiFetch('/feedback', { method: 'POST', body: { rating: 'up' } }),
    ).resolves.toBeNull();
  });

  it("throws the server's machine code on a non-2xx", async () => {
    // These are the codes calc/app/authError.ts maps to i18n keys, so preserving
    // them verbatim is what keeps the error-copy layer working.
    const { apiFetch, ApiError } = await loadConfigured();
    stubFetch({ status: 401, body: '{"error":"auth/wrong-password","message":"nope"}' });

    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toMatchObject({
      code: 'auth/wrong-password',
      status: 401,
      message: 'nope',
    });
    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to an http-<status> code when the server names none', async () => {
    const { apiFetch } = await loadConfigured();
    stubFetch({ status: 503, body: '{}' });

    await expect(apiFetch('/x')).rejects.toMatchObject({ code: 'http-503', status: 503 });
  });

  it('falls back to an http-<status> code when the error body is empty', async () => {
    const { apiFetch } = await loadConfigured();
    stubFetch({ status: 500, body: '' });

    await expect(apiFetch('/x')).rejects.toMatchObject({ code: 'http-500', status: 500 });
  });

  it('ignores a non-string error field rather than trusting it', async () => {
    const { apiFetch } = await loadConfigured();
    stubFetch({ status: 400, body: '{"error":{"nested":"object"},"message":42}' });

    await expect(apiFetch('/x')).rejects.toMatchObject({ code: 'http-400' });
  });

  it('throws backend-unavailable without calling fetch when unconfigured', async () => {
    const { apiFetch } = await loadUnconfigured();
    const fetchMock = stubFetch({ body: '{}' });

    await expect(apiFetch('/x')).rejects.toMatchObject({
      code: 'backend-unavailable',
      status: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates a network failure', async () => {
    const { apiFetch } = await loadConfigured();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiFetch('/x')).rejects.toThrow('Failed to fetch');
  });
});

describe('apiTry', () => {
  it('returns the parsed value when the call succeeds', async () => {
    const { apiTry } = await loadConfigured();
    stubFetch({ body: '{"seats":12}' });

    await expect(apiTry('/org/summary', {}, { seats: 0 })).resolves.toEqual({ seats: 12 });
  });

  it('returns the fallback on an API error rather than throwing', async () => {
    // The dashboard and grant paths must degrade to an empty state, not crash.
    const { apiTry } = await loadConfigured();
    stubFetch({ status: 403, body: '{"error":"permission-denied"}' });

    await expect(apiTry('/org/summary', {}, { seats: 0 })).resolves.toEqual({ seats: 0 });
  });

  it('returns the fallback on a network failure', async () => {
    const { apiTry } = await loadConfigured();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiTry('/org/summary', {}, null)).resolves.toBeNull();
  });

  it('returns the fallback without calling fetch when unconfigured', async () => {
    const { apiTry } = await loadUnconfigured();
    const fetchMock = stubFetch({ body: '{}' });

    await expect(apiTry('/org/summary', {}, { seats: 0 })).resolves.toEqual({ seats: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('logAnalyticsEvent', () => {
  it('forwards the event to gtag when GA is on the page', async () => {
    const { logAnalyticsEvent } = await loadConfigured();
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);

    await logAnalyticsEvent('checkout_started', { kind: 'pro' });

    expect(gtag).toHaveBeenCalledWith('event', 'checkout_started', { kind: 'pro' });
  });

  it('defaults the params to an empty object', async () => {
    const { logAnalyticsEvent } = await loadConfigured();
    const gtag = vi.fn();
    vi.stubGlobal('gtag', gtag);

    await logAnalyticsEvent('page_view');

    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {});
  });

  it('no-ops when gtag is absent', async () => {
    const { logAnalyticsEvent } = await loadConfigured();
    vi.stubGlobal('gtag', undefined);

    await expect(logAnalyticsEvent('x')).resolves.toBeUndefined();
  });

  it('swallows a gtag that throws — analytics never surfaces an error', async () => {
    const { logAnalyticsEvent } = await loadConfigured();
    vi.stubGlobal('gtag', () => {
      throw new Error('GA blew up');
    });

    await expect(logAnalyticsEvent('x')).resolves.toBeUndefined();
  });
});
