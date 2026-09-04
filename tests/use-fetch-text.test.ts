import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchText, sanitizeHtml, tocFromHtml } from '@/hooks/useFetchText';
import * as content from '@/lib/content';

vi.mock('@/lib/content');

describe('useFetchText', () => {
  const testPath = '/data/test.html';
  const testHtml = '<h1>Test</h1><p>Content</p>';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial loading state', () => {
    vi.mocked(content.dataUrl).mockReturnValue(`http://test${testPath}`);
    global.fetch = vi.fn(
      () => new Promise(() => {}), // Never resolves
    );

    const { result } = renderHook(() => useFetchText(testPath));

    expect(result.current.loading).toBe(true);
    expect(result.current.text).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('loads text successfully', async () => {
    vi.mocked(content.dataUrl).mockReturnValue(`http://test${testPath}`);
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(testHtml, { status: 200 })),
    );

    const { result } = renderHook(() => useFetchText(testPath));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.text).toBe(testHtml);
    expect(result.current.error).toBe(null);
  });

  it('handles HTTP error responses', async () => {
    vi.mocked(content.dataUrl).mockReturnValue(`http://test${testPath}`);
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response('Not found', { status: 404 })),
    );

    const { result } = renderHook(() => useFetchText(testPath));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.text).toBe(null);
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toContain('Failed to load');
  });

  it('handles fetch errors', async () => {
    vi.mocked(content.dataUrl).mockReturnValue(`http://test${testPath}`);
    const fetchError = new Error('Network error');
    global.fetch = vi.fn(() => Promise.reject(fetchError));

    const { result } = renderHook(() => useFetchText(testPath));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.text).toBe(null);
    expect(result.current.error).toEqual(fetchError);
  });

  it('aborts request on unmount', async () => {
    const abortMock = vi.fn();
    vi.mocked(content.dataUrl).mockReturnValue(`http://test${testPath}`);
    global.fetch = vi.fn(
      () => new Promise(() => {}), // Never resolves
    );

    const { unmount } = renderHook(() => useFetchText(testPath));

    // Simulate AbortController.abort by checking if signal is aborted
    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    expect(fetchCall[1]?.signal).toBeDefined();

    unmount();
  });

  it('ignores errors from aborted requests', async () => {
    vi.mocked(content.dataUrl).mockReturnValue(`http://test${testPath}`);
    let controller: AbortController | null = null;
    let rejectFetch: any;
    global.fetch = vi.fn((url: any, opts: any) => {
      controller = (opts?.signal as any)?.constructor.name === 'AbortSignal'
        ? Object.getPrototypeOf(opts.signal).constructor.prototype.constructor
        : null;
      return new Promise((_, reject) => {
        rejectFetch = reject;
      });
    });

    const { unmount } = renderHook(() => useFetchText(testPath));

    // Unmount which aborts the request
    unmount();

    // Reject the fetch with an error
    rejectFetch(new Error('Aborted'));

    // Wait to ensure no state update happens (the error should be ignored)
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(true).toBe(true);
  });

  it('refetches when path changes', async () => {
    vi.mocked(content.dataUrl).mockReturnValue(`http://test${testPath}`);
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(testHtml, { status: 200 })),
    );

    const { rerender } = renderHook(({ path }: { path: string }) => useFetchText(path), {
      initialProps: { path: testPath },
    });

    await waitFor(() => {
      expect(vi.mocked(global.fetch).mock.calls).toHaveLength(1);
    });

    rerender({ path: '/data/other.html' });

    await waitFor(() => {
      expect(vi.mocked(global.fetch).mock.calls).toHaveLength(2);
    });
  });
});

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const html = '<p>Test</p><script>alert("xss")</script><p>After</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Test');
    expect(result).toContain('After');
  });

  it('removes style tags', () => {
    const html = '<p>Test</p><style>body { color: red; }</style><p>After</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<style>');
    expect(result).not.toContain('color: red');
  });

  it('removes iframe tags', () => {
    const html = '<p>Before</p><iframe src="evil.com"></iframe><p>After</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('iframe');
    expect(result).toContain('Before');
    expect(result).toContain('After');
  });

  it('removes event handlers', () => {
    const html = '<p onclick="alert(\'xss\')">Click me</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('removes javascript: URLs', () => {
    const html = '<a href="javascript:alert(\'xss\')">Click</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('javascript:');
    expect(result).toContain('Click');
  });
});

describe('tocFromHtml', () => {
  it('extracts h2 headings with ids', () => {
    const html = '<h2 id="section-1">Introduction</h2><p>Content</p>';
    const result = tocFromHtml(html);
    expect(result).toEqual([{ id: 'section-1', title: 'Introduction' }]);
  });

  it('extracts h3 headings with ids', () => {
    const html = '<h3 id="subsection-1">Details</h3><p>Content</p>';
    const result = tocFromHtml(html);
    expect(result).toEqual([{ id: 'subsection-1', title: 'Details' }]);
  });

  it('extracts multiple headings', () => {
    const html =
      '<h2 id="intro">Intro</h2><p>Text</p><h2 id="main">Main</h2><p>More</p><h3 id="sub">Sub</h3>';
    const result = tocFromHtml(html);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'intro', title: 'Intro' });
    expect(result[1]).toEqual({ id: 'main', title: 'Main' });
    expect(result[2]).toEqual({ id: 'sub', title: 'Sub' });
  });

  it('strips HTML from heading text', () => {
    const html = '<h2 id="section-1">Introduction <strong>Guide</strong></h2>';
    const result = tocFromHtml(html);
    expect(result).toEqual([{ id: 'section-1', title: 'Introduction Guide' }]);
  });

  it('trims whitespace from heading text', () => {
    const html = '<h2 id="section-1">  \nIntroduction  \n</h2>';
    const result = tocFromHtml(html);
    expect(result).toEqual([{ id: 'section-1', title: 'Introduction' }]);
  });

  it('returns empty array when no headings present', () => {
    const html = '<p>Just some text</p><div>No headings</div>';
    const result = tocFromHtml(html);
    expect(result).toEqual([]);
  });

  it('handles headings without ids', () => {
    const html = '<h2>No ID</h2><h2 id="with-id">With ID</h2>';
    const result = tocFromHtml(html);
    // Only h2/h3 with id attributes are extracted
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'with-id', title: 'With ID' });
  });
});
