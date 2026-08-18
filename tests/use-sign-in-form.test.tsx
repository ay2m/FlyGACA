import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { AUTH_TIMEOUT_MS, useSignInForm } from '@/hooks/useSignInForm';
import {
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/services/auth';
import { isMirrorHost } from '@/lib/seo/seo';

vi.mock('@/lib/services/auth', () => ({
  signInWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendPasswordReset: vi.fn(),
}));
vi.mock('@/lib/seo/seo', () => ({
  SITE_ORIGIN: 'https://flygaca.com',
  isMirrorHost: vi.fn(() => false),
}));

/** Reject the mocked Google sign-in with a Firebase-shaped error code. */
function rejectGoogle(code: string) {
  vi.mocked(signInWithGoogle).mockRejectedValueOnce({ code });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isMirrorHost).mockReturnValue(false);
});
afterEach(cleanup);

describe('useSignInForm', () => {
  it('runs Google sign-in and clears busy with no error on success', async () => {
    vi.mocked(signInWithGoogle).mockResolvedValueOnce(undefined as never);
    const { result } = renderHook(() => useSignInForm());
    await act(async () => {
      result.current.runGoogle();
    });
    expect(signInWithGoogle).toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
    expect(result.current.errors.general).toBeUndefined();
  });

  it('surfaces a timeout error and clears busy when the auth call never settles', async () => {
    vi.useFakeTimers();
    // The App Check / reCAPTCHA hang: the SDK promise never resolves or rejects.
    vi.mocked(signInWithGoogle).mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useSignInForm());
    act(() => {
      result.current.runGoogle();
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS);
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.errors.general).toBeTruthy();
    vi.useRealTimers();
  });

  it('bails silently when the user dismisses the popup', async () => {
    rejectGoogle('auth/popup-closed-by-user');
    const { result } = renderHook(() => useSignInForm());
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.errors.general).toBeUndefined();
    expect(result.current.busy).toBe(false);
  });

  it('surfaces a general error (and logs) for an unknown code', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    rejectGoogle('auth/something-unmapped');
    const { result } = renderHook(() => useSignInForm());
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.errors.general).toBeTruthy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('routes a field-mapped code to that field, not the general band', async () => {
    rejectGoogle('auth/user-not-found'); // maps to the email field
    const { result } = renderHook(() => useSignInForm());
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.general).toBeUndefined();
  });

  it('offers the main-site link only on a domain error from a mirror host', async () => {
    vi.mocked(isMirrorHost).mockReturnValue(true);
    rejectGoogle('auth/unauthorized-domain');
    const { result } = renderHook(() => useSignInForm());
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.mainSiteHref).toMatch(/^https:\/\/flygaca\.com/);
    expect(result.current.errors.general).toBeTruthy();
  });

  it('does not offer the main-site link on a non-mirror host', async () => {
    vi.mocked(isMirrorHost).mockReturnValue(false);
    rejectGoogle('auth/unauthorized-domain');
    const { result } = renderHook(() => useSignInForm());
    await act(async () => {
      result.current.runGoogle();
    });
    expect(result.current.mainSiteHref).toBeNull();
  });

  it('toggles between sign-in and sign-up after the animation delay', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSignInForm());
    expect(result.current.mode).toBe('in');
    act(() => result.current.toggleMode());
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.mode).toBe('up');
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.animating).toBe(false);
    vi.useRealTimers();
  });

  it('forgotPassword needs an email first, then sends the reset', async () => {
    const { result } = renderHook(() => useSignInForm());

    // No email entered → a field error, no reset call.
    act(() => result.current.forgotPassword());
    expect(sendPasswordReset).not.toHaveBeenCalled();
    expect(result.current.loginForm.errors.email).toBeTruthy();

    // With an email → the reset is sent and a notice shown.
    vi.mocked(sendPasswordReset).mockResolvedValueOnce(undefined as never);
    act(() => result.current.loginForm.setFieldValue('email', 'you@example.com'));
    await act(async () => {
      result.current.forgotPassword();
    });
    expect(sendPasswordReset).toHaveBeenCalledWith('you@example.com');
    await waitFor(() => expect(result.current.notice).toBeTruthy());
  });

  it('submits a valid sign-in to signInWithEmail', async () => {
    vi.mocked(signInWithEmail).mockResolvedValueOnce(undefined as never);
    const { result } = renderHook(() => useSignInForm());
    act(() => {
      result.current.loginForm.setFieldValue('email', 'you@example.com');
      result.current.loginForm.setFieldValue('password', 'secret');
    });
    await act(async () => {
      await result.current.loginForm.handleSubmit();
    });
    expect(signInWithEmail).toHaveBeenCalledWith('you@example.com', 'secret');
  });

  it('submits a valid sign-up to registerWithEmail (trimmed name)', async () => {
    vi.mocked(registerWithEmail).mockResolvedValueOnce(undefined as never);
    const { result } = renderHook(() => useSignInForm());
    act(() => {
      result.current.signupForm.setFieldValue('name', ' Sam ');
      result.current.signupForm.setFieldValue('email', 'sam@example.com');
      result.current.signupForm.setFieldValue('password', 'Abcdef1!');
      result.current.signupForm.setFieldValue('confirmPassword', 'Abcdef1!');
    });
    await act(async () => {
      await result.current.signupForm.handleSubmit();
    });
    expect(registerWithEmail).toHaveBeenCalledWith('sam@example.com', 'Abcdef1!', 'Sam');
  });

  it('blocks a weak-password sign-up and a mismatched confirm before submitting', async () => {
    const { result } = renderHook(() => useSignInForm());
    act(() => {
      result.current.signupForm.setFieldValue('name', 'Sam');
      result.current.signupForm.setFieldValue('email', 'sam@example.com');
      result.current.signupForm.setFieldValue('password', 'weakpass');
      result.current.signupForm.setFieldValue('confirmPassword', 'different');
    });
    await act(async () => {
      await result.current.signupForm.handleSubmit();
    });
    expect(result.current.signupForm.errors.password).toBeTruthy();
    expect(result.current.signupForm.errors.confirmPassword).toBeTruthy();
    expect(registerWithEmail).not.toHaveBeenCalled();
  });
});
