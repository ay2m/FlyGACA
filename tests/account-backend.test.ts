import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Flight } from '@/lib/services/account';

// The backend-connected path of the account store. We mock auth (so the store
// believes a backend is configured and binds to onAuthChange) and the sync layer,
// then drive the auth callback by hand. This exercises uid adoption, one-time
// hydration, the best-effort write-through on every mutation, and the syncError
// flag that warns the UI when local is ahead of the server.

const h = vi.hoisted(() => ({
  authCb: null as null | ((u: unknown) => void),
}));

vi.mock('@/lib/services/auth', () => ({
  isAuthAvailable: () => true,
  onAuthChange: (cb: (u: unknown) => void) => {
    h.authCb = cb;
    return Promise.resolve(() => {});
  },
  signOutUser: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/services/sync', () => ({
  loadAccount: vi.fn(() => Promise.resolve(null)),
  saveProfileDoc: vi.fn(() => Promise.resolve()),
  addFlightDoc: vi.fn(() => Promise.resolve()),
  deleteFlightDoc: vi.fn(() => Promise.resolve()),
}));

const USER = { uid: 'u1', email: 'cap@example.com', displayName: 'Cap', emailVerified: true };

const FLIGHT: Omit<Flight, 'id'> = {
  date: '2026-01-01',
  type: 'C172',
  reg: 'HZ-AB',
  from: 'OERK',
  to: 'OEJN',
  total: '1.5',
  pic: '1.5',
  night: '0.0',
  ifr: '0.0',
  ldg: '1',
  remarks: '',
};

type AccountModule = typeof import('@/lib/services/account');
type SyncModule = typeof import('@/lib/services/sync');

/** Re-import the mocked sync + the store; connectAuth runs and captures authCb. */
async function load(): Promise<{ acct: AccountModule; sync: SyncModule }> {
  vi.resetModules();
  const sync = await import('@/lib/services/sync');
  const acct = await import('@/lib/services/account');
  return { acct, sync };
}

beforeEach(() => {
  localStorage.clear();
  h.authCb = null;
  vi.clearAllMocks();
});

describe('account store — auth binding', () => {
  it('adopts the uid and hydrates profile, logbook and entitlement on sign-in', async () => {
    const { acct, sync } = await load();
    vi.mocked(sync.loadAccount).mockResolvedValue({
      profile: { homeBase: 'OERK' },
      flights: [{ ...FLIGHT, id: 'srv1', remarks: 'from server' }],
      entitlement: { plan: 'pro', source: 'moyasar' },
      chatCredits: 0,
    });

    const { result } = renderHook(() => acct.useAccount());
    expect(h.authCb).toBeTypeOf('function');
    await act(async () => {
      h.authCb!(USER);
    });

    await waitFor(() => expect(result.current.uid).toBe('u1'));
    await waitFor(() => expect(result.current.entitlement?.plan).toBe('pro'));
    expect(result.current.session).toBe('cap@example.com');
    expect(result.current.profile.email).toBe('cap@example.com');
    expect(result.current.profile.homeBase).toBe('OERK');
    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0].remarks).toBe('from server');
  });

  it('clears uid, session and entitlement when the auth user goes away', async () => {
    const { acct, sync } = await load();
    vi.mocked(sync.loadAccount).mockResolvedValue({
      profile: {},
      flights: [],
      entitlement: { plan: 'pro', source: 'moyasar' },
      chatCredits: 0,
    });

    const { result } = renderHook(() => acct.useAccount());
    await act(async () => {
      h.authCb!(USER);
    });
    await waitFor(() => expect(result.current.entitlement?.plan).toBe('pro'));

    await act(async () => {
      h.authCb!(null);
    });

    await waitFor(() => expect(result.current.uid).toBeNull());
    expect(result.current.session).toBeNull();
    expect(result.current.entitlement).toBeNull();
  });
});

describe('account store — API write-through', () => {
  async function signedInStore() {
    const ctx = await load();
    vi.mocked(ctx.sync.loadAccount).mockResolvedValue(null);
    const hook = renderHook(() => ctx.acct.useAccount());
    await act(async () => {
      h.authCb!(USER);
    });
    await waitFor(() => expect(hook.result.current.uid).toBe('u1'));
    return { ...ctx, hook };
  }

  // The server derives the account from the session cookie, so no uid is passed.
  it('writes the profile through to the API', async () => {
    const { acct, sync } = await signedInStore();
    await act(async () => {
      acct.saveProfile({ homeBase: 'OEJN' });
    });
    expect(sync.saveProfileDoc).toHaveBeenCalledWith(
      expect.objectContaining({ homeBase: 'OEJN' }),
    );
  });

  it('writes added and deleted flights through to the API', async () => {
    const { acct, sync } = await signedInStore();

    await act(async () => {
      acct.addFlight(FLIGHT);
    });
    expect(sync.addFlightDoc).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'OERK', to: 'OEJN' }),
    );

    const id = JSON.parse(acct.exportAll()).flights[0].id as string;
    await act(async () => {
      acct.deleteFlight(id);
    });
    expect(sync.deleteFlightDoc).toHaveBeenCalledWith(id);
  });

  it('raises syncError on a failed write and clears it on the next success', async () => {
    const { acct, sync, hook } = await signedInStore();

    vi.mocked(sync.saveProfileDoc).mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      acct.saveProfile({ homeBase: 'X' });
    });
    await waitFor(() => expect(hook.result.current.syncError).toBe(true));

    vi.mocked(sync.saveProfileDoc).mockResolvedValueOnce(undefined);
    await act(async () => {
      acct.saveProfile({ homeBase: 'Y' });
    });
    await waitFor(() => expect(hook.result.current.syncError).toBe(false));
  });
});
