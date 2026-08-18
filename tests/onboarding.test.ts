import { describe, expect, it } from 'vitest';
import { profileCompleteness } from '@/calc/pilot/onboarding';
import type { Flight, Profile } from '@/lib/services/account';

const profile = (
  over: Partial<Profile> = {},
): Pick<Profile, 'medicalExpiry' | 'lastFlightReview' | 'homeBase'> => ({
  medicalExpiry: '',
  lastFlightReview: '',
  homeBase: '',
  ...over,
});

const flight = (): Flight => ({
  id: '1',
  date: '2024-05-01',
  type: 'C172',
  reg: '',
  from: '',
  to: '',
  total: '1',
  pic: '1',
  night: '0',
  ifr: '0',
  ldg: '1',
  remarks: '',
});

describe('profileCompleteness', () => {
  it('is 0% for a brand-new profile', () => {
    const c = profileCompleteness(profile(), []);
    expect(c.doneCount).toBe(0);
    expect(c.percent).toBe(0);
    expect(c.total).toBe(4);
    expect(c.steps.find((s) => s.id === 'firstFlight')!.to).toBe('/logbook?add=1');
  });

  it('counts each completed step', () => {
    const c = profileCompleteness(profile({ medicalExpiry: '2025-01-01', homeBase: 'OERK' }), []);
    expect(c.doneCount).toBe(2);
    expect(c.percent).toBe(50);
    expect(c.steps.find((s) => s.id === 'medical')!.done).toBe(true);
    expect(c.steps.find((s) => s.id === 'review')!.done).toBe(false);
  });

  it('treats whitespace-only fields as not set and a logged flight as done', () => {
    const c = profileCompleteness(profile({ homeBase: '   ' }), [flight()]);
    expect(c.steps.find((s) => s.id === 'homeBase')!.done).toBe(false);
    expect(c.steps.find((s) => s.id === 'firstFlight')!.done).toBe(true);
    expect(c.percent).toBe(25);
  });

  it('is 100% when everything is set', () => {
    const c = profileCompleteness(
      profile({ medicalExpiry: '2025-01-01', lastFlightReview: '2024-01-01', homeBase: 'OERK' }),
      [flight()],
    );
    expect(c.percent).toBe(100);
  });
});
