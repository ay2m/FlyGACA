import { describe, expect, it } from "vitest";
import {
  parseCookies,
  parseRequest,
  isAllowedOrigin,
  MESSAGE_MAX_CHARS,
  HISTORY_CONTENT_MAX_CHARS,
} from "../src/gateway-core.js";

// gateway-core holds the gateway's pure, Firebase-free request-shaping + policy,
// so it's tested with a bare import — no Admin SDK / genkit mocks (unlike
// gateway.test.ts, which still mocks those to exercise `authenticate`).

describe("parseCookies", () => {
  it("returns an empty map for an absent header", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("")).toEqual({});
  });

  it("parses a single cookie", () => {
    expect(parseCookies("session=abc")).toEqual({ session: "abc" });
  });

  it("parses multiple semicolon-separated cookies and trims names", () => {
    expect(parseCookies("session=abc; theme=dark")).toEqual({ session: "abc", theme: "dark" });
  });

  it("URL-decodes the value and keeps '=' inside it", () => {
    expect(parseCookies("token=a%20b=c")).toEqual({ token: "a b=c" });
  });
});

describe("parseRequest", () => {
  it("rejects a non-object body", () => {
    expect(parseRequest(null)).toBeNull();
    expect(parseRequest("hello")).toBeNull();
    expect(parseRequest(42)).toBeNull();
  });

  it("rejects a missing or blank message", () => {
    expect(parseRequest({})).toBeNull();
    expect(parseRequest({ message: "" })).toBeNull();
    expect(parseRequest({ message: "   " })).toBeNull();
  });

  it("accepts a minimal message and defaults product to flygaca", () => {
    const out = parseRequest({ message: "what is VMC?" });
    expect(out).toMatchObject({ message: "what is VMC?", product: "flygaca", history: [] });
    expect(out?.provider).toBeUndefined();
    expect(out?.session).toBeUndefined();
  });

  it("passes through optional product / provider / session", () => {
    const out = parseRequest({
      message: "hi",
      product: "captain-adel",
      provider: "pro",
      session: "s1",
    });
    expect(out).toMatchObject({ product: "captain-adel", provider: "pro", session: "s1" });
  });

  it("keeps only well-formed history turns", () => {
    const out = parseRequest({
      message: "hi",
      history: [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "system", content: "drop me" }, // bad role
        { role: "user", content: 5 }, // bad content type
        "nope", // not an object
      ],
    });
    expect(out?.history).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
    ]);
  });

  it("caps history to the most recent 12 turns", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: "user" as const,
      content: String(i),
    }));
    const out = parseRequest({ message: "hi", history });
    expect(out?.history).toHaveLength(12);
    expect(out?.history?.[0]?.content).toBe("8"); // 20 - 12
    expect(out?.history?.at(-1)?.content).toBe("19");
  });

  it("treats a non-array history as empty", () => {
    expect(parseRequest({ message: "hi", history: "oops" })?.history).toEqual([]);
  });

  it("accepts a message at the size cap and rejects one over it", () => {
    expect(parseRequest({ message: "m".repeat(MESSAGE_MAX_CHARS) })).not.toBeNull();
    expect(parseRequest({ message: "m".repeat(MESSAGE_MAX_CHARS + 1) })).toBeNull();
  });

  it("drops an oversized history turn but keeps its valid siblings", () => {
    const out = parseRequest({
      message: "hi",
      history: [
        { role: "user", content: "a" },
        { role: "assistant", content: "b".repeat(HISTORY_CONTENT_MAX_CHARS + 1) },
        { role: "assistant", content: "c".repeat(HISTORY_CONTENT_MAX_CHARS) },
      ],
    });
    expect(out?.history).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "c".repeat(HISTORY_CONTENT_MAX_CHARS) },
    ]);
  });
});

describe("isAllowedOrigin", () => {
  it("allows the exact production origins", () => {
    expect(isAllowedOrigin("https://flygaca.com")).toBe(true);
    expect(isAllowedOrigin("https://www.flygaca.com")).toBe(true);
  });

  it("allows localhost / 127.0.0.1 dev origins on any port", () => {
    expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1")).toBe(true);
  });

  it("allows https project-scoped preview suffixes", () => {
    expect(isAllowedOrigin("https://staging.flygaca.com")).toBe(true);
    expect(isAllowedOrigin("https://flygaca-api-abc123-uc.a.run.app")).toBe(true);
  });

  it("rejects look-alike hosts that only end with a bare domain", () => {
    expect(isAllowedOrigin("https://evilflygaca.com")).toBe(false);
    expect(isAllowedOrigin("https://flygaca.com.evil.example")).toBe(false);
  });

  it("rejects a non-https preview origin and unknown origins", () => {
    expect(isAllowedOrigin("http://staging.flygaca.com")).toBe(false);
    expect(isAllowedOrigin("https://example.com")).toBe(false);
  });
});
