/**
 * Pure reducers for a Captain Adel streaming turn — the `Message[]` transforms
 * the chat page applies as SSE events arrive. No DOM/i18n imports: the page
 * passes the translated "not ready" fallback in, and the message/event shapes
 * are structural subsets so `@/lib/api`'s `StreamEvent` and the page's
 * `Message` both satisfy them without this module importing either.
 */

/** Structural subset of the chat page's `Message` that streaming touches. */
export interface StreamMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: unknown;
  kind?: string;
  refusalClass?: string;
  pending?: boolean;
  streaming?: boolean;
  error?: boolean;
}

/** Structural subset of `@/lib/api`'s `StreamEvent` union. */
export type StreamEventLike =
  | { type: 'token'; delta: string }
  | { type: 'reset' }
  | { type: 'final'; answer: string; sources: unknown; kind?: string; refusalClass?: string }
  | { type: 'error'; code?: string };

/**
 * Replace the trailing message via `fn`. Pure counterpart of the page's
 * `patchLast`; an empty list is returned unchanged (unreachable in the page —
 * a turn always begins with a user + placeholder pair already appended).
 */
export function patchLast<M extends StreamMessage>(messages: M[], fn: (m: M) => M): M[] {
  if (messages.length === 0) return messages;
  const copy = messages.slice();
  copy[copy.length - 1] = fn(copy[copy.length - 1]);
  return copy;
}

/** Append the user turn and the pending assistant placeholder for a new stream. */
export function beginStream<M extends StreamMessage>(base: M[], question: string): M[] {
  return [
    ...base,
    { role: 'user', text: question } as M,
    { role: 'assistant', text: '', pending: true, streaming: true } as M,
  ];
}

/**
 * Apply one SSE event to the trailing (assistant) message:
 * - `token` appends the delta (a still-pending placeholder starts from empty);
 * - `reset` clears the streamed text (the brain restarted);
 * - `final` prefers the grounded answer, falling back to the streamed text, and
 *   carries sources / grounding kind / refusal class;
 * - `error` swaps in `errorText` and flags the message.
 */
export function applyStreamEvent<M extends StreamMessage>(
  messages: M[],
  ev: StreamEventLike,
  errorText: string,
): M[] {
  if (ev.type === 'token') {
    return patchLast(messages, (m) => ({
      ...m,
      text: (m.pending ? '' : m.text) + ev.delta,
      pending: false,
    }));
  }
  if (ev.type === 'reset') {
    return patchLast(messages, (m) => ({ ...m, text: '', pending: false }));
  }
  if (ev.type === 'final') {
    return patchLast(messages, (m) => ({
      ...m,
      text: ev.answer || m.text,
      sources: ev.sources,
      kind: ev.kind,
      refusalClass: ev.refusalClass,
      pending: false,
      streaming: false,
    }));
  }
  // 'error'
  return patchLast(messages, (m) => ({
    ...m,
    text: errorText,
    error: true,
    pending: false,
    streaming: false,
  }));
}

/**
 * Close out a stream that ended without an explicit event: a message still
 * pending never left the placeholder state → not connected (error + fallback
 * text); otherwise just stop the streaming animation.
 */
export function finalizeStream<M extends StreamMessage>(messages: M[], errorText: string): M[] {
  return patchLast(messages, (m) =>
    m.pending
      ? { ...m, text: errorText, error: true, pending: false, streaming: false }
      : { ...m, streaming: false },
  );
}

/**
 * User stopped the stream: keep whatever arrived, but drop an assistant bubble
 * that never received any text; otherwise clear the transient flags.
 */
export function abortCleanup<M extends StreamMessage>(messages: M[]): M[] {
  const copy = messages.slice();
  const last = copy[copy.length - 1];
  if (last?.role === 'assistant' && !last.text) copy.pop();
  else if (last) copy[copy.length - 1] = { ...last, pending: false, streaming: false };
  return copy;
}
