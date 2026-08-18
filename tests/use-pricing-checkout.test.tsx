import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { usePricingCheckout } from '@/hooks/usePricingCheckout';
import { startBundleCheckout, startProCheckout } from '@/lib/services/billing';
import { useAccount } from '@/lib/services/account';
import type { Entitlement } from '@/lib/services/entitlements';

const navigateSpy = vi.fn();
vi.mock('react-router', async (orig) => ({
  ...(await orig<typeof import('react-router')>()),
  useNavigate: () => navigateSpy,
}));
vi.mock('@/lib/services/billing', () => ({
  startProCheckout: vi.fn(),
  startBundleCheckout: vi.fn(),
}));
vi.mock('@/lib/services/account', () => ({ useAccount: vi.fn() }));
vi.mock('@/lib/services/referral', () => ({
  captureRefFromUrl: vi.fn(),
  getStoredRef: () => undefined,
}));
vi.mock('@/lib/services/promo', () => ({
  capturePromoFromUrl: vi.fn(),
  getStoredPromo: () => undefined,
}));

const future = new Date(Date.now() + 30 * 86400000).toISOString();

function setPlan(entitlement: Entitlement | null) {
  vi.mocked(useAccount).mockReturnValue({ entitlement } as unknown as ReturnType<
    typeof useAccount
  >);
}

function wrapper(entry = '/pricing') {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  navigateSpy.mockClear();
  vi.mocked(startProCheckout).mockReset();
  vi.mocked(startBundleCheckout).mockReset();
  setPlan(null);
});
afterEach(cleanup);

describe('usePricingCheckout', () => {
  it('defaults to annual and starts a Pro checkout with the stored options', async () => {
    vi.mocked(startProCheckout).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => usePricingCheckout(), { wrapper: wrapper() });
    expect(result.current.annual).toBe(true);

    await act(async () => {
      await result.current.checkout('annual');
    });
    expect(startProCheckout).toHaveBeenCalledWith('annual', {
      annual: true,
      ref: undefined,
      promo: undefined,
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.errorKind).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('passes the current cycle after the toggle flips', async () => {
    vi.mocked(startProCheckout).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => usePricingCheckout(), { wrapper: wrapper() });
    act(() => result.current.setAnnual(false));
    await act(async () => {
      await result.current.checkout('monthly');
    });
    expect(startProCheckout).toHaveBeenCalledWith('monthly', {
      annual: false,
      ref: undefined,
      promo: undefined,
    });
  });

  it('routes to the account page on sign-in-required (no error notice)', async () => {
    vi.mocked(startProCheckout).mockRejectedValue(new Error('sign-in-required'));
    const { result } = renderHook(() => usePricingCheckout(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.checkout('annual');
    });
    expect(navigateSpy).toHaveBeenCalledWith('/account');
    expect(result.current.errorKind).toBeNull();
  });

  it('surfaces the student-verify and generic error kinds', async () => {
    const { result } = renderHook(() => usePricingCheckout(), { wrapper: wrapper() });

    vi.mocked(startProCheckout).mockRejectedValueOnce(new Error('student-verification-required'));
    await act(async () => {
      await result.current.checkout('student');
    });
    expect(result.current.errorKind).toBe('student-verify');

    vi.mocked(startProCheckout).mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.checkout('annual');
    });
    expect(result.current.errorKind).toBe('generic');
  });

  it('buyBundle routes on sign-in and is otherwise always generic (never student-verify)', async () => {
    const { result } = renderHook(() => usePricingCheckout(), { wrapper: wrapper() });

    vi.mocked(startBundleCheckout).mockRejectedValueOnce(new Error('sign-in-required'));
    await act(async () => {
      await result.current.buyBundle();
    });
    expect(navigateSpy).toHaveBeenCalledWith('/account');

    // Even a student-verification code can't put the bundle into the student-verify state.
    vi.mocked(startBundleCheckout).mockRejectedValueOnce(
      new Error('student-verification-required'),
    );
    await act(async () => {
      await result.current.buyBundle();
    });
    expect(result.current.errorKind).toBe('generic');
  });

  it('derives plan and isPaid from the account entitlement', () => {
    setPlan(null);
    const free = renderHook(() => usePricingCheckout(), { wrapper: wrapper() });
    expect(free.result.current.plan).toBe('free');
    expect(free.result.current.isPaid).toBe(false);
    free.unmount();

    setPlan({ plan: 'pro', expiresAt: future, source: 'moyasar' });
    const pro = renderHook(() => usePricingCheckout(), { wrapper: wrapper() });
    expect(pro.result.current.plan).toBe('pro');
    expect(pro.result.current.isPaid).toBe(true);
  });

  it('acknowledges ?checkout=cancel and clears it on dismiss', async () => {
    const { result } = renderHook(() => usePricingCheckout(), {
      wrapper: wrapper('/pricing?checkout=cancel'),
    });
    expect(result.current.showCanceled).toBe(true);
    act(() => result.current.dismissCanceled());
    await waitFor(() => expect(result.current.showCanceled).toBe(false));
  });
});
