import { describe, expect, it } from "vitest";
import {
  FLYGACA_TENANT,
  RemoteBrainError,
  TRUSTED_TIER_HEADER,
  buildRemoteRequest,
  toCaptainAdelOutput,
  toChatSource,
} from "../src/remote-brain-core.js";

/**
 * The wire mapping between Captain Adel's standalone `/v1/chat` and this
 * service's `CaptainAdelOutput`.
 *
 * The seam is dormant (`ADEL_REMOTE_BASE_URL` is set on no revision), which is
 * exactly why it needs a spec: a mapping that is never exercised in production
 * and never tested is a mapping that will be wrong on the day someone switches
 * it on. The fixtures below are the response shape documented in
 * `ay2m/Captain-Adel`'s CLAUDE.md, superset fields and all.
 */

const REMOTE_FIXTURE = {
  answer: "Basic VFR weather minima are in §91.155.",
  sources: [
    {
      citation: "GACAR 91.155(a)",
      url: "/library/part-91#91-155",
      verbatim: "no person may operate an aircraft under VFR when...",
      section: "91.155",
      part: "Part 91",
      corpusVersion: "Rev 2026-05-24",
    },
  ],
  kind: "grounded",
  // Fields Captain Adel returns that this service has no column for.
  grounding: { mode: "structural", claims: 3, supported: 3 },
  suggestions: ["What are the VFR fuel requirements?"],
  meta: {
    provider: "gemini",
    model: "gemini-2.5-flash",
    rewrittenQuery: "VFR weather minima GACAR",
    toolCalls: [{ name: "search_library" }],
  },
};

describe("buildRemoteRequest", () => {
  it("asks for the flygaca tenant, which is what selects Captain Adel's framing", () => {
    expect(buildRemoteRequest({ message: "hi" }).product).toBe(FLYGACA_TENANT);
    expect(FLYGACA_TENANT).toBe("flygaca");
  });

  it("always sends an array for history, never undefined", () => {
    expect(buildRemoteRequest({ message: "hi" }).history).toEqual([]);
  });

  it("passes history and session through", () => {
    const req = buildRemoteRequest({
      message: "and at night?",
      history: [{ role: "user", content: "VFR minima?" }],
      session: "s-1",
    });
    expect(req.history).toHaveLength(1);
    expect(req.session).toBe("s-1");
  });

  it("omits session entirely when there isn't one", () => {
    expect("session" in buildRemoteRequest({ message: "hi" })).toBe(false);
  });

  it("names the trusted-tier header Captain Adel checks", () => {
    // Our own gateway already metered this caller; double-metering at the
    // second service would deny paying users at a gate they already cleared.
    expect(TRUSTED_TIER_HEADER).toBe("X-Adel-Api-Key");
  });
});

describe("toChatSource", () => {
  it("maps the fields the public contract declares", () => {
    const s = toChatSource(REMOTE_FIXTURE.sources[0]);
    expect(s).toEqual({
      citation: "GACAR 91.155(a)",
      url: "/library/part-91#91-155",
      verbatim: "no person may operate an aircraft under VFR when...",
      section: "91.155",
      part: "Part 91",
      corpusVersion: "Rev 2026-05-24",
    });
  });

  it("drops unknown keys rather than leaking them onto /api/chat", () => {
    const s = toChatSource({ citation: "GACAR 61.3", score: 12.7, chunkId: "c-99" });
    expect(Object.keys(s!).sort()).toEqual(["citation", "url"]);
  });

  it("rejects a source with no citation — an uncitable source is not a source", () => {
    expect(toChatSource({ url: "/library/part-91" })).toBeNull();
    expect(toChatSource(null)).toBeNull();
    expect(toChatSource("GACAR 91.155")).toBeNull();
  });

  it("defaults a missing url to empty rather than dropping the citation", () => {
    expect(toChatSource({ citation: "GACAR 91.155" })?.url).toBe("");
  });
});

describe("toCaptainAdelOutput", () => {
  it("maps a grounded answer with its sources and verdict", () => {
    const out = toCaptainAdelOutput(REMOTE_FIXTURE);
    expect(out.answer).toBe(REMOTE_FIXTURE.answer);
    expect(out.kind).toBe("grounded");
    expect(out.sources).toHaveLength(1);
    expect(out.meta.provider).toBe("gemini");
    expect(out.meta.retrieved).toBe(1);
    expect(out.meta.corpusVersion).toBe("Rev 2026-05-24");
  });

  it("does not pass Captain Adel's extra fields through to our contract", () => {
    const out = toCaptainAdelOutput(REMOTE_FIXTURE) as Record<string, unknown>;
    expect(out.suggestions).toBeUndefined();
    expect(out.grounding).toBeUndefined();
    expect(Object.keys(out.meta as object).sort()).toEqual([
      "corpusVersion",
      "provider",
      "retrieved",
    ]);
  });

  it("carries a refusal and its cited rule", () => {
    const out = toCaptainAdelOutput({
      answer: "I can't ground that in the regulations.",
      kind: "refusal",
      refusalClass: "91.155(a)(2)",
      sources: [],
    });
    expect(out.kind).toBe("refusal");
    expect(out.refusalClass).toBe("91.155(a)(2)");
  });

  it("degrades an unknown verdict to no-badge, never to grounded", () => {
    // The direction to fail in: a remote that stops sending a verdict must show
    // no claim of grounding, not assert one this service cannot verify.
    expect(toCaptainAdelOutput({ answer: "x", kind: "confident" }).kind).toBe("na");
    expect(toCaptainAdelOutput({ answer: "x" }).kind).toBe("na");
  });

  it("throws rather than surfacing an empty answer", () => {
    expect(() => toCaptainAdelOutput({ answer: "", sources: [] })).toThrow(RemoteBrainError);
    expect(() => toCaptainAdelOutput({ sources: [] })).toThrow(RemoteBrainError);
  });

  it("survives a malformed sources array", () => {
    const out = toCaptainAdelOutput({ answer: "x", sources: "not an array" });
    expect(out.sources).toEqual([]);
    expect(out.meta.retrieved).toBe(0);
  });

  it("falls back to the supplied corpus version when no source carries one", () => {
    const out = toCaptainAdelOutput(
      { answer: "x", sources: [{ citation: "GACAR 91.155" }] },
      "Rev 2026-05-24",
    );
    expect(out.meta.corpusVersion).toBe("Rev 2026-05-24");
  });

  it("names the remote as the provider when it does not name itself", () => {
    expect(toCaptainAdelOutput({ answer: "x" }).meta.provider).toBe("captain-adel");
  });
});
