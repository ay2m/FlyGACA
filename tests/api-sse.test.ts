import { describe, expect, it } from 'vitest';
import { drainSse, type StreamEvent } from '@/lib/api';

describe('drainSse — SSE line protocol', () => {
  it('parses complete data: frames and reports no leftover', () => {
    const buf =
      'data: {"type":"token","delta":"Hello"}\n' + 'data: {"type":"token","delta":" world"}\n';
    const { events, rest, done } = drainSse(buf);
    expect(done).toBe(false);
    expect(rest).toBe('');
    expect(events).toEqual<StreamEvent[]>([
      { type: 'token', delta: 'Hello' },
      { type: 'token', delta: ' world' },
    ]);
  });

  it('keeps a trailing partial frame in rest for the next chunk', () => {
    const { events, rest } = drainSse('data: {"type":"token","delta":"A"}\ndata: {"type":"to');
    expect(events).toEqual([{ type: 'token', delta: 'A' }]);
    expect(rest).toBe('data: {"type":"to');
    // The continuation parses once the rest of the frame arrives.
    const next = drainSse(rest + 'ken","delta":"B"}\n');
    expect(next.events).toEqual([{ type: 'token', delta: 'B' }]);
  });

  it('stops at the [DONE] sentinel and clears the buffer', () => {
    const buf = 'data: {"type":"final","answer":"ok","sources":[]}\ndata: [DONE]\ndata: ignored\n';
    const { events, rest, done } = drainSse(buf);
    expect(done).toBe(true);
    expect(rest).toBe('');
    expect(events).toEqual([{ type: 'final', answer: 'ok', sources: [] }]);
  });

  it('ignores keep-alive comments, blank lines, and malformed frames', () => {
    const buf = ': ping\n' + '\n' + 'data: not-json\n' + 'data: {"type":"reset"}\n';
    const { events } = drainSse(buf);
    expect(events).toEqual([{ type: 'reset' }]);
  });
});
