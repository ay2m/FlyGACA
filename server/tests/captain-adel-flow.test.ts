/**
 * The Captain Adel RAG flow's server-side grounding logic (DESIGN §3 D3) — the
 * safety-critical part: grounding is decided from retrieval confidence, NOT
 * trusted to the model. A low-confidence retrieval yields a deterministic
 * cite-the-rule refusal and the model is never called, so a fabricated GACAR
 * figure can't be emitted. Genkit/Gemini, corpus retrieval, and telemetry are
 * mocked; buildSystem and the params stay real.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  hits: [] as { entry: Record<string, unknown>; score: number }[],
  generated: "2026-01-01",
  streamChunks: ["Under ", "GACAR..."] as string[],
  responseText: "The grounded answer.",
  sent: [] as string[],
  generateCalls: 0,
  lastModel: undefined as unknown,
}));

// A zod stand-in: every access/call returns the same proxy, so the module's
// schema construction at import time never throws (schemas are unused at runtime
// here — the mocked defineFlow ignores them).
const zStub: unknown = new Proxy(function () {}, {
  get: () => zStub,
  apply: () => zStub,
});

vi.mock("genkit", () => ({
  z: zStub,
  genkit: () => ({
    defineFlow: (
      _cfg: unknown,
      handler: (input: unknown, ctx: { sendChunk: (c: string) => void }) => unknown,
    ) =>
      Object.assign((input: unknown) => handler(input, { sendChunk: (c) => h.sent.push(c) }), {
        stream: (input: unknown) => ({
          stream: (async function* () {})(),
          output: handler(input, { sendChunk: (c) => h.sent.push(c) }),
        }),
      }),
    generateStream: (args: { model: unknown }) => {
      h.generateCalls += 1;
      h.lastModel = args.model;
      return {
        response: Promise.resolve({ text: h.responseText }),
        stream: (async function* () {
          for (const c of h.streamChunks) yield { text: c };
        })(),
      };
    },
  }),
}));

vi.mock("@genkit-ai/google-genai", () => ({
  googleAI: Object.assign(() => ({}), { model: (id: string) => ({ __model: id }) }),
}));
vi.mock("@genkit-ai/firebase", () => ({ enableFirebaseTelemetry: vi.fn() }));

vi.mock("../src/corpus.js", () => ({
  getIndex: () => Promise.resolve({ generated: h.generated, search: () => h.hits }),
  toChatSource: (entry: Record<string, unknown>, generated: string) => ({
    citation: entry.__cite,
    url: "/library",
    section: entry.__section,
    corpusVersion: `Rev ${generated}`,
  }),
}));

type Flow = {
  (input: unknown): Promise<{
    answer: string;
    sources: unknown[];
    kind: string;
    refusalClass?: string;
    meta: { provider: string; retrieved: number; corpusVersion: string };
  }>;
};

let captainAdelFlow: Flow;

beforeAll(async () => {
  Object.assign(process.env, { RETRIEVE_K: "6", REFUSE_SCORE: "1.5", GROUNDED_SCORE: "4" });
  captainAdelFlow = (await import("../src/captain-adel.js")).captainAdelFlow as unknown as Flow;
});

const hit = (score: number) => ({
  entry: { x: "verbatim passage", __cite: "GACAR Part 61 §61.107", __section: "61.107" },
  score,
});

beforeEach(() => {
  h.hits = [];
  h.sent = [];
  h.generateCalls = 0;
  h.lastModel = undefined;
  h.streamChunks = ["Under ", "GACAR..."];
  h.responseText = "The grounded answer.";
});

describe("captainAdelFlow — refusal (grounding decided server-side)", () => {
  it("refuses without calling the model when nothing is retrieved", async () => {
    const out = await captainAdelFlow({ message: "what is the airspeed of an unladen swallow?" });
    expect(out.kind).toBe("refusal");
    expect(out.answer).toContain("couldn't find this in the GACAR regulatory corpus");
    expect(out.sources).toEqual([]);
    expect(out.refusalClass).toBeUndefined();
    expect(out.meta.retrieved).toBe(0);
    expect(h.generateCalls).toBe(0); // the model is never invoked
  });

  it("refuses on a below-threshold top score and reports the closest section", async () => {
    h.hits = [hit(1.0)]; // < REFUSE_SCORE (1.5)
    const out = await captainAdelFlow({ message: "borderline query" });
    expect(out.kind).toBe("refusal");
    expect(out.refusalClass).toBe("61.107"); // section of the closest (rejected) hit
    expect(h.generateCalls).toBe(0);
  });
});

describe("captainAdelFlow — answered (model called)", () => {
  it("returns a 'partial' verdict for a mid-confidence retrieval and streams tokens", async () => {
    h.hits = [hit(2.0)]; // >= REFUSE_SCORE, < GROUNDED_SCORE
    const out = await captainAdelFlow({ message: "aeronautical experience" });
    expect(out.kind).toBe("partial");
    expect(out.answer).toBe("The grounded answer.");
    expect(out.sources).toHaveLength(1);
    expect(h.generateCalls).toBe(1);
    expect(h.sent).toEqual(["Under ", "GACAR..."]); // streamed deltas forwarded via sendChunk
  });

  it("maps prior history turns (user + assistant) into the model call", async () => {
    h.hits = [hit(5.0)];
    const out = await captainAdelFlow({
      message: "follow-up",
      history: [
        { role: "user", content: "first question" },
        { role: "assistant", content: "prior answer" },
      ],
    });
    expect(out.kind).toBe("grounded");
    expect(h.generateCalls).toBe(1);
  });

  it("returns a 'grounded' verdict for a high-confidence retrieval", async () => {
    h.hits = [hit(5.0)]; // >= GROUNDED_SCORE
    const out = await captainAdelFlow({ message: "clear match" });
    expect(out.kind).toBe("grounded");
    expect(out.meta.corpusVersion).toBe("Rev 2026-01-01");
  });
});

describe("captainAdelFlow — model selection", () => {
  it("defaults to gemini-2.5-flash", async () => {
    h.hits = [hit(5.0)];
    const out = await captainAdelFlow({ message: "q" });
    expect(out.meta.provider).toBe("gemini-2.5-flash");
    expect(h.lastModel).toEqual({ __model: "gemini-2.5-flash" });
  });

  it("selects gemini-2.5-pro when the request asks for the pro tier", async () => {
    h.hits = [hit(5.0)];
    const out = await captainAdelFlow({ message: "q", provider: "pro" });
    expect(out.meta.provider).toBe("gemini-2.5-pro");
    expect(h.lastModel).toEqual({ __model: "gemini-2.5-pro" });
  });
});
