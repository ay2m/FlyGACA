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
import { config } from "./config.js";
import { getIndex, toChatSource } from "./corpus.js";
import { buildSystem } from "./captain-adel-prompt.js";
import { gradeRetrieval } from "./grounding-core.js";
import type { ChatTurn } from "./contract.js";

// The plugin only reads GEMINI_API_KEY / GOOGLE_API_KEY on its own, so
// GOOGLE_GENAI_API_KEY — the name .env.example and the deploy runbook use — has
// to be handed over explicitly. Omit the option when unset so the plugin's own
// env-var fallback still applies.
const ai = genkit({
  plugins: [googleAI(config.genaiApiKey ? { apiKey: config.genaiApiKey } : {})],
});

/** Read a numeric tuning knob from the environment, falling back to its default. */
function tune(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

// How many passages to retrieve and feed as context.
const TOP_K = tune("RETRIEVE_K", 6);

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

    // Grade the retrieval on distinct-term overlap, not raw score — see
    // `grounding-core.ts` for why the old score thresholds let off-topic
    // questions through.
    const verdict = gradeRetrieval({
      matched: hits[0]?.matched ?? 0,
      queryTerms: index.queryTermCount(req.message),
      topScore: hits[0]?.score ?? 0,
    });

    // Nothing usable retrieved ⇒ deterministic refusal; do not call the model,
    // so a fabricated GACAR figure can never be emitted.
    if (verdict === "refusal") {
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

    return {
      answer,
      sources,
      kind: verdict,
      meta: { provider, retrieved: hits.length, corpusVersion },
    };
  },
);
