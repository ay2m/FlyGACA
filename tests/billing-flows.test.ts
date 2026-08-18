import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Branch coverage for the billing flows. `startProCheckout`/`startPackCheckout`
 * never call the API directly — they just navigate to the in-app `/checkout`
 * route (which does the pricing + widget-mount work); this file proves the guard
 * branches ('native-billing' · 'sign-in-required' · 'billing-unavailable') and
 * the exact query string each variant produces. `cancelAutoRenew` is the one
 * function here that posts to the API. The config-off case for `canCheckout`
 * lives in billing.test.ts.
 */
const h = vi.hoisted(() => ({
  configured: true,
  responses: {} as Record<string, unknown>,
  error: null as Error | null,
  calls: [] as Array<{ path: string; method: string; body?: unknown }>,
  events: [] as Array<{ name: string; params?: Record<string, unknown> }>,
  native: false,
  channel: 'moyasar' as 'moyasar' | 'revenuecat',
  currentUser: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/native/nativeBridge', () => ({
  isNative: () => h.native,
  billingChannel: () => h.channel,
}));

vi.mock('@/lib/services/backend', async () => {
  const { makeBackendModule } = await import('./helpers/mockBackend');
  return makeBackendModule(h);
});

// The sign-in guard reads the session through `onAuthChange`, so stub that rather
// than the whole auth module — the rest of auth is covered in auth-flows.test.ts.
vi.mock('@/lib/services/auth', () => ({
  onAuthChange: (cb: (u: unknown) => void) => {
    cb(h.currentUser);
    return Promise.resolve(() => {});
  },
}));

type BillingModule = typeof import('@/lib/services/billing');
async function load(): Promise<BillingModule> {
  vi.resetModules();
  return import('@/lib/services/billing');
}

// jsdom's window.location.assign is non-configurable, so swap the whole
// location for a stub (restored in afterEach) to capture the navigation target.
const origLocation = window.location;
function stubAssign(): ReturnType<typeof vi.fn> {
  const assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { assign } });
  return assign;
}

beforeEach(() => {
  h.configured = true;
  h.responses = {};
  h.error = null;
  h.calls = [];
  h.events = [];
  h.native = false;
  h.channel = 'moyasar';
  h.currentUser = null;
});

describe('canCheckout', () => {
  it('is true only when a backend is configured and not native', async () => {
    const b = await load();
    expect(b.canCheckout()).toBe(true);

    h.native = true;
    expect((await load()).canCheckout()).toBe(false);

    h.native = false;
    h.configured = false;
    expect((await load()).canCheckout()).toBe(false);
  });
});

describe('startProCheckout', () => {
  it('routes to native IAP when the billing channel is RevenueCat', async () => {
    h.channel = 'revenuecat';
    await expect((await load()).startProCheckout('annual')).rejects.toThrow('native-billing');
  });

  it('routes to native IAP inside the native shell', async () => {
    h.native = true;
    await expect((await load()).startProCheckout()).rejects.toThrow('native-billing');
  });

  it('requires a signed-in user on web', async () => {
    h.currentUser = null;
    await expect((await load()).startProCheckout()).rejects.toThrow('sign-in-required');
  });

  it('reports billing-unavailable when no backend is configured', async () => {
    h.configured = false;
    await expect((await load()).startProCheckout()).rejects.toThrow('billing-unavailable');
  });

  it('navigates to /checkout with kind=pro and the cadence for monthly/annual', async () => {
    h.currentUser = { uid: 'u1' };
    let assign = stubAssign();
    await (await load()).startProCheckout('monthly');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pro&cadence=monthly');

    assign = stubAssign();
    await (await load()).startProCheckout('annual');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pro&cadence=annual');
  });

  it('navigates to /checkout with kind=student and the cadence from opts.annual', async () => {
    h.currentUser = { uid: 'u1' };
    let assign = stubAssign();
    await (await load()).startProCheckout('student');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=student&cadence=monthly');

    assign = stubAssign();
    await (await load()).startProCheckout('student', { annual: true });
    expect(assign).toHaveBeenCalledWith('/checkout?kind=student&cadence=annual');
  });

  it('navigates to /checkout with kind=pass / kind=credits and no cadence', async () => {
    h.currentUser = { uid: 'u1' };
    let assign = stubAssign();
    await (await load()).startProCheckout('pass');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pass');

    assign = stubAssign();
    await (await load()).startProCheckout('credits');
    expect(assign).toHaveBeenCalledWith('/checkout?kind=credits');
  });

  it('carries a referral code as ?ref=', async () => {
    h.currentUser = { uid: 'u1' };
    const assign = stubAssign();
    await (await load()).startProCheckout('annual', { ref: 'ABCD2345' });
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pro&cadence=annual&ref=ABCD2345');
  });
});

describe('startPackCheckout', () => {
  it('routes to native and requires sign-in just like Pro checkout', async () => {
    h.native = true;
    await expect((await load()).startPackCheckout('medical')).rejects.toThrow('native-billing');

    h.native = false;
    h.currentUser = null;
    await expect((await load()).startPackCheckout('medical')).rejects.toThrow('sign-in-required');
  });

  it('navigates to /checkout with kind=pack and the pack id', async () => {
    h.currentUser = { uid: 'u1' };
    const assign = stubAssign();
    await (await load()).startPackCheckout('medical', { ref: 'ABCD2345' });
    expect(assign).toHaveBeenCalledWith('/checkout?kind=pack&packId=medical&ref=ABCD2345');
  });
});

describe('startBundleCheckout', () => {
  it('routes to native and requires sign-in just like Pro checkout', async () => {
    h.native = true;
    await expect((await load()).startBundleCheckout()).rejects.toThrow('native-billing');

    h.native = false;
    h.currentUser = null;
    await expect((await load()).startBundleCheckout()).rejects.toThrow('sign-in-required');
  });

  it('navigates to /checkout with kind=bundle (no pack id) and carries a ref', async () => {
    h.currentUser = { uid: 'u1' };
    let assign = stubAssign();
    await (await load()).startBundleCheckout();
    expect(assign).toHaveBeenCalledWith('/checkout?kind=bundle');

    assign = stubAssign();
    await (await load()).startBundleCheckout({ ref: 'ABCD2345' });
    expect(assign).toHaveBeenCalledWith('/checkout?kind=bundle&ref=ABCD2345');
  });
});

describe('cancelAutoRenew', () => {
  it('routes to native and requires sign-in just like checkout', async () => {
    h.native = true;
    await expect((await load()).cancelAutoRenew()).rejects.toThrow('native-billing');

    h.native = false;
    h.currentUser = null;
    await expect((await load()).cancelAutoRenew()).rejects.toThrow('sign-in-required');
  });

  it('posts to /billing/cancel-auto-renew', async () => {
    h.currentUser = { uid: 'u1' };
    await (await load()).cancelAutoRenew();
    expect(h.calls).toContainEqual({
      path: '/billing/cancel-auto-renew',
      method: 'POST',
      body: undefined,
    });
  });

  it('surfaces a server failure to the caller', async () => {
    h.currentUser = { uid: 'u1' };
    h.error = new Error('billing-upstream');
    await expect((await load()).cancelAutoRenew()).rejects.toThrow('billing-upstream');
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: origLocation });
  vi.restoreAllMocks();
});
