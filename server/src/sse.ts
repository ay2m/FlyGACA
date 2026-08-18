/**
 * SSE frame serialization for the legacy chat protocol. This is the single
 * place that owns the wire format the frontend's `drainSse()` parses
 * (`src/lib/api.ts`): one JSON object per `data:` line, a `[DONE]` sentinel to
 * close, and `: ping` comments as keep-alives. Keeping it isolated makes the
 * contract (DESIGN §6.1) unit-testable and a future protocol swap a one-file
 * change.
 */
import type { StreamEvent } from "./contract.js";

/** Serialize one event as an SSE `data:` frame (including the blank-line terminator). */
export function frame(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** The sentinel that ends a stream. */
export function doneFrame(): string {
  return "data: [DONE]\n\n";
}

/** A keep-alive comment line; ignored by the client parser. */
export function pingFrame(): string {
  return ": ping\n\n";
}

/** The headers an SSE response must set. */
export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Defeat proxy buffering so token deltas flush promptly.
  "X-Accel-Buffering": "no",
};
