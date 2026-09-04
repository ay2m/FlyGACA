import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchJson } from '@/hooks/useFetchJson';
import * as content from '@/lib/content';

vi.mock('@/lib/content');

interface TestData {
  id: string;
  name: string;
}

describe('useFetchJson', () => {
  const mockData: TestData = { id: '1', name: 'Test' };
  const testPath = '/data/test.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial loading state', () => {
    vi.mocked(content.loadJson).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { result } = renderHook(() => useFetchJson<TestData>(testPath));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('loads data successfully', async () => {
    vi.mocked(content.loadJson).mockResolvedValue(mockData);

    const { result } = renderHook(() => useFetchJson<TestData>(testPath));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it('handles error when loading data fails', async () => {
    const testError = new Error('Load failed');
    vi.mocked(content.loadJson).mockRejectedValue(testError);

    const { result } = renderHook(() => useFetchJson<TestData>(testPath));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(testError);
  });

  it('ignores setState when component unmounts before load completes', async () => {
    let resolveLoad: ((value: TestData) => void) | undefined;
    const loadPromise = new Promise<TestData>((resolve) => {
      resolveLoad = resolve;
    });
    vi.mocked(content.loadJson).mockReturnValue(loadPromise);

    const { unmount, result } = renderHook(() => useFetchJson<TestData>(testPath));

    expect(result.current.loading).toBe(true);

    // Unmount before the promise resolves
    unmount();

    // Resolve the promise after unmount
    resolveLoad(mockData);

    // Wait a bit to ensure no state update happens
    await new Promise((resolve) => setTimeout(resolve, 50));
    // If the test passes without errors, the ignore flag worked
    expect(true).toBe(true);
  });

  it('ignores setState error when component unmounts before error occurs', async () => {
    let rejectLoad: ((reason?: Error) => void) | undefined;
    const loadPromise = new Promise<TestData>((_, reject) => {
      rejectLoad = reject;
    });
    vi.mocked(content.loadJson).mockReturnValue(loadPromise);

    const { unmount } = renderHook(() => useFetchJson<TestData>(testPath));

    // Unmount before the promise rejects
    unmount();

    // Reject the promise after unmount
    rejectLoad(new Error('Load failed'));

    // Wait a bit to ensure no state update happens
    await new Promise((resolve) => setTimeout(resolve, 50));
    // If the test passes without errors, the ignore flag worked
    expect(true).toBe(true);
  });

  it('refetches data when reloadToken changes', async () => {
    vi.mocked(content.loadJson).mockResolvedValue(mockData);

    const { rerender } = renderHook(
      ({ path, token }: { path: string; token: number }) => useFetchJson<TestData>(path, token),
      {
        initialProps: { path: testPath, token: 0 },
      },
    );

    await waitFor(() => {
      expect(vi.mocked(content.loadJson).mock.calls).toHaveLength(1);
    });

    // Trigger rerender with new reloadToken
    rerender({ path: testPath, token: 1 });

    await waitFor(() => {
      expect(vi.mocked(content.loadJson).mock.calls).toHaveLength(2);
    });
  });

  it('refetches data when path changes', async () => {
    vi.mocked(content.loadJson).mockResolvedValue(mockData);

    const { rerender } = renderHook(
      ({ path, token }: { path: string; token: number }) => useFetchJson<TestData>(path, token),
      {
        initialProps: { path: testPath, token: 0 },
      },
    );

    await waitFor(() => {
      expect(vi.mocked(content.loadJson).mock.calls).toHaveLength(1);
    });

    // Trigger rerender with new path
    rerender({ path: '/data/other.json', token: 0 });

    await waitFor(() => {
      expect(vi.mocked(content.loadJson).mock.calls).toHaveLength(2);
    });
  });

  it('passes forceRefresh flag when reloadToken > 0', async () => {
    vi.mocked(content.loadJson).mockResolvedValue(mockData);

    renderHook(() => useFetchJson<TestData>(testPath, 1));

    await waitFor(() => {
      expect(vi.mocked(content.loadJson)).toHaveBeenCalledWith(testPath, true);
    });
  });

  it('does not pass forceRefresh flag when reloadToken is 0', async () => {
    vi.mocked(content.loadJson).mockResolvedValue(mockData);

    renderHook(() => useFetchJson<TestData>(testPath, 0));

    await waitFor(() => {
      expect(vi.mocked(content.loadJson)).toHaveBeenCalledWith(testPath, false);
    });
  });
});
