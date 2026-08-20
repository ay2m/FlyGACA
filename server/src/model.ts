/**
 * Streaming chat-completions client — the thin I/O half of `model-core.ts`.
 *
 * Replaces the Genkit `googleAI()` SDK provider with plain OpenAI
 * chat-completions over `fetch`, so the endpoint is `MODEL_BASE_URL` / `MODEL_ID_*`
 * and the provider is config, not code. Default is Google Gemini via its
 * OpenAI-compatible endpoint; the same client works against HUMAIN's ALLaM, a
 * self-hosted ALLaM behind vLLM, or any other compatible endpoint. Personal data
 * stays in-Kingdom regardless — this hop carries none (docs/RUNBOOK-golive.md §5).
 *
 * No SDK: the surface used here is one POST and an SSE body, and a vendor SDK
 * would re-introduce exactly the coupling this change exists to remove.
 */
import { config } from "./config.js";
import {
  buildChatRequest,
  describeError,
  isModelConfigured,
  normalizeBaseUrl,
  parseSseLine,
  splitLines,
  type ChatRequestInput,
} from "./model-core.js";

/**
 * Why a model call could not be completed.
 *
 * `unconfigured` means no endpoint is set — an expected operating state while
 * Captain Adel is between providers, and the one case worth telling the user
 * about honestly rather than as a generic failure. `request` covers everything
 * else: unreachable, unauthorised, non-2xx, malformed.
 */
export type ModelErrorReason = "unconfigured" | "request";

/** Thrown when the model endpoint is unreachable, unauthorised or errors. */
export class ModelError extends Error {
  constructor(
    message: string,
    readonly reason: ModelErrorReason = "request",
  ) {
    super(message);
    this.name = "ModelError";
  }
}

/** True when `err` is a ModelError raised because no endpoint is configured. */
export function isUnconfigured(err: unknown): boolean {
  return err instanceof ModelError && err.reason === "unconfigured";
}

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
  if (!isModelConfigured(config.model.baseUrl)) {
    throw new ModelError(
      "MODEL_BASE_URL is not set — Captain Adel has no model endpoint to call. " +
        "See docs/RUNBOOK-deploy.md §4.",
      "unconfigured",
    );
  }
  const base = normalizeBaseUrl(config.model.baseUrl);

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
