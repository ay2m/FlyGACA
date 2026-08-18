import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useFetchText } from '@/hooks/useFetchText';

// The runtime content loaders. They share a loading→data / loading→error shape
// and abort on unmount; we drive them against a stubbed global fetch.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;
const okText = (body: string) =>
  ({ ok: true, status: 200, text: () => Promise.resolve(body) }) as unknown as Response;
const notFound = () => ({ ok: false, status: 404, statusText: 'Not Found' }) as unknown as Response;

describe('useFetchJson', () => {
  it('resolves to data and clears loading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ tools: [] })));
    const { result } = renderHook(() => useFetchJson<{ tools: unknown[] }>('/data/tools.json'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ tools: [] });
    expect(result.current.error).toBeNull();
  });

  it('surfaces a non-ok response as an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound()));
    const { result } = renderHook(() => useFetchJson('/data/missing.json'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toMatch(/404/);
  });

  it('refetches when the path changes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ id: 'a' }))
      .mockResolvedValueOnce(okJson({ id: 'b' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(({ p }) => useFetchJson<{ id: string }>(p), {
      initialProps: { p: '/data/a.json' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'a' }));
    rerender({ p: '/data/b.json' });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'b' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('de-duplicates concurrent loads of the same path to one fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ shared: true }));
    vi.stubGlobal('fetch', fetchMock);
    const a = renderHook(() => useFetchJson('/data/airports.json'));
    const b = renderHook(() => useFetchJson('/data/airports.json'));
    await waitFor(() => expect(a.result.current.data).toEqual({ shared: true }));
    await waitFor(() => expect(b.result.current.data).toEqual({ shared: true }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh fetch when reloadToken changes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ v: 1 }))
      .mockResolvedValueOnce(okJson({ v: 2 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(
      ({ tok }) => useFetchJson<{ v: number }>('/data/x.json', tok),
      {
        initialProps: { tok: 0 },
      },
    );
    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));
    rerender({ tok: 1 });
    await waitFor(() => expect(result.current.data).toEqual({ v: 2 }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('useFetchText', () => {
  it('resolves to text and clears loading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okText('<p>hi</p>')));
    const { result } = renderHook(() => useFetchText('/data/page.html'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.text).toBe('<p>hi</p>');
    expect(result.current.error).toBeNull();
  });

  it('errors with the status when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound()));
    const { result } = renderHook(() => useFetchText('/data/gone.html'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.text).toBeNull();
    expect(result.current.error?.message).toMatch(/404/);
  });
});
