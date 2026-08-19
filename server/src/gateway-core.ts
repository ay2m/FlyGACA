/**
 * Pure, Firebase-free request-shaping + policy for the HTTP gateway
 * (`gateway.ts`): cookie parsing, the `ChatRequest` body validator with its hard
 * input caps, and the CORS origin allowlist. Kept dependency-light like every
 * other `*-core` module so it's unit-testable with a bare import — no Admin SDK
 * or genkit boot required (see `tests/gateway-core.test.ts`). The Express /
 * Firestore wiring and the token-verification calls stay in `gateway.ts`.
 */
import type { ChatRequest, ChatTurn } from "./contract.js";

/** Parse a `Cookie` header into a name→value map without an external package. */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join("="));
    }
  });
  return list;
}

/**
 * Hard input caps (cost control, DESIGN N4). History *count* was always capped
 * (12 turns); these bound the *size* of what reaches Gemini. An over-long
 * message is rejected (400) rather than truncated — silent truncation changes
 * the question; an over-long history turn is dropped like any other malformed
 * turn.
 */
export const MESSAGE_MAX_CHARS = 4000;
export const HISTORY_CONTENT_MAX_CHARS = 8000;

/** Coerce a raw request body into a validated `ChatRequest` (or null). */
export function parseRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.message !== "string" || b.message.trim() === "") return null;
  if (b.message.length > MESSAGE_MAX_CHARS) return null;

  const history: ChatTurn[] = Array.isArray(b.history)
    ? (b.history as unknown[])
      .filter(
        (t): t is ChatTurn =>
          !!t &&
            typeof t === "object" &&
            (("role" in t &&
              ((t as ChatTurn).role === "user" ||
                (t as ChatTurn).role === "assistant")) as boolean) &&
            typeof (t as ChatTurn).content === "string" &&
            (t as ChatTurn).content.length <= HISTORY_CONTENT_MAX_CHARS,
      )
      .slice(-12) // cap history length (cost control, DESIGN N4)
    : [];

  return {
    message: b.message,
    history,
    product: typeof b.product === "string" ? b.product : "flygaca",
    provider: typeof b.provider === "string" ? b.provider : undefined,
    session: typeof b.session === "string" ? b.session : undefined,
  };
}

// CORS — explicit allowlist. Every front serves the SPA and calls this API, so the
// Origin we see is the page origin. Production fronts are listed exactly; anything
// else (a new preview host, a staging domain) is added per-revision through
// EXTRA_ALLOWED_ORIGINS rather than a code change.
export const ALLOWED_ORIGINS = new Set([
  "https://flygaca.com",
  "https://www.flygaca.com",
]);

/**
 * Project-scoped preview/deploy hosts (https only). Only suffixes of a domain we
 * actually own belong here, and the leading '.' is what stops a look-alike
 * (e.g. `evilflygaca.com`) from matching.
 *
 * `.a.run.app` deliberately is NOT listed: it is the shared Cloud Run hostname
 * suffix for every Google Cloud project, so allowlisting it would let any host
 * anyone can provision in a minute read a credentialed response. Cloud Run
 * revision/tag URLs that genuinely need CORS go in EXTRA_ALLOWED_ORIGINS as
 * exact origins.
 */
export const ALLOWED_ORIGIN_SUFFIXES = [".flygaca.com"];

export function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true; // local dev
  return (
    origin.startsWith("https://") &&
    ALLOWED_ORIGIN_SUFFIXES.some((suffix) => origin.endsWith(suffix))
  );
}
