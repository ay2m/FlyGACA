import { describe, expect, it } from 'vitest';
import {
  FREE_DAILY_LIMIT,
  consume,
  currentUsage,
  dayKey,
  isExhausted,
  quotaGate,
  remaining,
  ANON_DAILY_LIMIT,
  dailyLimitFor,
} from '@/calc/chat/chatQuota';

const now = new Date('2026-06-20T09:00:00Z');

describe('currentUsage', () => {
  it('keeps today’s count', () => {
    expect(currentUsage({ day: dayKey(now), count: 2 }, now)).toEqual({
      day: '2026-06-20',
      count: 2,
    });
  });

  it('resets a record from a previous day', () => {
    expect(currentUsage({ day: '2026-06-19', count: 5 }, now)).toEqual({
      day: '2026-06-20',
      count: 0,
    });
  });

  it('resets across a UTC midnight boundary', () => {
    const beforeMidnight = new Date('2026-06-20T23:59:59Z');
    const afterMidnight = new Date('2026-06-21T00:00:01Z');
    const used = consume(currentUsage(null, beforeMidnight));
    expect(currentUsage(used, afterMidnight).count).toBe(0);
  });

  it('coerces malformed records to a fresh count', () => {
    expect(currentUsage(undefined, now).count).toBe(0);
    expect(currentUsage({ day: '2026-06-20', count: -3 }, now).count).toBe(0);
  });
});

describe('remaining / isExhausted / consume', () => {
  it('counts down from the free limit', () => {
    const u0 = currentUsage(null, now);
    expect(remaining(u0)).toBe(FREE_DAILY_LIMIT);
    expect(isExhausted(u0)).toBe(false);
  });

  it('is exhausted exactly at the limit', () => {
    let u = currentUsage(null, now);
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) u = consume(u);
    expect(remaining(u)).toBe(0);
    expect(isExhausted(u)).toBe(true);
  });

  it('never reports negative remaining past the limit', () => {
    let u = currentUsage(null, now);
    for (let i = 0; i < FREE_DAILY_LIMIT + 3; i++) u = consume(u);
    expect(remaining(u)).toBe(0);
  });
});

describe('dailyLimitFor / quotaGate', () => {
  const fresh = null;
  const spent = (limit: number) => ({ day: dayKey(now), count: limit });

  it('picks the signed-in vs anonymous allowance', () => {
    expect(dailyLimitFor(true)).toBe(FREE_DAILY_LIMIT);
    expect(dailyLimitFor(false)).toBe(ANON_DAILY_LIMIT);
  });

  it('a fresh visitor is not gated and sees the full allowance', () => {
    const g = quotaGate(fresh, { signedIn: false, isPro: false, chatCredits: 0 }, now);
    expect(g).toEqual({ dailyLimit: ANON_DAILY_LIMIT, left: ANON_DAILY_LIMIT, gated: false });
  });

  it('an anonymous visitor gates once the taste is spent (credits ignored)', () => {
    const g = quotaGate(spent(ANON_DAILY_LIMIT), { signedIn: false, isPro: false, chatCredits: 9 }, now);
    expect(g.gated).toBe(true);
    expect(g.left).toBe(0);
  });

  it('a signed-in free user gates only with no credits left', () => {
    const who = { signedIn: true, isPro: false };
    expect(quotaGate(spent(FREE_DAILY_LIMIT), { ...who, chatCredits: 0 }, now).gated).toBe(true);
    expect(quotaGate(spent(FREE_DAILY_LIMIT), { ...who, chatCredits: 3 }, now).gated).toBe(false);
  });

  it('Pro users are never gated', () => {
    const g = quotaGate(spent(FREE_DAILY_LIMIT), { signedIn: true, isPro: true, chatCredits: 0 }, now);
    expect(g.gated).toBe(false);
  });

  it("yesterday's spend resets today", () => {
    const yesterday = { day: '2026-06-19', count: FREE_DAILY_LIMIT };
    const g = quotaGate(yesterday, { signedIn: true, isPro: false, chatCredits: 0 }, now);
    expect(g.gated).toBe(false);
    expect(g.left).toBe(FREE_DAILY_LIMIT);
  });
});
