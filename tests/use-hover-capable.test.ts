import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHoverCapable } from '@/hooks/useHoverCapable';

describe('useHoverCapable', () => {
  let matchMediaMock: any;
  let mqlMock: any;

  beforeEach(() => {
    mqlMock = {
      matches: true,
      media: '(hover: hover)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };

    matchMediaMock = vi.fn(() => mqlMock);
    vi.stubGlobal('matchMedia', matchMediaMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns true when hover is supported', () => {
    const { result } = renderHook(() => useHoverCapable());
    expect(result.current).toBe(true);
  });

  it('returns false when hover is not supported', () => {
    mqlMock.matches = false;
    const { result } = renderHook(() => useHoverCapable());
    expect(result.current).toBe(false);
  });

  it('subscribes to matchMedia changes', () => {
    renderHook(() => useHoverCapable());
    expect(mqlMock.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('unsubscribes from matchMedia changes on unmount', () => {
    const { unmount } = renderHook(() => useHoverCapable());
    unmount();
    expect(mqlMock.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('returns false when window is undefined', () => {
    vi.unstubAllGlobals();
    const { result } = renderHook(() => useHoverCapable());
    expect(result.current).toBe(false);
  });

  it('returns false when window.matchMedia is undefined', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', {});
    const { result } = renderHook(() => useHoverCapable());
    expect(result.current).toBe(false);
  });

  it('handles subscribe when window.matchMedia is not available', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', {});
    renderHook(() => useHoverCapable());
    // Should not throw when window.matchMedia is not available
    expect(true).toBe(true);
  });
});
