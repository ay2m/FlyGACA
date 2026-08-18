/**
 * Auth surface. Backed by the first-party API (`server/`) when configured; a
 * no-op when not — every method degrades gracefully so the local-first account
 * store (`account.ts`) keeps working without a backend.
 *
 * The session is an HttpOnly cookie set by the server, so nothing sensitive is
 * held in JS. There is no real-time listener as there was with the Firebase SDK:
 * `onAuthChange` fetches the session once, then re-notifies subscribers whenever
 * this module mutates auth state or the tab regains focus.
 *
 * Server errors arrive as the same `auth/*` codes the Firebase SDK emitted, so
 * `calc/app/authError.ts` and its i18n keys map them unchanged.
 */
import { isNative } from '@/lib/native/nativeBridge';
import { isBackendConfigured, apiFetch, apiUrl, ApiError } from '@/lib/services/backend';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

interface SessionResponse {
  user: AuthUser | null;
}

/** Where sign-in is handled for the current runtime. */
export function authChannel(): 'native' | 'web' {
  return isNative() ? 'native' : 'web';
}

/** True when a real auth backend is available (API base URL present). */
export function isAuthAvailable(): boolean {
  return isBackendConfigured();
}

type Listener = (user: AuthUser | null) => void;

const listeners = new Set<Listener>();
let current: AuthUser | null = null;
let sessionPromise: Promise<AuthUser | null> | null = null;

function emit(user: AuthUser | null): void {
  current = user;
  for (const cb of listeners) cb(user);
}

/** Fetch (and memoize) the current session. Resolves `null` when signed out. */
async function fetchSession(force = false): Promise<AuthUser | null> {
  if (!isBackendConfigured()) return null;
  if (force) sessionPromise = null;
  sessionPromise ??= apiFetch<SessionResponse>('/auth/session')
    .then((r) => r.user ?? null)
    .catch(() => null);
  const user = await sessionPromise;
  current = user;
  return user;
}

/**
 * The bearer token for the current session, used by the native shell where a
 * cross-origin cookie is unreliable. Returns `null` on web — there the cookie
 * travels with `credentials: 'include'` and no token is needed.
 */
export async function getIdToken(): Promise<string | null> {
  if (!isBackendConfigured() || !isNative()) return null;
  const r = await apiFetch<{ token: string | null }>('/auth/token').catch(() => null);
  return r?.token ?? null;
}

/**
 * Subscribe to auth changes. Calls back with the current user as soon as the
 * session resolves (immediately with `null` when unconfigured), then on every
 * subsequent sign-in/sign-out and on tab refocus.
 */
export async function onAuthChange(cb: Listener): Promise<() => void> {
  if (!isBackendConfigured()) {
    cb(null);
    return () => {};
  }

  listeners.add(cb);
  const revalidate = () => {
    void fetchSession(true).then((u) => {
      if (u?.uid !== current?.uid) emit(u);
    });
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', revalidate);
  }

  cb(await fetchSession());

  return () => {
    listeners.delete(cb);
    if (typeof window !== 'undefined') window.removeEventListener('focus', revalidate);
  };
}

function requireBackend(): void {
  if (!isBackendConfigured()) throw new ApiError('auth-unavailable', 0);
}

/**
 * Google sign-in. The OAuth dance is server-side (the API owns the client secret),
 * so this is a full-page navigation to `/api/auth/google/start` and the promise
 * never resolves with a user — the app re-bootstraps on the callback redirect and
 * `onAuthChange` emits the signed-in user then.
 */
export async function signInWithGoogle(): Promise<AuthUser | null> {
  requireBackend();
  const returnTo = typeof window !== 'undefined' ? window.location.href : '/';
  window.location.assign(
    `${apiUrl('/auth/google/start')}?returnTo=${encodeURIComponent(returnTo)}`,
  );
  return null;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  requireBackend();
  const { user } = await apiFetch<SessionResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!user) throw new ApiError('auth/invalid-credential', 401);
  sessionPromise = Promise.resolve(user);
  emit(user);
  return user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthUser> {
  requireBackend();
  const { user } = await apiFetch<SessionResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, displayName },
  });
  if (!user) throw new ApiError('auth/internal-error', 500);
  sessionPromise = Promise.resolve(user);
  emit(user);
  return user;
}

export async function signOutUser(): Promise<void> {
  if (!isBackendConfigured()) return;
  await apiFetch<unknown>('/auth/logout', { method: 'POST' }).catch(() => null);
  sessionPromise = Promise.resolve(null);
  emit(null);
}

/** Email the user a password-reset link. Throws `auth-unavailable` when unconfigured. */
export async function sendPasswordReset(email: string): Promise<void> {
  requireBackend();
  await apiFetch<unknown>('/auth/password-reset', { method: 'POST', body: { email } });
}

/** Re-send the verification email to the current user (no-op when signed out). */
export async function resendEmailVerification(): Promise<void> {
  requireBackend();
  if (!(await fetchSession())) return;
  await apiFetch<unknown>('/auth/verify-email/resend', { method: 'POST' });
}
