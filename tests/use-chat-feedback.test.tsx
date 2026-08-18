import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const sendFeedback = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/lib/api', () => ({ sendFeedback }));
vi.mock('@/lib/services/auth', () => ({ getIdToken: () => Promise.resolve('id-token') }));
vi.mock('@/lib/session', () => ({ sessionId: () => 'sess-1' }));

import { useChatFeedback } from '@/hooks/useChatFeedback';
import { feedbackKey, type FeedbackMap } from '@/calc/chat/chatFeedback';

const messages = [
  { role: 'user' as const, text: 'What is night currency?' },
  { role: 'assistant' as const, text: 'Under §61.57 you need…' },
];

function setup(initial: FeedbackMap = {}) {
  const persist = vi.fn();
  const hook = renderHook(() =>
    useChatFeedback({ messages, load: () => initial, persist }),
  );
  return { hook, persist };
}

beforeEach(() => sendFeedback.mockClear());
afterEach(cleanup);

describe('useChatFeedback', () => {
  it('records a rating, persists it, and reports it with the question', async () => {
    const { hook, persist } = setup();
    await act(async () => hook.result.current.rate(1, 'up'));
    const key = feedbackKey(messages[1].text);
    expect(hook.result.current.feedback[key]).toBe('up');
    expect(persist).toHaveBeenCalledWith({ [key]: 'up' });
    expect(sendFeedback).toHaveBeenCalledWith(
      {
        rating: 'up',
        session: 'sess-1',
        question: messages[0].text,
        answer: messages[1].text,
      },
      'id-token',
    );
  });

  it('re-clicking the same thumb clears it without reporting', async () => {
    const key = feedbackKey(messages[1].text);
    const { hook, persist } = setup({ [key]: 'up' });
    await act(async () => hook.result.current.rate(1, 'up'));
    expect(hook.result.current.feedback[key]).toBeUndefined();
    expect(persist).toHaveBeenCalledWith({});
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it('ignores an index with no answer text', async () => {
    const { hook, persist } = setup();
    await act(async () => hook.result.current.rate(9, 'down'));
    expect(persist).not.toHaveBeenCalled();
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it('a failed report never disrupts the recorded rating', async () => {
    sendFeedback.mockRejectedValueOnce(new Error('offline'));
    const { hook } = setup();
    await act(async () => hook.result.current.rate(1, 'down'));
    expect(hook.result.current.feedback[feedbackKey(messages[1].text)]).toBe('down');
  });
});
