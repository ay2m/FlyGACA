import { describe, expect, it } from 'vitest';
import {
  ALL_WIDGETS,
  dashboardOrder,
  orderedWidgets,
  quickActionsFor,
  visibleWidgets,
} from '@/calc/app/dashboardLayout';

describe('dashboardOrder', () => {
  it('covers every widget exactly once for every role', () => {
    for (const role of ['pilot', 'student', 'instructor', '', 'legacy-value']) {
      const order = dashboardOrder(role);
      expect([...order].sort()).toEqual([...ALL_WIDGETS].sort());
      expect(new Set(order).size).toBe(order.length);
    }
  });

  it('leads with study for students and operational numbers for pilots', () => {
    expect(dashboardOrder('student')[0]).toBe('study');
    expect(dashboardOrder('pilot')[0]).toBe('numbers');
    expect(dashboardOrder('instructor')[0]).toBe('currency');
  });

  it('falls back to the pilot order for unset or unknown roles', () => {
    expect(dashboardOrder('')).toEqual(dashboardOrder('pilot'));
    expect(dashboardOrder('captain')).toEqual(dashboardOrder('pilot'));
  });

  it('never buries currency below engagement widgets (risk hierarchy)', () => {
    for (const role of ['pilot', 'student', 'instructor', '']) {
      const order = dashboardOrder(role);
      expect(order.indexOf('currency')).toBeLessThan(order.indexOf('achievements'));
      expect(order.indexOf('currency')).toBeLessThan(order.indexOf('adel'));
    }
  });
});

describe('orderedWidgets', () => {
  it('leads with the saved order, then appends unmentioned widgets in role order', () => {
    const roleOrder = dashboardOrder('pilot');
    const saved = ['adel', 'currency'];
    const out = orderedWidgets(roleOrder, saved);
    expect(out.slice(0, 2)).toEqual(['adel', 'currency']);
    // Every widget still present exactly once (nothing dropped or duplicated).
    expect([...out].sort()).toEqual([...ALL_WIDGETS].sort());
    expect(new Set(out).size).toBe(out.length);
  });

  it('returns the role default when nothing is saved', () => {
    const roleOrder = dashboardOrder('student');
    expect(orderedWidgets(roleOrder, [])).toEqual(roleOrder);
  });

  it('ignores unknown ids in the saved order', () => {
    const roleOrder = dashboardOrder('pilot');
    expect(orderedWidgets(roleOrder, ['nope', 'adel'])[0]).toBe('adel');
    expect([...orderedWidgets(roleOrder, ['nope'])].sort()).toEqual([...ALL_WIDGETS].sort());
  });
});

describe('visibleWidgets', () => {
  it('drops hidden ids while preserving order', () => {
    const order = dashboardOrder('pilot');
    const out = visibleWidgets(order, ['trend', 'adel']);
    expect(out).not.toContain('trend');
    expect(out).not.toContain('adel');
    expect(out.indexOf('numbers')).toBeLessThan(out.indexOf('currency'));
  });

  it('ignores unknown ids in the hidden list', () => {
    const order = dashboardOrder('pilot');
    expect(visibleWidgets(order, ['nope'])).toEqual(order);
  });
});

describe('quickActionsFor', () => {
  it('always includes logging a flight and asking Captain Adel', () => {
    for (const role of ['pilot', 'student', 'instructor', '']) {
      const tos = quickActionsFor(role).map((a) => a.to);
      expect(tos).toContain('/logbook?add=1');
      expect(tos).toContain('/chat');
    }
  });

  it('tunes the tail per role', () => {
    expect(quickActionsFor('student').map((a) => a.to)).toContain('/study/exam');
    expect(quickActionsFor('instructor').map((a) => a.to)).toContain('/records');
    expect(quickActionsFor('pilot').map((a) => a.to)).toContain('/updates');
  });
});
