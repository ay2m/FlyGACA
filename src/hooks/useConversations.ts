/**
 * The Captain Adel thread state in one hook: the live `messages` list, the
 * saved-conversations archive, and the localStorage persistence that ties them
 * together. Extracted from the chat page so the archive choreography (auto-title,
 * pin/rename survival, settle-time persistence) is unit-testable; the page keeps
 * only streaming and rendering. Pure list maths live in
 * `@/calc/chat/conversations`; storage access in `@/lib/adelConversations`.
 */
import { useEffect, useState } from 'react';
import {
  conversationTitle,
  removeConversation,
  renameConversation,
  togglePin,
  upsertConversation,
  type ArchivedMessage,
  type Conversation,
} from '@/calc/chat/conversations';
import {
  loadConversations,
  newConversationId,
  persistConversations,
} from '@/lib/adelConversations';

/** The page's message shape as far as archiving cares. */
type ThreadMessage = ArchivedMessage & { pending?: boolean; error?: boolean };

export interface ConversationsApi<M extends ThreadMessage> {
  conversations: Conversation<M>[];
  activeId: string;
  messages: M[];
  /** The page streams straight into the thread with this (same as useState's). */
  setMessages: React.Dispatch<React.SetStateAction<M[]>>;
  /** Start a fresh thread; the current one is already saved in the archive. */
  newChat(): void;
  /** Load a saved conversation into the composer. */
  selectConversation(id: string): void;
  /** Delete a saved conversation; if it was active, drop into a fresh thread. */
  deleteConversation(id: string): void;
  /** Give a saved conversation a hand-typed title. */
  rename(id: string, title: string): void;
  /** Pin/unpin a saved conversation so it floats to the top of History. */
  pin(id: string): void;
}

export function useConversations<M extends ThreadMessage>(busy: boolean): ConversationsApi<M> {
  const [conversations, setConversations] = useState<Conversation<M>[]>(() =>
    loadConversations<M>(),
  );
  const [activeId, setActiveId] = useState<string>(
    () => conversations[0]?.id ?? newConversationId(),
  );
  const [messages, setMessages] = useState<M[]>(() => conversations[0]?.messages ?? []);

  /** Apply a pure list transform and persist the result in the same update. */
  const mutate = (fn: (prev: Conversation<M>[]) => Conversation<M>[]) =>
    setConversations((prev) => {
      const next = fn(prev);
      persistConversations(next);
      return next;
    });

  function newChat() {
    if (busy) return;
    setMessages([]);
    setActiveId(newConversationId());
  }

  function selectConversation(id: string) {
    if (busy) return;
    const c = conversations.find((x) => x.id === id);
    if (!c) return;
    setActiveId(id);
    setMessages(c.messages);
  }

  function deleteConversation(id: string) {
    mutate((prev) => removeConversation(prev, id));
    if (id === activeId) {
      setMessages([]);
      setActiveId(newConversationId());
    }
  }

  const rename = (id: string, title: string) =>
    mutate((prev) => renameConversation(prev, id, title));
  const pin = (id: string) => mutate((prev) => togglePin(prev, id));

  // Persist the active thread into the archive once a turn settles (not mid-stream).
  useEffect(() => {
    if (busy) return;
    const keep = messages.filter((m) => !m.pending && !m.error);
    setConversations((prev) => {
      const prior = prev.find((c) => c.id === activeId);
      const next =
        keep.length === 0
          ? removeConversation(prev, activeId)
          : upsertConversation(prev, {
              id: activeId,
              // A hand-typed title wins; otherwise auto-title from the first turn.
              title: prior?.renamed ? prior.title : conversationTitle(keep),
              messages: keep,
              updatedAt: Date.now(),
              ...(prior?.pinned ? { pinned: true } : {}),
              ...(prior?.renamed ? { renamed: true } : {}),
            });
      persistConversations(next);
      return next;
    });
  }, [messages, busy, activeId]);

  return {
    conversations,
    activeId,
    messages,
    setMessages,
    newChat,
    selectConversation,
    deleteConversation,
    rename,
    pin,
  };
}
