import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetBackend } from './helpers/mockBackend';

/**
 * The configured (backend-on) branches of the auth surface. The unconfigured
 * graceful-degradation paths live in auth.test.ts; here the API is mocked so the
 * Google redirect, email sign-in/registration, sign-out, reset and verification
 * flows are exercised, along with the `onAuthChange` binding and the wire → AuthUser
 * mapping.
 */
const h = vi.hoisted(() => ({
  configured: true,
  responses: {} as Record<string, unknown>,
  error: null as Error | null,
  calls: [] as Array<{ path: string; method: string; body?: unknown }>,
  events: [] as Array<{ name: string; params?: Record<string, unknown> }>,
  native: false,
}));

vi.mock('@/lib/native/nativeBridge', () => ({ isNative: () => h.native }));

vi.mock('@/lib/services/backend', async () => {
  const { makeBackendModule } = await import('./helpers/mockBackend');
  return makeBackendModule(h);
});

const USER = {
  uid: 'u1',
  email: 'cap@example.com',
  displayName: 'Cap',
  emailVerified: true,
};

type AuthModule = typeof import('@/lib/services/auth');

/** Fresh module each time — the session is memoized per module instance. */
async function load(): Promise<AuthModule> {
  vi.resetModules();
  return import('@/lib/services/auth');
}

beforeEach(() => {
  resetBackend(h);
  h.native = false;
  vi.clearAllMocks();
});

describe('onAuthChange', () => {
  it('emits the session user and returns a working unsubscribe', async () => {
    h.responses['/auth/session'] = { user: USER };
    const { onAuthChange } = await load();

    const cb = vi.fn();
    const unsub = await onAuthChange(cb);

    expect(cb).toHaveBeenCalledWith(USER);
    expect(h.calls[0].path).toBe('/auth/session');
    expect(() => unsub()).not.toThrow();
  });

  it('emits null when the session is anonymous', async () => {
    h.responses['/auth/session'] = { user: null };
    const { onAuthChange } = await load();

    const cb = vi.fn();
    await onAuthChange(cb);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('emits null rather than throwing when the session request fails', async () => {
    h.error = new Error('offline');
    const { onAuthChange } = await load();

    const cb = vi.fn();
    await onAuthChange(cb);
    expect(cb).toHaveBeenCalledWith(null);
  });
});

describe('email sign-in and registration', () => {
  it('signInWithEmail posts credentials and returns the mapped user', async () => {
    h.responses['/auth/login'] = { user: USER };
    const { signInWithEmail } = await load();

    await expect(signInWithEmail('cap@example.com', 'hunter2hunter2')).resolves.toEqual(USER);
    expect(h.calls).toContainEqual({
      path: '/auth/login',
      method: 'POST',
      body: { email: 'cap@example.com', password: 'hunter2hunter2' },
    });
  });

  it('signInWithEmail surfaces the server error code for the UI to map', async () => {
    h.error = new Error('auth/invalid-credential');
    const { signInWithEmail } = await load();

    await expect(signInWithEmail('cap@example.com', 'wrong')).rejects.toThrow(
      'auth/invalid-credential',
    );
  });

  it('registerWithEmail forwards the display name', async () => {
    h.responses['/auth/register'] = { user: USER };
    const { registerWithEmail } = await load();

    await expect(
      registerWithEmail('cap@example.com', 'hunter2hunter2', 'Cap'),
    ).resolves.toEqual(USER);
    expect(h.calls).toContainEqual({
      path: '/auth/register',
      method: 'POST',
      body: { email: 'cap@example.com', password: 'hunter2hunter2', displayName: 'Cap' },
    });
  });

  it('a session established by sign-in is emitted to onAuthChange subscribers', async () => {
    h.responses['/auth/session'] = { user: null };
    h.responses['/auth/login'] = { user: USER };
    const { onAuthChange, signInWithEmail } = await load();

    const cb = vi.fn();
    await onAuthChange(cb);
    expect(cb).toHaveBeenLastCalledWith(null);

    await signInWithEmail('cap@example.com', 'hunter2hunter2');
    expect(cb).toHaveBeenLastCalledWith(USER);
  });
});

describe('Google sign-in', () => {
  it('navigates to the server-side OAuth start with a returnTo', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'https://flygaca.com/account', assign },
    });

    const { signInWithGoogle } = await load();
    // Resolves null: the page navigates away and the session lands on the callback.
    await expect(signInWithGoogle()).resolves.toBeNull();

    expect(assign).toHaveBeenCalledTimes(1);
    const url = assign.mock.calls[0][0] as string;
    expect(url).toContain('/api/auth/google/start');
    expect(url).toContain(`returnTo=${encodeURIComponent('https://flygaca.com/account')}`);
  });
});

describe('sign-out, reset and verification', () => {
  it('signOutUser posts to /auth/logout and emits null', async () => {
    h.responses['/auth/session'] = { user: USER };
    const { onAuthChange, signOutUser } = await load();

    const cb = vi.fn();
    await onAuthChange(cb);
    await signOutUser();

    expect(h.calls).toContainEqual({ path: '/auth/logout', method: 'POST', body: undefined });
    expect(cb).toHaveBeenLastCalledWith(null);
  });

  it('signOutUser swallows a transport failure', async () => {
    h.error = new Error('offline');
    const { signOutUser } = await load();
    await expect(signOutUser()).resolves.toBeUndefined();
  });

  it('sendPasswordReset posts the address', async () => {
    const { sendPasswordReset } = await load();
    await sendPasswordReset('cap@example.com');
    expect(h.calls).toContainEqual({
      path: '/auth/password-reset',
      method: 'POST',
      body: { email: 'cap@example.com' },
    });
  });

  it('resendEmailVerification no-ops when signed out', async () => {
    h.responses['/auth/session'] = { user: null };
    const { resendEmailVerification } = await load();

    await resendEmailVerification();
    expect(h.calls.some((c) => c.path === '/auth/verify-email/resend')).toBe(false);
  });

  it('resendEmailVerification posts when a session exists', async () => {
    h.responses['/auth/session'] = { user: USER };
    const { resendEmailVerification } = await load();

    await resendEmailVerification();
    expect(h.calls).toContainEqual({
      path: '/auth/verify-email/resend',
      method: 'POST',
      body: undefined,
    });
  });
});

describe('getIdToken', () => {
  it('returns null on web — the cookie carries the session, not a token', async () => {
    const { getIdToken } = await load();
    expect(await getIdToken()).toBeNull();
    expect(h.calls.some((c) => c.path === '/auth/token')).toBe(false);
  });

  it('fetches a bearer token in the native shell', async () => {
    h.native = true;
    h.responses['/auth/token'] = { token: 'bearer-123' };
    const { getIdToken } = await load();

    expect(await getIdToken()).toBe('bearer-123');
  });

  it('resolves null in the native shell when the token request fails', async () => {
    h.native = true;
    h.error = new Error('offline');
    const { getIdToken } = await load();

    expect(await getIdToken()).toBeNull();
  });
});
