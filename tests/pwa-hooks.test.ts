import { describe, expect, it, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnline, useInstallPrompt } from '@/lib/native/pwa';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOnline()', () => {
  it('reflects navigator.onLine and reacts to online/offline events', () => {
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(navigator.onLine);

    act(() => void window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);

    act(() => void window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });
});

describe('useInstallPrompt()', () => {
  it('exposes canInstall once beforeinstallprompt fires, then clears it', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);

    const prompt = vi.fn().mockResolvedValue(undefined);
    act(() => {
      const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void> };
      e.prompt = prompt;
      window.dispatchEvent(e);
    });
    expect(result.current.canInstall).toBe(true);

    act(() => result.current.promptInstall());
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.canInstall).toBe(false);
  });
});
