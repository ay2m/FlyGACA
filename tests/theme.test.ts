import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Store-layer coverage for the theme module. It keeps a single module-level
 * `state` seeded from localStorage at import time, so each test seeds storage,
 * resets the module registry, then dynamically imports a fresh copy (mirroring
 * prefs-store.test.ts). The DOM side — `data-theme` on <html> and the
 * theme-color meta — is asserted directly.
 */
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  // jsdom has no index.html meta; inject one so applyTheme has a target.
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '#0A0E12';
  document.head.appendChild(meta);
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
});

const metaColor = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

describe('theme store', () => {
  const KEY = 'flygaca:theme';

  it('readTheme defaults to falcon and reads a stored cockpit choice', async () => {
    const m = await import('@/lib/theme');
    expect(m.readTheme()).toBe('falcon');
    localStorage.setItem(KEY, 'cockpit');
    expect(m.readTheme()).toBe('cockpit');
    localStorage.setItem(KEY, 'nonsense');
    expect(m.readTheme()).toBe('falcon');
  });

  it('applyTheme sets data-theme + theme-color for cockpit and clears them for falcon', async () => {
    const m = await import('@/lib/theme');
    m.applyTheme('cockpit');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cockpit');
    expect(metaColor()).toBe('#121212');
    m.applyTheme('falcon');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(metaColor()).toBe('#0A0E12');
  });

  it('applyTheme sets the day (light) theme + its ivory theme-color', async () => {
    const m = await import('@/lib/theme');
    m.applyTheme('day');
    expect(document.documentElement.getAttribute('data-theme')).toBe('day');
    expect(metaColor()).toBe('#F5F2ED');
    m.applyTheme('falcon');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('readTheme reads a stored day choice', async () => {
    const m = await import('@/lib/theme');
    localStorage.setItem(KEY, 'day');
    expect(m.readTheme()).toBe('day');
  });

  it('persistTheme writes the storage key', async () => {
    const m = await import('@/lib/theme');
    m.persistTheme('cockpit');
    expect(localStorage.getItem(KEY)).toBe('cockpit');
  });

  it('setTheme applies and persists in one call', async () => {
    const m = await import('@/lib/theme');
    m.setTheme('cockpit');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cockpit');
    expect(localStorage.getItem(KEY)).toBe('cockpit');
  });

  it('does not throw when localStorage is unavailable', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const m = await import('@/lib/theme');
    expect(m.readTheme()).toBe('falcon');
    spy.mockRestore();
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => m.persistTheme('cockpit')).not.toThrow();
    setSpy.mockRestore();
  });
});
