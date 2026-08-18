/**
 * The PUBLIC `/api/chat` contract — frozen by the frontend client in
 * `src/lib/api.ts`. This gateway MUST honor it byte-for-byte so the app is
 * untouched (see docs/DESIGN-genkit-rag-backend.md §6).
 *
 * Keep these shapes in sync with `src/lib/api.ts`. They are duplicated (not
 * imported) because the functions package compiles independently.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  citation: string;
  url: string;
  /** Verbatim passage the answer is grounded in. */
  verbatim?: string;
  section?: string;
  part?: string;
  /** Hierarchical lineage (present when the passage came from the chunk index). */
  subpart?: string;
  paragraph?: string;
  subParagraph?: string;
  effectiveDate?: string;
  /** Corpus revision the passage came from (e.g. "Rev 2026-05-24"). */
  corpusVersion?: string;
}

/** Grounding verdict. `na` (or absent) means "no badge". */
export type GroundingKind = "grounded" | "partial" | "refusal" | "na";

export interface ChatRequest {
  message: string;
  history?: ChatTurn[];
  /** Defaults to "flygaca". */
  product?: string;
  /** Gemini model tier: "flash" (default) | "pro". */
  provider?: string;
  session?: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  kind?: GroundingKind;
  /** The cited rule when the brain refuses (e.g. "91.155(a)(2)"). */
  refusalClass?: string;
  meta?: { provider?: string };
}

/**
 * One streamed turn. `token` deltas append to the live answer; `reset` clears
 * it; `final` carries the grounded answer + sources + verdict; `error` signals
 * a stream-level failure. Mirrors the legacy SSE protocol drained by
 * `drainSse()` in `src/lib/api.ts`.
 */
export type StreamEvent =
  | { type: "token"; delta: string }
  | { type: "reset" }
  | {
      type: "final";
      answer: string;
      sources: ChatSource[];
      kind?: GroundingKind;
      refusalClass?: string;
      meta?: { provider?: string };
    }
  | { type: "error"; code?: string };

/**
 * Body of the `/api/feedback` endpoint — a 👍/👎 on an answer, logged for
 * offline quality analysis. Best-effort; the client ignores the response.
 */
export interface FeedbackRequest {
  rating: "up" | "down";
  session?: string;
  question?: string;
  answer?: string;
}
