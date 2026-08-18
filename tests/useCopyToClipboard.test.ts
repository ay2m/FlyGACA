import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCopyToClipboard, useCopyToClipboardKeyed } from '@/hooks/useCopyToClipboard';

describe('useCopyToClipboard', () => {
  it('writes the text, flips copied to true, then resets after resetMs', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const { result } = renderHook(() => useCopyToClipboard(1500));
      expect(result.current.copied).toBe(false);

      await act(async () => {
        await result.current.copy('hello world');
      });
      expect(writeText).toHaveBeenCalledWith('hello world');
      expect(result.current.copied).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1499);
      });
      expect(result.current.copied).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.copied).toBe(false);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('uses the default 1500ms reset when no resetMs is passed', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const { result } = renderHook(() => useCopyToClipboard());
      await act(async () => {
        await result.current.copy('x');
      });
      expect(result.current.copied).toBe(true);
      act(() => vi.advanceTimersByTime(1500));
      expect(result.current.copied).toBe(false);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('stays silent (no throw, copied stays false) when the clipboard write is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const { result } = renderHook(() => useCopyToClipboard());
      await act(async () => {
        await expect(result.current.copy('secret')).resolves.toBeUndefined();
      });
      expect(result.current.copied).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // KNOWN BUG (not fixed here — see the task report): the hook's doc comment
  // promises it "stay[s] silent when the clipboard is unavailable (insecure
  // context, denied permission)", but `navigator.clipboard?.writeText(text)`
  // short-circuits to `undefined` (not a rejection) when `clipboard` itself is
  // missing, so the `try/catch` never fires and `copied` flips to `true` anyway
  // — a false "Copied ✓" confirmation with nothing actually on the clipboard.
  // This test pins the ACTUAL current behavior so a future fix shows up as an
  // intentional, reviewed test change rather than a silent regression.
  it('BUG: currently reports copied:true even when navigator.clipboard is entirely absent', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    try {
      const { result } = renderHook(() => useCopyToClipboard());
      await act(async () => {
        await expect(result.current.copy('secret')).resolves.toBeUndefined();
      });
      expect(result.current.copied).toBe(true); // should be false per the doc comment
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('cancels the pending reset timer on unmount (no post-unmount setState)', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    try {
      const { result, unmount } = renderHook(() => useCopyToClipboard(1500));
      await act(async () => {
        await result.current.copy('bye');
      });
      expect(result.current.copied).toBe(true);

      unmount();
      clearSpy.mockClear();

      // Advancing timers past the reset window after unmount must not throw or
      // trigger an "update on an unmounted component" warning — the effect
      // cleanup already cleared the pending timeout.
      expect(() => act(() => vi.advanceTimersByTime(5000))).not.toThrow();
    } finally {
      clearSpy.mockRestore();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('clears a still-pending timer when unmounted before it fires', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    try {
      const { unmount } = renderHook(() => useCopyToClipboard(1500));
      unmount();
      // The effect cleanup always calls clearTimeout, even if copy() was never
      // invoked (timer.current is undefined — clearTimeout(undefined) is a no-op).
      expect(clearSpy).toHaveBeenCalled();
    } finally {
      clearSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});

describe('useCopyToClipboardKeyed', () => {
  it('ticks only the key that was copied', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const { result } = renderHook(() => useCopyToClipboardKeyed<string>(1500));
      expect(result.current.copiedKey).toBeNull();

      await act(async () => {
        await result.current.copy('section-a', 'text a');
      });
      expect(result.current.copiedKey).toBe('section-a');

      act(() => vi.advanceTimersByTime(1500));
      expect(result.current.copiedKey).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('resets the previous timer when a second key is copied before the first tick expires', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      const { result } = renderHook(() => useCopyToClipboardKeyed<string>(1500));

      await act(async () => {
        await result.current.copy('a', 'text a');
      });
      expect(result.current.copiedKey).toBe('a');

      act(() => vi.advanceTimersByTime(1000));
      await act(async () => {
        await result.current.copy('b', 'text b');
      });
      expect(result.current.copiedKey).toBe('b');

      // The first timer's would-be fire time (1000 + 500 = 1500ms from the start)
      // must not clear key "b" — only "b"'s own 1500ms window does.
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.copiedKey).toBe('b');

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.copiedKey).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
