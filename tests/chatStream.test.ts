import { describe, expect, it } from 'vitest';
import {
  abortCleanup,
  applyStreamEvent,
  beginStream,
  finalizeStream,
  patchLast,
  type StreamMessage,
} from '@/calc/chat/chatStream';

const ERR = 'not ready';

const user = (text: string): StreamMessage => ({ role: 'user', text });
const placeholder = (): StreamMessage => ({
  role: 'assistant',
  text: '',
  pending: true,
  streaming: true,
});

describe('beginStream', () => {
  it('appends the user turn and a pending assistant placeholder', () => {
    const base = [user('earlier')];
    const next = beginStream(base, 'What is §91.155?');
    expect(next).toHaveLength(3);
    expect(next[1]).toEqual({ role: 'user', text: 'What is §91.155?' });
    expect(next[2]).toEqual(placeholder());
    // Pure: the base list is untouched.
    expect(base).toHaveLength(1);
  });
});

describe('patchLast', () => {
  it('replaces only the trailing message', () => {
    const list = [user('a'), placeholder()];
    const next = patchLast(list, (m) => ({ ...m, text: 'patched' }));
    expect(next[0]).toBe(list[0]);
    expect(next[1].text).toBe('patched');
    expect(list[1].text).toBe('');
  });

  it('returns an empty list unchanged', () => {
    const empty: StreamMessage[] = [];
    expect(patchLast(empty, (m) => ({ ...m, text: 'x' }))).toBe(empty);
  });
});

describe('applyStreamEvent', () => {
  const start = () => beginStream([], 'q');

  it('token: first delta clears the pending placeholder and starts from empty', () => {
    const next = applyStreamEvent(start(), { type: 'token', delta: 'Hello' }, ERR);
    const last = next[next.length - 1];
    expect(last.text).toBe('Hello');
    expect(last.pending).toBe(false);
    expect(last.streaming).toBe(true);
  });

  it('token: later deltas append to the streamed text', () => {
    let list = applyStreamEvent(start(), { type: 'token', delta: 'Hel' }, ERR);
    list = applyStreamEvent(list, { type: 'token', delta: 'lo' }, ERR);
    expect(list[list.length - 1].text).toBe('Hello');
  });

  it('reset: clears the streamed text (brain restarted)', () => {
    let list = applyStreamEvent(start(), { type: 'token', delta: 'partial' }, ERR);
    list = applyStreamEvent(list, { type: 'reset' }, ERR);
    const last = list[list.length - 1];
    expect(last.text).toBe('');
    expect(last.pending).toBe(false);
  });

  it('final: prefers the grounded answer and carries sources/kind/refusalClass', () => {
    let list = applyStreamEvent(start(), { type: 'token', delta: 'streamed' }, ERR);
    list = applyStreamEvent(
      list,
      {
        type: 'final',
        answer: 'Grounded answer',
        sources: [{ citation: '§91.155' }],
        kind: 'grounded',
        refusalClass: undefined,
      },
      ERR,
    );
    const last = list[list.length - 1];
    expect(last.text).toBe('Grounded answer');
    expect(last.sources).toEqual([{ citation: '§91.155' }]);
    expect(last.kind).toBe('grounded');
    expect(last.pending).toBe(false);
    expect(last.streaming).toBe(false);
  });

  it('final: an empty answer keeps the streamed text', () => {
    let list = applyStreamEvent(start(), { type: 'token', delta: 'streamed text' }, ERR);
    list = applyStreamEvent(list, { type: 'final', answer: '', sources: [] }, ERR);
    expect(list[list.length - 1].text).toBe('streamed text');
  });

  it('error: swaps in the fallback text and flags the message', () => {
    const next = applyStreamEvent(start(), { type: 'error' }, ERR);
    const last = next[next.length - 1];
    expect(last.text).toBe(ERR);
    expect(last.error).toBe(true);
    expect(last.pending).toBe(false);
    expect(last.streaming).toBe(false);
  });
});

describe('finalizeStream', () => {
  it('a stream that closed while still pending becomes a not-connected error', () => {
    const next = finalizeStream(beginStream([], 'q'), ERR);
    const last = next[next.length - 1];
    expect(last.text).toBe(ERR);
    expect(last.error).toBe(true);
    expect(last.pending).toBe(false);
    expect(last.streaming).toBe(false);
  });

  it('a stream that delivered text just stops animating', () => {
    const list = applyStreamEvent(beginStream([], 'q'), { type: 'token', delta: 'hi' }, ERR);
    const next = finalizeStream(list, ERR);
    const last = next[next.length - 1];
    expect(last.text).toBe('hi');
    expect(last.error).toBeUndefined();
    expect(last.streaming).toBe(false);
  });
});

describe('abortCleanup', () => {
  it('drops an assistant bubble that never received text', () => {
    const next = abortCleanup(beginStream([], 'q'));
    expect(next).toHaveLength(1);
    expect(next[0].role).toBe('user');
  });

  it('keeps a partially streamed answer and clears the transient flags', () => {
    const list = applyStreamEvent(beginStream([], 'q'), { type: 'token', delta: 'partial' }, ERR);
    const next = abortCleanup(list);
    const last = next[next.length - 1];
    expect(last.text).toBe('partial');
    expect(last.pending).toBe(false);
    expect(last.streaming).toBe(false);
  });

  it('clears flags when the last message is not an assistant bubble', () => {
    const next = abortCleanup([user('q')]);
    expect(next).toEqual([{ role: 'user', text: 'q', pending: false, streaming: false }]);
  });

  it('returns an empty list unchanged', () => {
    expect(abortCleanup([])).toEqual([]);
  });
});
