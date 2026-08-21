import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from './helpers/render';

/**
 * The mocked checkout loop — the leg the e2e layer cannot drive. The Playwright
 * build has no `VITE_API_BASE_URL`, so `apiFetch` throws before any network
 * mock could intercept (e2e/checkout.spec.ts pins that degradation instead).
 * Here the backend and auth services are mocked and `window.Moyasar` stubbed,
 * so the start leg (price server-side → mount the hosted widget → surface a
 * promo note) and the return leg (confirm → navigate onward) are both driven.
 */

const apiFetch = vi.fn();
const getCurrentUser = vi.fn();

vi.mock('@/lib/services/backend', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/services/backend')>();
  return { ...mod, apiFetch: (...a: unknown[]) => apiFetch(...a) };
});
vi.mock('@/lib/services/auth', () => ({
  getCurrentUser: () => getCurrentUser(),
}));

const { Checkout } = await import('@/pages/checkout/Checkout');

const CONFIG = {
  checkoutId: 'chk_1',
  amount: 9900,
  listAmount: 12900,
  promoApplied: 'FALCON20',
  currency: 'SAR',
  description: 'Fly GACA Pro',
  callbackUrl: 'https://flygaca.com/checkout/return',
  methods: ['creditcard'],
  saveCard: false,
  supportedNetworks: ['visa', 'mastercard', 'mada'],
};

const moyasarInit = vi.fn();

beforeEach(() => {
  vi.stubEnv('VITE_MOYASAR_PUBLISHABLE_KEY', 'pk_test_123');
  // Pre-setting the global makes loadWidgetAssets resolve without touching the
  // network (it short-circuits when window.Moyasar already exists).
  window.Moyasar = { init: moyasarInit };
  getCurrentUser.mockResolvedValue({ uid: 'u1' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  delete window.Moyasar;
});

describe('Checkout — start leg (?kind=)', () => {
  it('prices server-side, mounts the Moyasar widget and names the promo saving', async () => {
    apiFetch.mockResolvedValue(CONFIG);
    renderWithRouter(<Checkout />, { route: '/checkout?kind=pro&promo=FALCON20' });

    await waitFor(() => expect(moyasarInit).toHaveBeenCalled());

    // The server prices it — the client passes the code string, never a price.
    expect(apiFetch).toHaveBeenCalledWith(
      '/billing/checkout-config',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ kind: 'pro', promo: 'FALCON20' }),
      }),
    );

    const init = moyasarInit.mock.calls[0][0] as Record<string, unknown>;
    expect(init.amount).toBe(9900);
    expect(init.publishable_api_key).toBe('pk_test_123');
    // kind rides the callback URL for the return leg's convenience only.
    expect(String(init.callback_url)).toContain('kind=pro');

    // 129.00 − 99.00 SAR = 30 saved, surfaced with the code.
    expect(await screen.findByText(/Promo FALCON20 applied/)).toBeInTheDocument();
  });

  it('asks the visitor to sign in when no session exists', async () => {
    getCurrentUser.mockResolvedValue(null);
    renderWithRouter(<Checkout />, { route: '/checkout?kind=pro' });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/sign in/i);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(moyasarInit).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized checkout kind without calling the API', async () => {
    renderWithRouter(<Checkout />, { route: '/checkout' });
    await screen.findByRole('alert');
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('Checkout — return leg (?id=)', () => {
  it('confirms server-side and continues to where the purchase belongs', async () => {
    apiFetch.mockResolvedValue({ redirectTo: '/account?checkout=success' });
    renderWithRouter(<Checkout />, { route: '/checkout/return?id=pay_123' });

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/billing/confirm',
        expect.objectContaining({ method: 'POST', body: { id: 'pay_123' } }),
      ),
    );
    // The page navigates to the server-directed destination.
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/account?checkout=success'),
    );
  });

  it('degrades to the generic error when confirmation fails', async () => {
    apiFetch.mockRejectedValue(new Error('backend-unavailable'));
    renderWithRouter(<Checkout />, { route: '/checkout/return?id=pay_456' });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // Still on the checkout page — no navigation happened.
    expect(screen.getByTestId('location').textContent).toContain('/checkout/return');
  });
});
