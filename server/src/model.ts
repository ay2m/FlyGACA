/**
 * Streaming chat-completions client — the thin I/O half of `model-core.ts`.
 *
 * Replaces the Genkit `googleAI()` provider. Fly GACA keeps user data in-Kingdom
 * (Cloud Run + Cloud SQL in me-central2), and Gemini was the one call that left
 * it; pointing this at a Saudi-hosted endpoint closes that gap. It speaks plain
 * OpenAI chat-completions over `fetch`, so it works against HUMAIN's ALLaM
 * service, a self-hosted ALLaM behind vLLM, or any other compatible endpoint,
 * chosen entirely by `MODEL_BASE_URL` / `MODEL_ID_*`.
 *
 * No SDK: the surface used here is one POST and an SSE body, and a vendor SDK
 * would re-introduce exactly the coupling this change exists to remove.
 */
import { config } from "./config.js";
import {
  buildChatRequest,
  describeError,
  parseSseLine,
  splitLines,
  type ChatRequestInput,
} from "./model-core.js";

/** Thrown when the model endpoint is unreachable, unauthorised or errors. */
export class ModelError extends Error {}

/**
 * Stream the answer as token deltas.
 *
 * Async generator rather than a callback so the caller decides what to do with
 * each delta (the flow both forwards it to the client and accumulates it), and
 * so back-pressure is the consumer's.
 */
export async function* streamChat(
  input: Omit<ChatRequestInput, "temperature"> & { temperature?: number },
  signal?: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const base = config.model.baseUrl.replace(/\/+$/, "");
  if (!base) {
    throw new ModelError(
      "MODEL_BASE_URL is not set — Captain Adel has no model endpoint to call. " +
        "See docs/RUNBOOK-deploy.md §4.",
    );
  }

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.model.apiKey ? { Authorization: `Bearer ${config.model.apiKey}` } : {}),
      },
      body: JSON.stringify(buildChatRequest({ ...input, temperature: input.temperature })),
      signal,
    });
  } catch (err) {
    throw new ModelError(`model request failed: ${(err as Error).message}`);
  }

  if (!res.ok || !res.body) {
    const body = res.body ? await res.text().catch(() => "") : "";
    throw new ModelError(describeError(res.status, body));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { lines, rest } = splitLines(buffer);
      buffer = rest;

      for (const line of lines) {
        const event = parseSseLine(line);
        if (event.kind === "done") return;
        if (event.kind === "delta") yield event.text;
      }
    }

    // A stream that ended without [DONE] may still have a complete final frame
    // sitting in the buffer; dropping it would truncate the last token.
    const tail = parseSseLine(buffer);
    if (tail.kind === "delta") yield tail.text;
  } finally {
    await reader.cancel().catch(() => {});
  }
}
