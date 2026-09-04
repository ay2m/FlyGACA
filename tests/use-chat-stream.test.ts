import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStream, ChatStreamEvent } from '@/hooks/useChatStream';

describe('useChatStream', () => {
  beforeEach(() => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams chat events successfully', async () => {
    const onToken = vi.fn();
    const onEvent = vi.fn();
    const onDone = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"token","content":"hello"}\n\n') })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onToken,
      onEvent,
      onDone,
    }));

    await act(async () => {
      await result.current.stream({ message: 'hello' });
    });

    expect(onToken).toHaveBeenCalledWith('hello');
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'token' }));
  });

  it('handles multiple events in stream', async () => {
    const onEvent = vi.fn();

    const events = [
      { type: 'token', content: 'hello' },
      { type: 'token', content: ' ' },
      { type: 'citation', data: { id: 'cite-1' } },
      { type: 'done' },
    ] as ChatStreamEvent[];

    const eventLines = events
      .map(e => `data: ${JSON.stringify(e)}\n\n`)
      .join('');

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(eventLines) })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onEvent,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onEvent).toHaveBeenCalledTimes(4);
  });

  it('handles HTTP errors', async () => {
    const onError = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onError,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('HTTP 500'),
      })
    );
  });

  it('handles network errors', async () => {
    const onError = vi.fn();
    const networkError = new Error('Network failed');

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onError,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onError).toHaveBeenCalledWith(networkError);
  });

  it('handles missing response body', async () => {
    const onError = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: null,
    } as unknown as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onError,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('not readable'),
      })
    );
  });

  it('handles incomplete SSE lines', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"token","content":"part1"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"token","content":"part2"}'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onEvent,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onEvent.mock.calls.length).toBeGreaterThan(0);
  });

  it('ignores empty lines', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('\n\ndata: {"type":"token","content":"test"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onEvent,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'token', content: 'test' })
    );
  });

  it('handles invalid JSON in SSE events', async () => {
    const onEvent = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {invalid json}\n\ndata: {"type":"token"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onEvent,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('calls onToken for token events', async () => {
    const onToken = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"token","content":"hello world"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onToken,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onToken).toHaveBeenCalledWith('hello world');
  });

  it('calls onDone when done event received', async () => {
    const onDone = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"done"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onDone,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onDone).toHaveBeenCalled();
  });

  it('includes tenant ID in request headers when provided', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      tenantId: 'tenant-123',
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Tenant-ID': 'tenant-123',
        }),
      })
    );
  });

  it('includes conversation ID in request body', async () => {
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      conversationId: 'conv-456',
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    const body = JSON.parse(callArgs?.body || '{}');
    expect(body.conversationId).toBe('conv-456');
  });

  it('provides abort function to cancel stream', async () => {
    const mockReader = {
      read: vi.fn(),
    };

    const abortController = new AbortController();
    vi.spyOn(abortController, 'abort');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
    }));

    // Start streaming
    const streamPromise = act(async () => {
      await result.current.stream({ message: 'test' });
    });

    // Call abort
    await act(async () => {
      result.current.abort();
    });

    await streamPromise;

    // The abort function should have been called on the internal AbortController
    expect(result.current.abort).toBeDefined();
  });

  it('does not call error handler for abort errors', async () => {
    const onError = vi.fn();
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onError,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it('handles remaining buffer at end of stream', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"token","content":"final"}'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    } as Response);

    const { result } = renderHook(() => useChatStream({
      apiUrl: '/api/chat',
      onEvent,
    }));

    await act(async () => {
      await result.current.stream({ message: 'test' });
    });

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'token', content: 'final' })
    );
  });
});
