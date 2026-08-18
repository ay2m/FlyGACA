import { describe, expect, it, vi, afterEach } from 'vitest';
import { sendChat, sendChatStream, type ChatRequest, type StreamEvent } from '@/lib/api';

// The pure SSE line-parser (drainSse) is covered in api-sse.test.ts. These tests
// exercise the fetch wrappers around it: header injection, the non-OK throw, the
// streamed path (buffering across reads), and the buffered-JSON fallback the
// gateway falls back to on a Firebase rollback.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const REQ: ChatRequest = { message: 'What is the VFR cloud minimum?' };

/** A buffered (non-stream) JSON response. */
const jsonRes = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

/** A streamed response that hands out `chunks` one read() at a time. */
function streamRes(chunks: string[], ctype = 'text/event-stream'): Response {
  const enc = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? ctype : null) },
    body: {
      getReader: () => ({
        read: () =>
          i < chunks.length
            ? Promise.resolve({ done: false, value: enc.encode(chunks[i++]) })
            : Promise.resolve({ done: true, value: undefined }),
      }),
    },
  } as unknown as Response;
}

/** A non-stream response (content-type JSON) — the gateway fallback path. */
const fallbackRes = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    body: {},
    json: () => Promise.resolve(body),
  }) as unknown as Response;

async function collect(gen: AsyncGenerator<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

describe('sendChat — buffered turn', () => {
  it('posts to /api/chat and resolves the parsed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ answer: 'See 91.155', sources: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await sendChat(REQ);

    expect(res).toEqual({ answer: 'See 91.155', sources: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('fills request defaults (product flygaca, empty history) in the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ answer: '', sources: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await sendChat({ message: 'hi' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ message: 'hi', product: 'flygaca', history: [] });
  });

  it('sends the session cookie, and a bearer token when the native shell supplies one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ answer: '', sources: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await sendChat(REQ, 'id-token');

    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers.Authorization).toBe('Bearer id-token');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  it('omits the auth headers when no tokens are supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ answer: '', sources: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await sendChat(REQ);

    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-Firebase-AppCheck']).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  it('throws with the status code on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response));
    await expect(sendChat(REQ)).rejects.toThrow('Chat request failed: 503');
  });
});

describe('sendChatStream — streamed turn', () => {
  it('requests the stream endpoint with the SSE Accept header and credentials', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(streamRes(['data: {"type":"reset"}\ndata: [DONE]\n']));
    vi.stubGlobal('fetch', fetchMock);

    await collect(sendChatStream(REQ, 'id-token'));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat?stream=1');
    expect(init.headers.Accept).toBe('text/event-stream');
    expect(init.headers.Authorization).toBe('Bearer id-token');
    expect(init.credentials).toBe('include');
  });

  it('yields events parsed across read() boundaries until [DONE]', async () => {
    // A single frame is split across two chunks to prove the inter-read buffer
    // hands the trailing partial frame to the next decode.
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamRes([
            'data: {"type":"token","delta":"Hel',
            'lo"}\ndata: {"type":"final","answer":"Hello","sources":[]}\ndata: [DONE]\ndata: dropped\n',
          ]),
        ),
    );

    const events = await collect(sendChatStream(REQ));

    expect(events).toEqual<StreamEvent[]>([
      { type: 'token', delta: 'Hello' },
      { type: 'final', answer: 'Hello', sources: [] },
    ]);
  });

  it('synthesizes one final event when the gateway answers with buffered JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fallbackRes({
          answer: 'Buffered answer',
          sources: [{ citation: '91.155', url: '/x' }],
          kind: 'grounded',
          refusalClass: undefined,
          meta: { provider: 'legacy' },
        }),
      ),
    );

    const events = await collect(sendChatStream(REQ));

    expect(events).toEqual<StreamEvent[]>([
      {
        type: 'final',
        answer: 'Buffered answer',
        sources: [{ citation: '91.155', url: '/x' }],
        kind: 'grounded',
        refusalClass: undefined,
        meta: { provider: 'legacy' },
      },
    ]);
  });

  it('defaults sources to an empty array in the buffered-JSON fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fallbackRes({ answer: 'no sources' })));
    const events = await collect(sendChatStream(REQ));
    expect(events[0]).toMatchObject({ type: 'final', answer: 'no sources', sources: [] });
  });

  it('throws with the status code on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await expect(collect(sendChatStream(REQ))).rejects.toThrow('Chat request failed: 500');
  });
});
