import { describe, expect, it } from 'vitest';
import { airacCycle, cycleProgress } from '@/calc/airac';

// AIRAC 2001 was effective 02 Jan 2020 (UTC) — the anchor every cycle counts from.
describe('cycleProgress', () => {
  it('is day 1 at 0% on a cycle boundary', () => {
    const p = cycleProgress(new Date('2020-01-02T00:00:00Z'));
    expect(p.dayInCycle).toBe(1);
    expect(p.fraction).toBe(0);
  });

  it('is halfway through on day 15', () => {
    const p = cycleProgress(new Date('2020-01-16T00:00:00Z')); // +14 days
    expect(p.dayInCycle).toBe(15);
    expect(p.fraction).toBeCloseTo(0.5, 5);
  });

  it('reaches day 28 just before the next cycle', () => {
    const p = cycleProgress(new Date('2020-01-29T12:00:00Z')); // +27.5 days
    expect(p.dayInCycle).toBe(28);
    expect(p.fraction).toBeCloseTo(27.5 / 28, 5);
  });
});

describe('airacCycle', () => {
  it('correctly calculates current and next AIRAC cycles for 2026-08-16', () => {
    const cycle = airacCycle(new Date('2026-08-16T02:31:27Z'));
    expect(cycle.id).toBe('2608');
    expect(cycle.effective.toISOString().slice(0, 10)).toBe('2026-08-06');
    expect(cycle.nextId).toBe('2609');
    expect(cycle.next.toISOString().slice(0, 10)).toBe('2026-09-03');
    expect(cycle.daysToNext).toBe(18);
  });

  it('handles year boundary AIRAC cycle progression', () => {
    const cycle = airacCycle(new Date('2026-01-22T00:00:00Z'));
    expect(cycle.id).toBe('2601');
    expect(cycle.effective.toISOString().slice(0, 10)).toBe('2026-01-22');
  });
});

