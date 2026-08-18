import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Flight, Profile } from '@/lib/services/account';

// The local-first account store. With no Firebase config (the test case) the
// store never connects to auth, so every mutation stays purely local +
// persisted to localStorage. We re-import a fresh module per test so each one
// gets a clean, deterministic store initialised from the current localStorage.

type AccountModule = typeof import('@/lib/services/account');

async function freshStore(): Promise<AccountModule> {
  vi.resetModules();
  return import('@/lib/services/account');
}

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
  remarks: 'nav ex',
};

beforeEach(() => localStorage.clear());

describe('account store — hydration', () => {
  it('starts from defaults when storage is empty', async () => {
    const acct = await freshStore();
    const { profile, flights } = JSON.parse(acct.exportAll()) as {
      profile: Profile;
      flights: Flight[];
    };
    expect(profile.email).toBe('');
    expect(flights).toEqual([]);
    expect(localStorage.getItem('flygaca:session')).toBeNull();
  });

  it('hydrates profile, logbook and session from localStorage', async () => {
    localStorage.setItem('flygaca:session', 'cap@example.com');
    localStorage.setItem(
      'flygaca:profile',
      JSON.stringify({ ...{ email: 'cap@example.com', displayName: 'Cap' } }),
    );
    localStorage.setItem('flygaca:logbook', JSON.stringify([{ ...FLIGHT, id: 'seed' }]));

    const acct = await freshStore();
    const { result } = renderHook(() => acct.useAccount());

    expect(result.current.session).toBe('cap@example.com');
    expect(result.current.profile.displayName).toBe('Cap');
    expect(result.current.flights).toHaveLength(1);
  });

  it('falls back to defaults when stored JSON is corrupt', async () => {
    localStorage.setItem('flygaca:profile', '{not json');
    localStorage.setItem('flygaca:logbook', 'also-not-json');

    const acct = await freshStore();
    const { profile, flights } = JSON.parse(acct.exportAll()) as {
      profile: Profile;
      flights: Flight[];
    };
    expect(profile.email).toBe('');
    expect(flights).toEqual([]);
  });
});

describe('account store — session', () => {
  it('signs in, setting the session and seeding profile identity', async () => {
    const acct = await freshStore();
    acct.signIn('cap@example.com', 'Captain Adel');

    const { profile } = JSON.parse(acct.exportAll()) as { profile: Profile };
    expect(profile.email).toBe('cap@example.com');
    expect(profile.displayName).toBe('Captain Adel');
    expect(localStorage.getItem('flygaca:session')).toBe('cap@example.com');
  });

  it('falls back to the email as display name when none is given', async () => {
    const acct = await freshStore();
    acct.signIn('lone@example.com', '   ');
    const { profile } = JSON.parse(acct.exportAll()) as { profile: Profile };
    expect(profile.displayName).toBe('lone@example.com');
  });

  it('signs out, clearing the persisted session', async () => {
    const acct = await freshStore();
    acct.signIn('cap@example.com', 'Cap');
    acct.signOut();
    expect(localStorage.getItem('flygaca:session')).toBeNull();
  });

  it('re-renders subscribers through useAccount on sign-in / sign-out', async () => {
    const acct = await freshStore();
    const { result } = renderHook(() => acct.useAccount());

    expect(result.current.session).toBeNull();
    act(() => acct.signIn('cap@example.com', 'Cap'));
    expect(result.current.session).toBe('cap@example.com');
    act(() => acct.signOut());
    expect(result.current.session).toBeNull();
  });
});

describe('account store — logbook', () => {
  it('adds a flight with a generated id, newest first', async () => {
    const acct = await freshStore();
    acct.addFlight({ ...FLIGHT, remarks: 'first' });
    acct.addFlight({ ...FLIGHT, remarks: 'second' });

    const { flights } = JSON.parse(acct.exportAll()) as { flights: Flight[] };
    expect(flights).toHaveLength(2);
    expect(flights[0].remarks).toBe('second');
    expect(flights[0].id).toMatch(/[0-9a-f-]{36}/i);
    expect(flights[0].id).not.toBe(flights[1].id);
    expect(JSON.parse(localStorage.getItem('flygaca:logbook')!)).toHaveLength(2);
  });

  it('deletes a flight by id and leaves the rest', async () => {
    const acct = await freshStore();
    acct.addFlight({ ...FLIGHT, remarks: 'keep' });
    acct.addFlight({ ...FLIGHT, remarks: 'drop' });
    const { flights } = JSON.parse(acct.exportAll()) as { flights: Flight[] };
    const dropId = flights.find((f) => f.remarks === 'drop')!.id;

    acct.deleteFlight(dropId);

    const after = JSON.parse(acct.exportAll()).flights as Flight[];
    expect(after).toHaveLength(1);
    expect(after[0].remarks).toBe('keep');
  });

  it('sumHours totals a numeric column and ignores non-numeric cells', async () => {
    const acct = await freshStore();
    const flights: Flight[] = [
      { ...FLIGHT, id: '1', total: '1.5' },
      { ...FLIGHT, id: '2', total: '2.0' },
      { ...FLIGHT, id: '3', total: '' },
      { ...FLIGHT, id: '4', total: 'n/a' },
    ];
    expect(acct.sumHours(flights, 'total')).toBeCloseTo(3.5);
  });
});

describe('account store — data export & wipe', () => {
  it('exports profile and logbook as pretty JSON', async () => {
    const acct = await freshStore();
    acct.signIn('cap@example.com', 'Cap');
    acct.addFlight(FLIGHT);

    const dump = JSON.parse(acct.exportAll());
    expect(dump.profile.email).toBe('cap@example.com');
    expect(dump.flights).toHaveLength(1);
    expect(acct.exportAll()).toContain('\n'); // pretty-printed
  });

  it('wipes flights and profile detail but keeps identity', async () => {
    const acct = await freshStore();
    acct.signIn('cap@example.com', 'Cap');
    acct.saveProfile({ homeBase: 'OERK', licenceType: 'CPL' });
    acct.addFlight(FLIGHT);

    acct.deleteAllData();

    const { profile, flights } = JSON.parse(acct.exportAll()) as {
      profile: Profile;
      flights: Flight[];
    };
    expect(flights).toEqual([]);
    expect(profile.homeBase).toBe('');
    expect(profile.licenceType).toBe('');
    expect(profile.email).toBe('cap@example.com');
    expect(profile.displayName).toBe('Cap');
  });
});

describe('account store — profile', () => {
  it('merges a partial patch and persists it', async () => {
    const acct = await freshStore();
    acct.saveProfile({ homeBase: 'OERK' });
    acct.saveProfile({ licenceType: 'ATPL' });

    const { profile } = JSON.parse(acct.exportAll()) as { profile: Profile };
    expect(profile.homeBase).toBe('OERK');
    expect(profile.licenceType).toBe('ATPL');
    expect(JSON.parse(localStorage.getItem('flygaca:profile')!).homeBase).toBe('OERK');
  });
});

describe('account store — role', () => {
  it('defaults to an empty role', async () => {
    const acct = await freshStore();
    const { profile } = JSON.parse(acct.exportAll()) as { profile: Profile };
    expect(profile.role).toBe('');
  });

  it('hydrates role as empty for profiles stored before the field existed', async () => {
    localStorage.setItem(
      'flygaca:profile',
      JSON.stringify({ email: 'cap@example.com', displayName: 'Cap' }),
    );
    const acct = await freshStore();
    const { profile } = JSON.parse(acct.exportAll()) as { profile: Profile };
    expect(profile.role).toBe('');
  });

  it('saves and persists a chosen role', async () => {
    const acct = await freshStore();
    acct.saveProfile({ role: 'student' });
    const { profile } = JSON.parse(acct.exportAll()) as { profile: Profile };
    expect(profile.role).toBe('student');
    expect(JSON.parse(localStorage.getItem('flygaca:profile')!).role).toBe('student');
  });

  it('keeps the role through deleteAllData, like other identity fields', async () => {
    const acct = await freshStore();
    acct.signIn('cap@example.com', 'Cap');
    acct.saveProfile({ role: 'instructor', homeBase: 'OERK' });

    acct.deleteAllData();

    const { profile } = JSON.parse(acct.exportAll()) as { profile: Profile };
    expect(profile.role).toBe('instructor');
    expect(profile.homeBase).toBe('');
  });

  it('isUserRole accepts known roles and rejects everything else', async () => {
    const acct = await freshStore();
    expect(acct.USER_ROLES).toEqual(['pilot', 'student', 'instructor']);
    expect(acct.isUserRole('pilot')).toBe(true);
    expect(acct.isUserRole('')).toBe(false);
    expect(acct.isUserRole('captain')).toBe(false);
  });
});
