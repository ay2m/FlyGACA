import { describe, expect, it } from 'vitest';
import { achievements, earnedCount } from '@/calc/pilot/achievements';
import type { Flight } from '@/lib/services/account';

const flight = (over: Partial<Flight> = {}): Flight => ({
  id: Math.random().toString(36),
  date: '2024-05-20',
  type: 'C172',
  reg: 'HZ-ABC',
  from: 'OERK',
  to: 'OEDF',
  total: '1.0',
  pic: '1.0',
  night: '0',
  ifr: '0',
  ldg: '1',
  remarks: '',
  ...over,
});

const get = (flights: Flight[], id: string) => achievements(flights).find((a) => a.id === id)!;

describe('achievements', () => {
  it('earns first-cross-country when from and to differ', () => {
    expect(get([flight({ from: 'OERK', to: 'OEDF' })], 'xc-first').earned).toBe(true);
    expect(get([flight({ from: 'OERK', to: 'OERK' })], 'xc-first').earned).toBe(false);
  });

  it('earns the night badge once any night time is logged', () => {
    expect(get([flight({ night: '0' })], 'night-first').earned).toBe(false);
    expect(get([flight({ night: '0.5' })], 'night-first').earned).toBe(true);
  });

  it('tracks progress and earns hour milestones at the threshold', () => {
    const flights = Array.from({ length: 60 }, () => flight({ total: '1.0' }));
    const h50 = get(flights, 'hours-50');
    expect(h50).toMatchObject({ have: 60, target: 50, earned: true });
    expect(get(flights, 'hours-100').earned).toBe(false);
    expect(get(flights, 'hours-100').have).toBe(60);
  });

  it('earnedCount reflects how many are unlocked', () => {
    expect(earnedCount(achievements([]))).toBe(0);
    // A single cross-country flight earns at least the XC badge.
    expect(earnedCount(achievements([flight()]))).toBeGreaterThanOrEqual(1);
  });
});
