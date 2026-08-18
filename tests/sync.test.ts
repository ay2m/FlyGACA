import { describe, expect, it } from 'vitest';
import {
  profileFromDoc,
  profileToDoc,
  flightFromDoc,
  flightToDoc,
  entitlementFromDoc,
  updateFlightDoc,
  recordToDoc,
  recordFromDoc,
} from '@/lib/services/sync';
import type { Profile, Flight, PilotRecord } from '@/lib/services/account';

const profile: Profile = {
  email: 'pilot@example.com',
  displayName: 'Sara',
  homeBase: 'OERK',
  licenceType: 'PPL',
  medicalExpiry: '2027-01-01',
  lastFlightReview: '2026-01-01',
  role: 'pilot',
};

const flight: Flight = {
  id: 'f1',
  date: '2026-06-01',
  type: 'C172',
  reg: 'HZ-ABC',
  from: 'OERK',
  to: 'OEDF',
  total: '1.5',
  pic: '1.5',
  night: '0',
  ifr: '0',
  ldg: '1',
  nightLdg: '0',
  appr: '0',
  remarks: 'nav',
};

describe('profile mappers', () => {
  it('round-trips and never serializes an entitlement', () => {
    const doc = profileToDoc(profile);
    expect(doc).not.toHaveProperty('entitlement');
    expect(profileFromDoc(doc)).toEqual(profile);
  });

  it('ignores unknown / non-string fields from the doc', () => {
    const out = profileFromDoc({ email: 'x@y.z', entitlement: { plan: 'pro' }, homeBase: 42 });
    expect(out.email).toBe('x@y.z');
    expect(out.homeBase).toBe('');
    expect(out).not.toHaveProperty('entitlement');
  });

  it('round-trips the role field', () => {
    const doc = profileToDoc({ ...profile, role: 'instructor' });
    expect(doc.role).toBe('instructor');
    expect(profileFromDoc(doc).role).toBe('instructor');
  });

  it('leaves role out of the partial when hydrating a legacy doc without one', () => {
    // A users/{uid} doc written before the role field existed.
    const out = profileFromDoc({ email: 'x@y.z', displayName: 'Cap' });
    expect(out).not.toHaveProperty('role');
  });
});

describe('flight mappers', () => {
  it('round-trips without the id in the doc body', () => {
    const doc = flightToDoc(flight);
    expect(doc).not.toHaveProperty('id');
    expect(flightFromDoc('f1', doc)).toEqual(flight);
  });

  it('defaults the newer optional columns to empty strings on legacy docs', () => {
    // A doc written before nightLdg / appr existed.
    const legacy = { date: '2024-01-01', type: 'C172', ldg: '2' };
    const out = flightFromDoc('old', legacy);
    expect(out.nightLdg).toBe('');
    expect(out.appr).toBe('');
    expect(out.ldg).toBe('2');
  });

  it('updateFlightDoc no-ops (resolves) when Firebase is not configured', async () => {
    await expect(updateFlightDoc('uid', 'f1', flight)).resolves.toBeUndefined();
  });
});

describe('record mappers', () => {
  const record: PilotRecord = {
    id: 'r1',
    category: 'rating',
    title: 'Instrument Rating',
    ref: 'IR-2024',
    issued: '2024-01-01',
    expires: '2026-01-01',
    remarks: 'renew with IPC',
  };

  it('round-trips without the id in the doc body', () => {
    const doc = recordToDoc(record);
    expect(doc).not.toHaveProperty('id');
    expect(recordFromDoc('r1', doc)).toEqual(record);
  });

  it('coerces missing fields to empty strings', () => {
    const out = recordFromDoc('r2', { category: 'document', title: 'Passport' });
    expect(out.ref).toBe('');
    expect(out.expires).toBe('');
    expect(out.title).toBe('Passport');
  });
});

describe('entitlementFromDoc', () => {
  it('reads a valid server entitlement', () => {
    expect(
      entitlementFromDoc({
        entitlement: { plan: 'pro', expiresAt: '2027-01-01', source: 'stripe' },
      }),
    ).toEqual({ plan: 'pro', expiresAt: '2027-01-01', source: 'stripe' });
  });

  it('returns null for missing or invalid plans', () => {
    expect(entitlementFromDoc(undefined)).toBeNull();
    expect(entitlementFromDoc({})).toBeNull();
    expect(entitlementFromDoc({ entitlement: { plan: 'gold' } })).toBeNull();
  });
});
