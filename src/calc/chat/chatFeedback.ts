/**
 * Pure helpers for the answer-quality feedback loop (👍/👎 under Captain Adel
 * replies). No DOM imports so it stays unit-testable; the page owns localStorage
 * read/write. Feedback is keyed by a stable hash of the answer text rather than a
 * message index, since regenerate/retry shift indices around.
 *
 * Local-only by design: this repo is frontend-only and the backend is unchanged,
 * so nothing is sent over the wire today. The shape is kept simple so a future
 * build could forward it to the gateway.
 */

export type Rating = 'up' | 'down';

/** Map of answer key → the rating the reader gave it. */
export type FeedbackMap = Record<string, Rating>;

/**
 * A short, stable key for an answer's text (djb2 → base36). Collisions are
 * harmless here (worst case two answers share a thumb) and the key never leaves
 * the device, so a non-cryptographic hash is the right tool.
 */
export function feedbackKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/** The rating stored for `key`, or undefined when none was given. */
export function getFeedback(map: FeedbackMap, key: string): Rating | undefined {
  return map[key];
}

/**
 * Record `rating` for `key`. Re-clicking the same rating clears it (toggle off);
 * a different rating replaces it. Pure — returns a new map.
 */
export function recordFeedback(map: FeedbackMap, key: string, rating: Rating): FeedbackMap {
  const next = { ...map };
  if (next[key] === rating) delete next[key];
  else next[key] = rating;
  return next;
}

/** Defensively parse whatever was in localStorage into a clean feedback map. */
export function normalizeFeedback(raw: unknown): FeedbackMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: FeedbackMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === 'up' || value === 'down') out[key] = value;
  }
  return out;
}
