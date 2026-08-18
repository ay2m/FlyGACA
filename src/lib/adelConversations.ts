/**
 * Shared access to Captain Adel's saved-conversation archive. The chat page
 * owns writes; the dashboard reads the same storage to surface recent threads.
 * Extracted from Chat.tsx so both stay on one storage key and one defensive
 * parse (including the one-time legacy single-transcript migration).
 */
import {
  conversationTitle,
  normalizeConversations,
  type ArchivedMessage,
  type Conversation,
} from '@/calc/chat/conversations';

const TRANSCRIPT_KEY = 'flygaca:adel-transcript';
const CONV_KEY = 'flygaca:adel-conversations';

export function newConversationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  );
}

/**
 * Restore the saved conversation archive. Falls back to a one-time migration of
 * the legacy single transcript (`flygaca:adel-transcript`) into one conversation.
 */
export function loadConversations<
  M extends ArchivedMessage = ArchivedMessage,
>(): Conversation<M>[] {
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (raw) return normalizeConversations(JSON.parse(raw)) as Conversation<M>[];
  } catch {
    /* ignore */
  }
  try {
    const legacy = localStorage.getItem(TRANSCRIPT_KEY);
    if (legacy) {
      const msgs = JSON.parse(legacy) as M[];
      if (Array.isArray(msgs) && msgs.length > 0) {
        return [
          {
            id: newConversationId(),
            title: conversationTitle(msgs),
            messages: msgs,
            updatedAt: Date.now(),
          },
        ];
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function persistConversations<M extends ArchivedMessage>(list: Conversation<M>[]): void {
  try {
    localStorage.setItem(CONV_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private-mode errors */
  }
}
