import { describe, expect, it } from 'vitest';
import {
  conversationTitle,
  upsertConversation,
  removeConversation,
  renameConversation,
  togglePin,
  filterConversations,
  normalizeConversations,
  type Conversation,
} from '@/calc/chat/conversations';

const conv = (id: string, updatedAt: number, title = id): Conversation => ({
  id,
  title,
  messages: [{ role: 'user', text: title }],
  updatedAt,
});

describe('conversationTitle', () => {
  it('uses the first user message, collapsing whitespace', () => {
    expect(conversationTitle([{ role: 'user', text: '  hello   there ' }])).toBe('hello there');
  });

  it('truncates long titles with an ellipsis', () => {
    expect(conversationTitle([{ role: 'user', text: 'x'.repeat(60) }], 10)).toBe('xxxxxxxxx…');
  });

  it('is empty when there is no user turn', () => {
    expect(conversationTitle([{ role: 'assistant', text: 'hi' }])).toBe('');
    expect(conversationTitle([])).toBe('');
  });
});

describe('upsertConversation', () => {
  it('replaces by id and re-sorts newest-first', () => {
    const list = [conv('a', 100), conv('b', 200)];
    const next = upsertConversation(list, conv('a', 300));
    expect(next.map((c) => c.id)).toEqual(['a', 'b']);
    expect(next[0].updatedAt).toBe(300);
  });

  it('prepends a new conversation and prunes to max', () => {
    const list = [conv('a', 100), conv('b', 90)];
    const next = upsertConversation(list, conv('c', 200), 2);
    expect(next.map((c) => c.id)).toEqual(['c', 'a']);
  });
});

describe('removeConversation', () => {
  it('drops the matching id without mutating the input', () => {
    const list = [conv('a', 1), conv('b', 2)];
    expect(removeConversation(list, 'a').map((c) => c.id)).toEqual(['b']);
    expect(list).toHaveLength(2);
  });
});

describe('renameConversation', () => {
  it('sets a cleaned title and marks it renamed', () => {
    const next = renameConversation([conv('a', 1)], 'a', '  My  chat ');
    expect(next[0]).toMatchObject({ title: 'My chat', renamed: true });
  });
});

describe('togglePin', () => {
  it('pins a conversation and floats it above more-recent ones', () => {
    const list = [conv('a', 100), conv('b', 200)];
    const next = togglePin(list, 'a');
    expect(next.map((c) => c.id)).toEqual(['a', 'b']);
    expect(next[0].pinned).toBe(true);
  });

  it('unpins on a second toggle', () => {
    const pinned = togglePin([conv('a', 1)], 'a');
    expect(togglePin(pinned, 'a')[0].pinned).toBe(false);
  });

  it('keeps pinned threads through the prune', () => {
    const list = togglePin([conv('a', 1), conv('b', 2), conv('c', 3)], 'a');
    const next = upsertConversation(list, conv('d', 400), 2);
    expect(next.map((c) => c.id)).toContain('a'); // pinned survived
  });
});

describe('filterConversations', () => {
  const list = [
    {
      id: 'a',
      title: 'Weather minima',
      messages: [{ role: 'user' as const, text: 'VFR' }],
      updatedAt: 2,
    },
    {
      id: 'b',
      title: 'Licensing',
      messages: [{ role: 'user' as const, text: 'CPL hours' }],
      updatedAt: 1,
    },
  ];

  it('matches on title, case-insensitively', () => {
    expect(filterConversations(list, 'weather').map((c) => c.id)).toEqual(['a']);
  });

  it('matches on message text', () => {
    expect(filterConversations(list, 'cpl').map((c) => c.id)).toEqual(['b']);
  });

  it('returns the whole list for a blank query', () => {
    expect(filterConversations(list, '   ')).toHaveLength(2);
  });
});

describe('normalizeConversations', () => {
  it('keeps valid entries, drops malformed ones, sorts newest-first', () => {
    const raw = [
      { id: 'a', title: 'A', messages: [{ role: 'user', text: 'hi' }], updatedAt: 10 },
      { id: 'b', messages: [{ role: 'user', text: 'yo' }], updatedAt: 20 },
      { id: 'bad', messages: 'nope' },
      null,
      42,
    ];
    const out = normalizeConversations(raw);
    expect(out.map((c) => c.id)).toEqual(['b', 'a']);
    expect(out[1].title).toBe('A');
  });

  it('filters non-message items inside a conversation', () => {
    const raw = [
      {
        id: 'a',
        messages: [{ role: 'user', text: 'ok' }, { role: 'x', text: 'no' }, { role: 'user' }, null],
        updatedAt: 1,
      },
    ];
    expect(normalizeConversations(raw)[0].messages).toEqual([{ role: 'user', text: 'ok' }]);
  });

  it('returns an empty list for non-arrays', () => {
    expect(normalizeConversations(null)).toEqual([]);
    expect(normalizeConversations({})).toEqual([]);
  });

  it('preserves pinned/renamed flags and sorts pinned first', () => {
    const raw = [
      { id: 'a', title: 'A', messages: [{ role: 'user', text: 'hi' }], updatedAt: 100 },
      {
        id: 'b',
        title: 'B',
        messages: [{ role: 'user', text: 'yo' }],
        updatedAt: 1,
        pinned: true,
        renamed: true,
      },
    ];
    const out = normalizeConversations(raw);
    expect(out.map((c) => c.id)).toEqual(['b', 'a']); // pinned floats up despite older
    expect(out[0]).toMatchObject({ pinned: true, renamed: true });
  });
});
