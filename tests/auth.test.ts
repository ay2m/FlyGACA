import { describe, expect, it, vi } from 'vitest';
import { isBackendConfigured } from '@/lib/services/backend';
import {
  authChannel,
  isAuthAvailable,
  getIdToken,
  onAuthChange,
  signInWithGoogle,
} from '@/lib/services/auth';

// With no VITE_API_BASE_URL (the test/CI/preview case) there is no backend and
// every accessor degrades gracefully — the app stays local-first.
describe('auth without a backend configured', () => {
  it('reports unconfigured / unavailable', () => {
    expect(isBackendConfigured()).toBe(false);
    expect(isAuthAvailable()).toBe(false);
  });

  it('resolves no bearer token', async () => {
    expect(await getIdToken()).toBeNull();
  });

  it('onAuthChange calls back with null and returns an unsubscribe', async () => {
    const cb = vi.fn();
    const unsub = await onAuthChange(cb);
    expect(cb).toHaveBeenCalledWith(null);
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('sign-in throws auth-unavailable rather than calling a missing backend', async () => {
    await expect(signInWithGoogle()).rejects.toThrow('auth-unavailable');
  });

  it('reports the web auth channel under jsdom', () => {
    expect(authChannel()).toBe('web');
  });
});
