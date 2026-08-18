/**
 * Pure validation for the `/api/feedback` endpoint, kept separate from the
 * Express gateway so it is unit-testable without booting firebase-admin (the
 * same pattern as `billing-core.ts`). The gateway logs the parsed feedback for
 * offline analysis; there is no datastore wired yet, so the shape stays small.
 */

export type FeedbackRating = "up" | "down";

export interface FeedbackInput {
  rating: FeedbackRating;
  session?: string;
  /** The user's question this rating is about (trimmed, capped). */
  question?: string;
  /** The assistant answer being rated (trimmed, capped). */
  answer?: string;
}

/** Max chars we retain for the free-text fields — enough to triage, not store essays. */
const MAX_TEXT = 2000;

function cleanText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, MAX_TEXT) : undefined;
}

/** Coerce a raw request body into a validated `FeedbackInput`, or null if invalid. */
export function parseFeedback(body: unknown): FeedbackInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.rating !== "up" && b.rating !== "down") return null;
  return {
    rating: b.rating,
    session: cleanText(b.session),
    question: cleanText(b.question),
    answer: cleanText(b.answer),
  };
}
