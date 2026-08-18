import { describe, it, expect, afterEach } from 'vitest';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

// The counter lives at module scope, so every spec must release what it locks.
afterEach(() => {
  document.body.style.overflow = '';
});

describe('scroll-lock', () => {
  it('locks and unlocks body scroll', () => {
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the body locked while any overlay still holds a lock', () => {
    lockBodyScroll(); // e.g. onboarding tour
    lockBodyScroll(); // e.g. command palette on top
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
  });

  it('releases the lock regardless of open/close order (regression: stuck overflow on phone)', () => {
    // Tour opens, palette opens on top, tour unmounts first, palette closes last.
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll(); // tour cleanup
    unlockBodyScroll(); // palette cleanup
    expect(document.body.style.overflow).toBe('');
  });

  it('ignores unbalanced unlocks', () => {
    unlockBodyScroll();
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
  });
});
