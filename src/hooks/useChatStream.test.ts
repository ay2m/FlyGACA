import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChatStream, type ChatStreamEvent } from './useChatStream';

describe('useChatStream', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let mockReadableStream: ReadableStream<Uint8Array>;
  let controller: ReadableStreamDefaultController<Uint8Array>;

  beforeEach(() => {
    mockReadableStream = new ReadableStream<Uint8Array>((c) => {
      controller = c;
    });

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: mockReadableStream,
      status: 200,
      statusText: 'OK',
    });

    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic streaming', () => {
    it('streams tokens from SSE response', async () => {
      const onToken = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onToken,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      // Simulate SSE events
      controller.enqueue(
        encoder.encode('data: {"type":"token","content":"Hello"}\n\n')
      );
      controller.enqueue(
        encoder.encode('data: {"type":"token","content":" world"}\n\n')
      );
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onToken).toHaveBeenCalledTimes(2);
      });

      expect(onToken).toHaveBeenNthCalledWith(1, 'Hello');
      expect(onToken).toHaveBeenNthCalledWith(2, ' world');
    });

    it('calls onEvent for each SSE event', async () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onEvent,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      controller.enqueue(
        encoder.encode('data: {"type":"token","content":"test"}\n\n')
      );
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledTimes(2);
      });

      expect(onEvent).toHaveBeenNthCalledWith(1, {
        type: 'token',
        content: 'test',
      });
      expect(onEvent).toHaveBeenNthCalledWith(2, { type: 'done' });
    });

    it('calls onDone when stream finishes', async () => {
      const onDone = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onDone,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onDone).toHaveBeenCalled();
      });
    });
  });

  describe('SSE parsing', () => {
    it('handles multiline SSE events', async () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onEvent,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      // Split event across multiple chunks
      controller.enqueue(encoder.encode('data: {"type":"token",'));
      controller.enqueue(encoder.encode('"content":"split"}\n\n'));
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledTimes(2);
      });

      expect(onEvent).toHaveBeenNthCalledWith(1, {
        type: 'token',
        content: 'split',
      });
    });

    it('skips empty lines in SSE format', async () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onEvent,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      controller.enqueue(
        encoder.encode('\n\ndata: {"type":"token","content":"test"}\n\n\n\n')
      );
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledTimes(2);
      });

      expect(onEvent).toHaveBeenNthCalledWith(1, {
        type: 'token',
        content: 'test',
      });
    });

    it('handles citation events with metadata', async () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onEvent,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      const citationEvent = {
        type: 'citation',
        data: {
          section: '§91.155',
          part: '91',
          title: 'General Operating and Flight Rules',
        },
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(citationEvent)}\n\n`)
      );
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledTimes(2);
      });

      expect(onEvent).toHaveBeenNthCalledWith(1, citationEvent);
    });
  });

  describe('error handling', () => {
    it('calls onError for HTTP failures', async () => {
      const onError = vi.fn();

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onError,
        })
      );

      await result.current.stream({ message: 'Hello' });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      const error = onError.mock.calls[0][0] as Error;
      expect(error.message).toContain('HTTP 500');
    });

    it('calls onError when fetch fails', async () => {
      const onError = vi.fn();
      const fetchError = new Error('Network error');

      fetchMock.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onError,
        })
      );

      await result.current.stream({ message: 'Hello' });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(fetchError);
      });
    });

    it('gracefully handles malformed JSON in SSE', async () => {
      const onEvent = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onEvent,
          onError,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      // Send malformed JSON (will log error but not throw)
      controller.enqueue(encoder.encode('data: {invalid json}\n\n'));
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalled();
      });

      // Should process the valid 'done' event
      expect(onEvent).toHaveBeenCalledWith({ type: 'done' });
      // onError should not be called for malformed events
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('aborting streams', () => {
    it('aborts stream when abort() is called', async () => {
      const onToken = vi.fn();
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onToken,
          onError,
        })
      );

      const streamPromise = result.current.stream({ message: 'Hello' });

      result.current.abort();

      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode('data: {"type":"token","content":"test"}\n\n')
      );
      controller.close();

      await streamPromise;

      // Should not call error for AbortError
      expect(onError).not.toHaveBeenCalled();
    });

    it('stops processing events after abort', async () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onEvent,
        })
      );

      setTimeout(() => {
        result.current.abort();
      }, 10);

      const streamPromise = result.current.stream({ message: 'Hello' });

      // Try to send events after abort
      const encoder = new TextEncoder();
      try {
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      } catch {
        // Controller may be closed, that's ok
      }

      try {
        controller.close();
      } catch {
        // Already closed
      }

      await streamPromise.catch(() => {
        // Expected to fail gracefully
      });

      // Abort should prevent error callbacks
      expect(onEvent).toHaveBeenCalledTimes(0);
    });
  });

  describe('request payload', () => {
    it('sends message and conversation ID', async () => {
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          conversationId: 'conv-123',
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({ message: 'Hello' });

      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;

      const call = fetchMock.mock.calls[0];
      expect(call[1].body).toContain('Hello');
      expect(call[1].body).toContain('conv-123');
    });

    it('includes tenant ID in headers when provided', async () => {
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          tenantId: 'tenant-123',
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({ message: 'Hello' });

      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['X-Tenant-ID']).toBe('tenant-123');
    });
  });

  describe('multiple streams', () => {
    it('can start a new stream after one completes', async () => {
      const onToken = vi.fn();
      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onToken,
        })
      );

      // First stream
      let controller1: ReadableStreamDefaultController<Uint8Array>;
      let mockStream1 = new ReadableStream<Uint8Array>((c) => {
        controller1 = c;
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: mockStream1,
        status: 200,
        statusText: 'OK',
      });

      const encoder = new TextEncoder();
      const stream1Promise = result.current.stream({ message: 'First' });
      controller1!.enqueue(encoder.encode('data: {"type":"token","content":"1"}\n\n'));
      controller1!.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller1!.close();

      await stream1Promise;

      // Second stream
      let controller2: ReadableStreamDefaultController<Uint8Array>;
      let mockStream2 = new ReadableStream<Uint8Array>((c) => {
        controller2 = c;
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: mockStream2,
        status: 200,
        statusText: 'OK',
      });

      const stream2Promise = result.current.stream({ message: 'Second' });
      controller2!.enqueue(encoder.encode('data: {"type":"token","content":"2"}\n\n'));
      controller2!.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller2!.close();

      await stream2Promise;

      expect(onToken).toHaveBeenNthCalledWith(1, '1');
      expect(onToken).toHaveBeenNthCalledWith(2, '2');
    });
  });

  describe('callbacks', () => {
    it('only calls onToken for token events', async () => {
      const onToken = vi.fn();
      const onEvent = vi.fn();

      const { result } = renderHook(() =>
        useChatStream({
          apiUrl: '/api/chat',
          onToken,
          onEvent,
        })
      );

      const encoder = new TextEncoder();
      const streamPromise = result.current.stream({
        message: 'Hello',
      });

      controller.enqueue(
        encoder.encode('data: {"type":"token","content":"Hello"}\n\n')
      );
      controller.enqueue(
        encoder.encode('data: {"type":"citation","data":{}}\n\n')
      );
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
      controller.close();

      await streamPromise;
      await waitFor(() => {
        expect(onEvent).toHaveBeenCalledTimes(3);
      });

      expect(onToken).toHaveBeenCalledOnce();
      expect(onToken).toHaveBeenCalledWith('Hello');
    });
  });
});
