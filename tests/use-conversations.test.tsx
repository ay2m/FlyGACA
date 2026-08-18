import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useConversations } from '@/hooks/useConversations';
import type { Conversation } from '@/calc/chat/conversations';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  pending?: boolean;
  error?: boolean;
}

const CONV_KEY = 'flygaca:adel-conversations';

const seed: Conversation<Msg>[] = [
  {
    id: 'c1',
    title: 'What is VFR?',
    messages: [
      { role: 'user', text: 'What is VFR?' },
      { role: 'assistant', text: 'Visual flight rules…' },
    ],
    updatedAt: 1000,
  },
];

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('useConversations', () => {
  it('starts a fresh thread when the archive is empty', () => {
    const { result } = renderHook(() => useConversations<Msg>(false));
    expect(result.current.conversations).toEqual([]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeId).toBeTruthy();
  });

  it('restores the newest saved conversation on mount', () => {
    localStorage.setItem(CONV_KEY, JSON.stringify(seed));
    const { result } = renderHook(() => useConversations<Msg>(false));
    expect(result.current.activeId).toBe('c1');
    expect(result.current.messages).toHaveLength(2);
  });

  it('persists a settled turn into the archive with an auto title', () => {
    const { result } = renderHook(() => useConversations<Msg>(false));
    act(() => {
      result.current.setMessages([
        { role: 'user', text: 'Night currency?' },
        { role: 'assistant', text: 'Under §61.57…' },
      ]);
    });
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].title).toBe('Night currency?');
    expect(JSON.parse(localStorage.getItem(CONV_KEY) ?? '[]')).toHaveLength(1);
  });

  it('drops pending and error turns from what it archives', () => {
    const { result } = renderHook(() => useConversations<Msg>(false));
    act(() => {
      result.current.setMessages([
        { role: 'user', text: 'Q' },
        { role: 'assistant', text: '', pending: true },
      ]);
    });
    expect(result.current.conversations[0].messages).toHaveLength(1);
  });

  it('does not touch the archive mid-stream (busy)', () => {
    const { result, rerender } = renderHook(({ busy }) => useConversations<Msg>(busy), {
      initialProps: { busy: true },
    });
    act(() => {
      result.current.setMessages([{ role: 'user', text: 'Q' }]);
    });
    expect(result.current.conversations).toEqual([]);
    // Once the turn settles, the same messages persist.
    rerender({ busy: false });
    expect(result.current.conversations).toHaveLength(1);
  });

  it('newChat starts a fresh thread but is blocked while busy', () => {
    localStorage.setItem(CONV_KEY, JSON.stringify(seed));
    const busyHook = renderHook(() => useConversations<Msg>(true));
    const before = busyHook.result.current.activeId;
    act(() => busyHook.result.current.newChat());
    expect(busyHook.result.current.activeId).toBe(before);
    busyHook.unmount();

    localStorage.setItem(CONV_KEY, JSON.stringify(seed));
    const { result } = renderHook(() => useConversations<Msg>(false));
    act(() => result.current.newChat());
    expect(result.current.activeId).not.toBe('c1');
    expect(result.current.messages).toEqual([]);
  });

  it('selectConversation loads a saved thread', () => {
    localStorage.setItem(CONV_KEY, JSON.stringify(seed));
    const { result } = renderHook(() => useConversations<Msg>(false));
    act(() => result.current.newChat());
    act(() => result.current.selectConversation('c1'));
    expect(result.current.activeId).toBe('c1');
    expect(result.current.messages).toHaveLength(2);
  });

  it('deleteConversation removes it and resets the thread when it was active', () => {
    localStorage.setItem(CONV_KEY, JSON.stringify(seed));
    const { result } = renderHook(() => useConversations<Msg>(false));
    act(() => result.current.deleteConversation('c1'));
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeId).not.toBe('c1');
    expect(result.current.messages).toEqual([]);
  });

  it('rename and pin update the archive and survive the settle pass', () => {
    localStorage.setItem(CONV_KEY, JSON.stringify(seed));
    const { result } = renderHook(() => useConversations<Msg>(false));
    act(() => {
      result.current.rename('c1', 'My VFR notes');
      result.current.pin('c1');
    });
    const c = result.current.conversations[0];
    expect(c.title).toBe('My VFR notes');
    expect(c.renamed).toBe(true);
    expect(c.pinned).toBe(true);
    // A later settled update keeps the hand-typed title and the pin.
    act(() => {
      result.current.setMessages([
        { role: 'user', text: 'Different question' },
        { role: 'assistant', text: 'Answer' },
      ]);
    });
    const after = result.current.conversations[0];
    expect(after.title).toBe('My VFR notes');
    expect(after.pinned).toBe(true);
  });
});
