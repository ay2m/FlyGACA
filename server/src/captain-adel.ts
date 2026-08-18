/**
 * The Captain Adel RAG flow (DESIGN §3, §6.2). Powered by Gemini via Genkit.
 * It is PROTOCOL-AGNOSTIC: it streams token deltas via `sendChunk` and returns
 * a typed final object. The gateway maps that to the legacy SSE frames or
 * buffered JSON — Genkit's own wire format never reaches the public edge.
 *
 * Grounding is computed SERVER-SIDE from retrieval confidence (DESIGN §3 D3),
 * not trusted to the model: a low-confidence retrieval yields a cite-the-rule
 * refusal and the model is not even called, so we never emit a fabricated
 * GACAR figure. This is the server-side twin of the site-wide <Disclaimer/>.
 */
import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { getIndex, toChatSource } from "./corpus.js";
import { buildSystem } from "./captain-adel-prompt.js";
import type { ChatTurn, GroundingKind } from "./contract.js";

const ai = genkit({ plugins: [googleAI()] });

/** Read a numeric tuning knob from the environment, falling back to its default. */
function tune(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

// How many passages to retrieve and feed as context.
const TOP_K = tune("RETRIEVE_K", 6);

// BM25 score thresholds (DESIGN §10 — tune against a recall eval set; these are
// conservative v1 defaults). Below MIN ⇒ refuse without calling the model;
// below GROUNDED ⇒ answer but flag "partially grounded".
const MIN_SCORE = tune("REFUSE_SCORE", 1.5);
const GROUNDED_SCORE = tune("GROUNDED_SCORE", 4);

const SOURCE_SCHEMA = z.object({
  citation: z.string(),
  url: z.string(),
  verbatim: z.string().optional(),
  section: z.string().optional(),
  part: z.string().optional(),
  subpart: z.string().optional(),
  paragraph: z.string().optional(),
  subParagraph: z.string().optional(),
  effectiveDate: z.string().optional(),
  corpusVersion: z.string().optional(),
});

const INPUT_SCHEMA = z.object({
  message: z.string(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  product: z.string().optional(),
  provider: z.string().optional(),
  session: z.string().optional(),
});

const OUTPUT_SCHEMA = z.object({
  answer: z.string(),
  sources: z.array(SOURCE_SCHEMA),
  kind: z.enum(["grounded", "partial", "refusal", "na"]),
  refusalClass: z.string().optional(),
  meta: z.object({
    provider: z.string(),
    retrieved: z.number(),
    corpusVersion: z.string(),
  }),
});

export type CaptainAdelOutput = z.infer<typeof OUTPUT_SCHEMA>;

/** Map the request's `provider` (Gemini tier) to a concrete model id. */
function modelFor(provider: string | undefined): string {
  const tier = (provider ?? "flash").toLowerCase();
  return tier === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
}

function refusalMessage(): string {
  return (
    "I couldn't find this in the GACAR regulatory corpus I have access to. " +
    "Please verify against the official GACA source, or rephrase your question. " +
    "(Fly GACA is an independent, educational tool and is not affiliated with GACA.)\n\n" +
    "لم أتمكن من العثور على ذلك في نصوص اللوائح المتاحة لي. " +
    "يرجى التحقق من المصدر الرسمي للهيئة العامة للطيران المدني أو إعادة صياغة سؤالك."
  );
}

function toGenkitMessages(history: ChatTurn[] | undefined) {
  return (history ?? []).map((t) => ({
    role: t.role === "assistant" ? ("model" as const) : ("user" as const),
    content: [{ text: t.content }],
  }));
}

/**
 * Captain Adel flow. Streams token deltas (string) and returns the grounded
 * answer + sources + verdict.
 */
export const captainAdelFlow = ai.defineFlow(
  {
    name: "captainAdelFlow",
    inputSchema: INPUT_SCHEMA,
    outputSchema: OUTPUT_SCHEMA,
    streamSchema: z.string(),
  },
  async (req, { sendChunk }): Promise<CaptainAdelOutput> => {
    const provider = modelFor(req.provider);
    const index = await getIndex();
    const hits = index.search(req.message, TOP_K);
    const corpusVersion = `Rev ${index.generated}`;
    const top = hits[0]?.score ?? 0;

    // Low retrieval confidence ⇒ deterministic refusal; do not call the model.
    if (hits.length === 0 || top < MIN_SCORE) {
      const refusalClass = hits[0]
        ? toChatSource(hits[0].entry, index.generated).section
        : undefined;
      return {
        answer: refusalMessage(),
        sources: [],
        kind: "refusal",
        refusalClass,
        meta: { provider, retrieved: hits.length, corpusVersion },
      };
    }

    const sources = hits.map((h) => toChatSource(h.entry, index.generated));
    const contextBlock = hits
      .map((h, i) => {
        const s = sources[i];
        return `[${i + 1}] (${s.citation}) ${h.entry.x ?? ""}`.trim();
      })
      .join("\n\n");

    const { response, stream } = ai.generateStream({
      model: googleAI.model(provider),
      system: buildSystem(contextBlock),
      messages: toGenkitMessages(req.history),
      prompt: req.message,
      config: { temperature: 0.2 },
    });

    for await (const chunk of stream) {
      if (chunk.text) sendChunk(chunk.text);
    }
    const answer = (await response).text;

    const kind: GroundingKind = top >= GROUNDED_SCORE ? "grounded" : "partial";
    return {
      answer,
      sources,
      kind,
      meta: { provider, retrieved: hits.length, corpusVersion },
    };
  },
);
