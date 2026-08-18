/**
 * Client for the Fly GACA gateway. The app talks to the SAME backend as the
 * legacy site: `/api/chat` (proxied to the Captain Adel brain) and
 * `/api/content` (gated assets). We are not rebuilding the server.
 *
 * The /v1/chat contract (see the gateway↔brain CONTRACT):
 *   { message, history, product, provider, session } → { answer, sources[] }
 *
 * Requests carry the session cookie (`credentials: 'include'`). The native shell,
 * where a cross-origin cookie is unreliable, passes a bearer token instead — see
 * `getIdToken` in `lib/services/auth`. This module stays dependency-free so the
 * chat client can be unit-tested without any auth wiring.
 */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  citation: string;
  url: string;
  /** Verbatim passage the answer is grounded in, when the brain returns one. */
  verbatim?: string;
  section?: string;
  part?: string;
  /** Hierarchical lineage (present when the passage came from the chunk index). */
  subpart?: string;
  paragraph?: string;
  subParagraph?: string;
  effectiveDate?: string;
  /** Corpus revision the passage came from (e.g. "Rev 2024-06"). */
  corpusVersion?: string;
}

/** Grounding verdict from the brain. `na` (or absent) means "no badge". */
export type GroundingKind = 'grounded' | 'partial' | 'refusal' | 'na';

export interface ChatRequest {
  message: string;
  history?: ChatTurn[];
  /** Defaults to 'flygaca'. */
  product?: string;
  provider?: string;
  session?: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  kind?: GroundingKind;
  /** The cited rule when the brain refuses (e.g. "91.155(a)(2)"). */
  refusalClass?: string;
  meta?: { provider?: string };
}

/**
 * One streamed turn. `token` deltas append to the live answer; `reset` clears
 * it (the brain restarted); `final` carries the grounded answer + sources +
 * verdict; `error` signals a stream-level failure. Mirrors the legacy
 * `flygaca/assets/js/chat.js` SSE protocol.
 */
export type StreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'reset' }
  | {
      type: 'final';
      answer: string;
      sources: ChatSource[];
      kind?: GroundingKind;
      refusalClass?: string;
      meta?: { provider?: string };
    }
  | { type: 'error'; code?: string };

const API_BASE = `${String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')}/api`;

function chatBody(req: ChatRequest): string {
  return JSON.stringify({
    message: req.message,
    history: req.history ?? [],
    product: req.product ?? 'flygaca',
    provider: req.provider,
    session: req.session,
  });
}

/**
 * Sends a chat turn to the gateway (buffered). `authToken` is the native-shell
 * bearer token; on web the session cookie carries the identity instead.
 */
export async function sendChat(
  req: ChatRequest,
  authToken?: string,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: chatBody(req),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }
  return (await res.json()) as ChatResponse;
}

/**
 * Pure SSE drainer: pull every complete `data:` line out of `buffer`, returning
 * the parsed events, the unconsumed tail, and whether the `[DONE]` sentinel was
 * seen. Non-`data:` lines (`: ping` keep-alives, blank separators) are ignored;
 * a trailing partial frame is left in `rest` for the next chunk. Exported so the
 * line protocol is unit-testable without a live stream.
 */
export function drainSse(buffer: string): { events: StreamEvent[]; rest: string; done: boolean } {
  const events: StreamEvent[] = [];
  let rest = buffer;
  let nl: number;
  while ((nl = rest.indexOf('\n')) !== -1) {
    const line = rest.slice(0, nl).trim();
    rest = rest.slice(nl + 1);
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') return { events, rest: '', done: true };
    try {
      events.push(JSON.parse(payload) as StreamEvent);
    } catch {
      /* partial / malformed frame — drop it */
    }
  }
  return { events, rest, done: false };
}

/**
 * Streams a chat turn: POST `?stream=1` and yield SSE events. If the gateway
 * answers with buffered JSON instead (an older gateway, or a proxy that strips
 * streaming), yield a single synthetic `final` so callers never branch on which
 * path served.
 */
export async function* sendChatStream(
  req: ChatRequest,
  authToken?: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_BASE}/chat?stream=1`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: chatBody(req),
    signal,
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`);

  const ctype = res.headers.get('content-type') ?? '';
  if (!ctype.includes('text/event-stream') || !res.body) {
    const data = (await res.json()) as ChatResponse;
    yield {
      type: 'final',
      answer: data.answer,
      sources: data.sources ?? [],
      kind: data.kind,
      refusalClass: data.refusalClass,
      meta: data.meta,
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const drained = drainSse(buf);
    buf = drained.rest;
    for (const ev of drained.events) yield ev;
    if (drained.done) return;
  }
}

/** A 👍/👎 on an answer, sent to the gateway for offline quality review. */
export interface FeedbackRequest {
  rating: 'up' | 'down';
  session?: string;
  question?: string;
  answer?: string;
}

/**
 * Report answer feedback to the gateway (`POST /api/feedback`). Best-effort: the
 * caller fires this and ignores the outcome, so a 4xx/5xx/offline never disrupts
 * the chat. Throws on a non-OK response so tests can assert the wiring.
 */
export async function sendFeedback(
  req: FeedbackRequest,
  authToken?: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) throw new Error(`Feedback request failed: ${res.status}`);
}
