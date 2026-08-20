/**
 * Pure helpers for the chat-completions call — no fetch, no config, no I/O, so
 * the wire format can be unit-tested without a provider (see the `*-core.ts`
 * convention in CLAUDE.md). `model.ts` is the thin HTTP wrapper.
 *
 * The target is the OpenAI **chat-completions** shape, which is the de-facto
 * interface for Saudi-hosted inference: HUMAIN serves ALLaM on Groq in Dammam,
 * and Groq's API is OpenAI-compatible, as is vLLM if the model is self-hosted on
 * a GPU in me-central2. Nothing here is ALLaM-specific — the model id and base
 * URL are configuration, so moving between in-Kingdom providers is an env
 * change, not a code change. That portability is the point: it is what let this
 * service drop Gemini without picking a new lock-in.
 */

/** One turn as the chat-completions API wants it. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Prior turns in this conversation, in the app's own shape. */
export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestInput {
  model: string;
  /** The grounding preamble built from retrieved corpus passages. */
  system: string;
  history?: HistoryTurn[];
  /** The current user question. */
  message: string;
  temperature?: number;
}

/** Model ids per request tier, resolved from config. */
export interface ModelTiers {
  fast: string;
  pro: string;
}

/**
 * Normalise a configured base URL: trimmed, without trailing slashes. Returns ""
 * for anything that cannot address an endpoint, so callers get one answer to
 * "is there somewhere to POST to" instead of each re-deriving it.
 */
export function normalizeBaseUrl(baseUrl: string | null | undefined): string {
  return typeof baseUrl === "string" ? baseUrl.trim().replace(/\/+$/, "") : "";
}

/**
 * Whether a model endpoint is configured at all.
 *
 * Deliberately a predicate over the value rather than a read of `config`, so it
 * stays pure and both callers — the health report and the request path — agree
 * by construction. "Unconfigured" is a supported state, not a bug: Fly GACA ships
 * with no default endpoint so that an unconfigured deploy refuses to call
 * anything rather than sending Saudi regulatory questions somewhere unintended.
 */
export function isModelConfigured(baseUrl: string | null | undefined): boolean {
  return normalizeBaseUrl(baseUrl).length > 0;
}

/**
 * Map the request's tier to a concrete model id.
 *
 * The public contract still calls this `provider` and still accepts "pro" — that
 * is a paid-plan signal from the client, not a vendor name, so it outlived the
 * move off Gemini unchanged.
 */
export function modelFor(tier: string | undefined, tiers: ModelTiers): string {
  return (tier ?? "fast").toLowerCase() === "pro" ? tiers.pro : tiers.fast;
}

/**
 * Build the request body. System prompt first, then history, then the live
 * question — history is NOT trusted to carry its own system turn, so a client
 * cannot displace the grounding preamble by replaying a crafted transcript.
 */
export function buildChatRequest(input: ChatRequestInput): {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  stream: true;
} {
  const messages: ChatMessage[] = [{ role: "system", content: input.system }];
  for (const turn of input.history ?? []) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: "user", content: input.message });

  return {
    model: input.model,
    messages,
    temperature: input.temperature ?? 0.2,
    stream: true,
  };
}

/** What one SSE `data:` line meant. */
export type SseEvent =
  | { kind: "delta"; text: string }
  | { kind: "done" }
  | { kind: "ignore" };

/**
 * Interpret a single line of the response stream.
 *
 * Tolerant on purpose: providers differ on keep-alive comments, blank lines and
 * whether a final chunk carries an empty delta alongside `finish_reason`. Only
 * `[DONE]` ends the stream; anything unparseable is ignored rather than thrown,
 * because killing a half-streamed answer over one malformed frame is worse than
 * dropping the frame.
 */
export function parseSseLine(line: string): SseEvent {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(":")) return { kind: "ignore" };
  if (!trimmed.startsWith("data:")) return { kind: "ignore" };

  const payload = trimmed.slice("data:".length).trim();
  if (payload === "[DONE]") return { kind: "done" };

  try {
    const parsed: unknown = JSON.parse(payload);
    const text = (parsed as { choices?: { delta?: { content?: unknown } }[] })?.choices?.[0]?.delta
      ?.content;
    return typeof text === "string" && text.length > 0
      ? { kind: "delta", text }
      : { kind: "ignore" };
  } catch {
    return { kind: "ignore" };
  }
}

/**
 * Split a decoded chunk into complete lines, returning the trailing partial for
 * the next chunk. An SSE frame can be cut anywhere, including mid-JSON, so a
 * naive `split("\n")` per chunk silently drops tokens under load.
 */
export function splitLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts, rest };
}

/** Non-2xx bodies are provider-shaped; surface something actionable in the log. */
export function describeError(status: number, body: string): string {
  let detail = body.slice(0, 500);
  try {
    const parsed: unknown = JSON.parse(body);
    const message = (parsed as { error?: { message?: unknown } })?.error?.message;
    if (typeof message === "string") detail = message;
  } catch {
    /* keep the raw prefix */
  }
  return `model request failed (${status}): ${detail}`;
}
