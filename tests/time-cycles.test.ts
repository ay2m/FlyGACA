import { describe, expect, it } from 'vitest';
import { ksaToUtc, utcToKsa } from '@/calc/zulu';
import { airacCycle } from '@/calc/airac';
import { sunTimes } from '@/calc/sun';

describe('zulu clock', () => {
  it('UTC → KSA adds 3 hours', () => {
    expect(utcToKsa(10, 30)).toMatchObject({ hh: 13, mm: 30, dayOffset: 0 });
  });
  it('wraps past midnight', () => {
    expect(utcToKsa(23, 0)).toMatchObject({ hh: 2, mm: 0, dayOffset: 1 });
  });
  it('KSA → UTC subtracts 3 hours across midnight', () => {
    expect(ksaToUtc(1, 0)).toMatchObject({ hh: 22, mm: 0, dayOffset: -1 });
  });
});

describe('AIRAC', () => {
  it('02 Jan 2020 is cycle 2001', () => {
    const c = airacCycle(new Date(Date.UTC(2020, 0, 2, 12)));
    expect(c.id).toBe('2001');
  });
  it('the next cycle 28 days later is 2002', () => {
    const c = airacCycle(new Date(Date.UTC(2020, 0, 30, 12)));
    expect(c.id).toBe('2002');
    expect(c.nextId).toBe('2003');
  });
  it('rolls the year over', () => {
    // 24 Dec 2025 cycle is 2513; the next is 2601
    const c = airacCycle(new Date(Date.UTC(2025, 11, 25, 12)));
    expect(c.id.startsWith('25')).toBe(true);
  });
});

describe('sun times', () => {
  it('Riyadh midsummer: sunrise early UTC, sunset afternoon UTC, ordered', () => {
    const r = sunTimes(new Date(Date.UTC(2024, 5, 21, 12)), 24.71, 46.68)!;
    expect(r.sunrise).not.toBeNull();
    expect(r.sunset).not.toBeNull();
    const rise = r.sunrise!.getUTCHours();
    const set = r.sunset!.getUTCHours();
    expect(rise).toBeGreaterThanOrEqual(1);
    expect(rise).toBeLessThanOrEqual(4); // ~02:13 UTC
    expect(set).toBeGreaterThanOrEqual(14);
    expect(set).toBeLessThanOrEqual(17); // ~15:43 UTC
    expect(r.civilDawn!.getTime()).toBeLessThan(r.sunrise!.getTime());
    expect(r.civilDusk!.getTime()).toBeGreaterThan(r.sunset!.getTime());
  });
});
