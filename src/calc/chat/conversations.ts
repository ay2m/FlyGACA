/**
 * Pure helpers for the saved-conversations archive — Captain Adel keeps a small
 * list of recent threads instead of a single transcript. No DOM imports; the page
 * owns localStorage and id generation, these own the list maths so they stay
 * unit-testable.
 */

/** A stored turn as far as the archive cares (structural subset of the page's Message). */
export interface ArchivedMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface Conversation<M extends ArchivedMessage = ArchivedMessage> {
  id: string;
  title: string;
  messages: M[];
  /** Epoch millis of the last settled turn; drives newest-first ordering. */
  updatedAt: number;
  /** Pinned threads float to the top and survive the prune. */
  pinned?: boolean;
  /** True once the reader set the title by hand, so auto-titling won't clobber it. */
  renamed?: boolean;
}

/** Default cap on how many conversations the archive keeps. */
const MAX_CONVERSATIONS = 20;

/** Pinned first, then most-recently-updated; ties broken by id for stability. */
function byPinnedThenRecent<M extends ArchivedMessage>(
  a: Conversation<M>,
  b: Conversation<M>,
): number {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
  return b.updatedAt - a.updatedAt || a.id.localeCompare(b.id);
}

/**
 * A short title from the first user message (collapsed whitespace, trimmed to
 * `max` chars with an ellipsis). Empty when there is no user turn yet, so the
 * caller can fall back to a localized "untitled" label.
 */
export function conversationTitle(messages: ArchivedMessage[], max = 48): string {
  const first = messages.find((m) => m.role === 'user' && m.text.trim());
  if (!first) return '';
  const text = first.text.replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

/**
 * Insert or replace `conv` in `list` (matched by id), then return a new list
 * sorted newest-first and pruned to `max`. Pure — never mutates `list`.
 */
export function upsertConversation<M extends ArchivedMessage>(
  list: Conversation<M>[],
  conv: Conversation<M>,
  max = MAX_CONVERSATIONS,
): Conversation<M>[] {
  const without = list.filter((c) => c.id !== conv.id);
  return [conv, ...without].sort(byPinnedThenRecent).slice(0, max);
}

/** Drop the conversation with `id` (pure). */
export function removeConversation<M extends ArchivedMessage>(
  list: Conversation<M>[],
  id: string,
): Conversation<M>[] {
  return list.filter((c) => c.id !== id);
}

/** Set a hand-typed title on `id` (marks it `renamed` so auto-titling backs off). */
export function renameConversation<M extends ArchivedMessage>(
  list: Conversation<M>[],
  id: string,
  title: string,
): Conversation<M>[] {
  const clean = title.replace(/\s+/g, ' ').trim();
  return list.map((c) => (c.id === id ? { ...c, title: clean, renamed: true } : c));
}

/** Flip the pinned flag on `id`, then re-sort so pins float to the top. */
export function togglePin<M extends ArchivedMessage>(
  list: Conversation<M>[],
  id: string,
): Conversation<M>[] {
  return list.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)).sort(byPinnedThenRecent);
}

/**
 * Conversations whose title or any message text contains `query`
 * (case-insensitive). A blank query returns the list unchanged.
 */
export function filterConversations<M extends ArchivedMessage>(
  list: Conversation<M>[],
  query: string,
): Conversation<M>[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (c) =>
      c.title.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q)),
  );
}

/**
 * Defensively parse whatever was in localStorage into a clean conversation list:
 * skips malformed entries, coerces fields, and sorts newest-first. Anything
 * unparseable yields an empty list.
 */
export function normalizeConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  const out: Conversation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<Conversation>;
    if (typeof c.id !== 'string' || !Array.isArray(c.messages)) continue;
    const messages = c.messages.filter(
      (m): m is ArchivedMessage =>
        !!m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof (m as ArchivedMessage).text === 'string',
    );
    out.push({
      id: c.id,
      title: typeof c.title === 'string' ? c.title : '',
      messages,
      updatedAt: typeof c.updatedAt === 'number' && c.updatedAt >= 0 ? c.updatedAt : 0,
      ...(c.pinned === true ? { pinned: true } : {}),
      ...(c.renamed === true ? { renamed: true } : {}),
    });
  }
  return out.sort(byPinnedThenRecent);
}
