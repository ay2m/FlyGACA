/**
 * The 👍/👎 answer-feedback loop for Captain Adel replies: local rating state
 * (keyed by a stable hash of the answer text) plus the best-effort report to
 * `/api/feedback`. Extracted from the chat page; the page injects its own
 * storage load/persist (`chatLocal` stays page-local by design), and feedback
 * is never allowed to disrupt the chat — network failures are swallowed.
 */
import { useState } from 'react';
import { sendFeedback } from '@/lib/api';
import { getIdToken } from '@/lib/services/auth';
import { sessionId } from '@/lib/session';
import {
  feedbackKey,
  getFeedback,
  recordFeedback,
  type FeedbackMap,
  type Rating,
} from '@/calc/chat/chatFeedback';

interface FeedbackTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatFeedbackApi {
  feedback: FeedbackMap;
  /** Record (or toggle off) a 👍/👎 on the answer at `idx`, persist, and report it. */
  rate(idx: number, rating: Rating): void;
}

export function useChatFeedback(opts: {
  messages: readonly FeedbackTurn[];
  load: () => FeedbackMap;
  persist: (map: FeedbackMap) => void;
}): ChatFeedbackApi {
  const { messages, load, persist } = opts;
  const [feedback, setFeedback] = useState<FeedbackMap>(load);

  function rate(idx: number, rating: Rating) {
    const text = messages[idx]?.text;
    if (!text) return;
    const key = feedbackKey(text);
    // Re-clicking the same thumb clears it; only forward genuine ratings.
    const cleared = getFeedback(feedback, key) === rating;
    setFeedback((prev) => {
      const next = recordFeedback(prev, key, rating);
      persist(next);
      return next;
    });
    if (cleared) return;
    const question = messages[idx - 1]?.role === 'user' ? messages[idx - 1].text : undefined;
    void getIdToken()
      .then((tok) => tok ?? undefined)
      .then((token) =>
        sendFeedback({ rating, session: sessionId(), question, answer: text }, token),
      )
      .catch(() => {
        /* feedback is non-critical; never disrupt the chat */
      });
  }

  return { feedback, rate };
}
