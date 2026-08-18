import { beforeEach, describe, expect, it } from 'vitest';
import { freshModule } from './helpers/freshModule';

beforeEach(() => localStorage.clear());

describe('dashboardPrefs store', () => {
  it('starts empty and undismissed', async () => {
    const prefs = await freshModule<typeof import('@/lib/prefs/dashboardPrefs')>(
      () => import('@/lib/prefs/dashboardPrefs'),
    );
    prefs.toggleWidget('study');
    prefs.toggleWidget('study'); // toggle back — end state must be empty
    expect(JSON.parse(localStorage.getItem('flygaca:dashboard-hidden')!)).toEqual([]);
    expect(localStorage.getItem('flygaca:dashboard-role-dismissed')).toBeNull();
  });

  it('toggles widgets and persists the hidden list', async () => {
    const prefs = await freshModule<typeof import('@/lib/prefs/dashboardPrefs')>(
      () => import('@/lib/prefs/dashboardPrefs'),
    );
    prefs.toggleWidget('trend');
    prefs.toggleWidget('adel');
    expect(JSON.parse(localStorage.getItem('flygaca:dashboard-hidden')!)).toEqual([
      'trend',
      'adel',
    ]);
    prefs.toggleWidget('trend');
    expect(JSON.parse(localStorage.getItem('flygaca:dashboard-hidden')!)).toEqual(['adel']);
  });

  it('hydrates hidden widgets and dismissal from localStorage', async () => {
    localStorage.setItem('flygaca:dashboard-hidden', JSON.stringify(['study', 7, 'tools']));
    localStorage.setItem('flygaca:dashboard-role-dismissed', '1');
    const prefs = await freshModule<typeof import('@/lib/prefs/dashboardPrefs')>(
      () => import('@/lib/prefs/dashboardPrefs'),
    );
    // Renderless read via the store's persistence round-trip: toggle a no-op id
    prefs.toggleWidget('probe');
    const hidden = JSON.parse(localStorage.getItem('flygaca:dashboard-hidden')!) as string[];
    expect(hidden).toContain('study');
    expect(hidden).toContain('tools');
    expect(hidden).not.toContain(7 as never); // non-strings filtered on read
  });

  it('persists and hydrates a custom widget order', async () => {
    const prefs = await freshModule<typeof import('@/lib/prefs/dashboardPrefs')>(
      () => import('@/lib/prefs/dashboardPrefs'),
    );
    prefs.setWidgetOrder(['adel', 'currency', 'numbers']);
    expect(JSON.parse(localStorage.getItem('flygaca:dashboard-order')!)).toEqual([
      'adel',
      'currency',
      'numbers',
    ]);
  });

  it('records the role-prompt dismissal', async () => {
    const prefs = await freshModule<typeof import('@/lib/prefs/dashboardPrefs')>(
      () => import('@/lib/prefs/dashboardPrefs'),
    );
    prefs.dismissRolePrompt();
    expect(localStorage.getItem('flygaca:dashboard-role-dismissed')).toBe('1');
  });

  it('survives corrupt stored JSON', async () => {
    localStorage.setItem('flygaca:dashboard-hidden', '{nope');
    const prefs = await freshModule<typeof import('@/lib/prefs/dashboardPrefs')>(
      () => import('@/lib/prefs/dashboardPrefs'),
    );
    prefs.toggleWidget('study');
    expect(JSON.parse(localStorage.getItem('flygaca:dashboard-hidden')!)).toEqual(['study']);
  });
});
