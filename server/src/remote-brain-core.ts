/**
 * The pure half of the remote-brain client: translating Captain Adel's standalone
 * `/v1/chat` shape into this service's `CaptainAdelOutput`.
 *
 * WHY THIS EXISTS
 *
 * This repo and `ay2m/Captain-Adel` each run a full implementation of the same
 * retrieve → ground → cite contract, over their own copy of the GACAR corpus.
 * That duplication is the family's oldest piece of drift: Captain-Adel's docs
 * have long claimed its brain "also powers Fly GACA's API (called server-to-server
 * with X-Adel-Api-Key)", which has never been true — nothing here has ever called
 * it. The two have since diverged in ways that matter (see
 * `docs/DESIGN-brain-consolidation.md` for the full field-by-field comparison and
 * the migration plan).
 *
 * The seam is deliberately inert today: `brain.ts` uses the local flow unless
 * `ADEL_REMOTE_BASE_URL` is set, and it is set nowhere. This module exists so
 * that when the consolidation is made, the wire mapping is already written,
 * reviewed and unit-tested against the real response shape rather than invented
 * under deploy pressure.
 *
 * Kept pure and dependency-free in the same style as `billing-core`, `auth-core`
 * and the rest — the network half is `remote-brain.ts`.
 */
import type { ChatSource, ChatTurn, GroundingKind } from "./contract.js";
import type { CaptainAdelOutput } from "./captain-adel.js";

/** The tenant string Captain Adel frames its answers with for this product. */
export const FLYGACA_TENANT = "flygaca";

/** The header Captain Adel checks for its trusted, unmetered tier. */
export const TRUSTED_TIER_HEADER = "X-Adel-Api-Key";

/** The subset of Captain Adel's `/v1/chat` response this service consumes. */
export interface RemoteChatResponse {
  answer?: unknown;
  sources?: unknown;
  kind?: unknown;
  refusalClass?: unknown;
  /** Captain Adel's own grounding block. Informational — `kind` is the verdict. */
  grounding?: unknown;
  /** "Keep exploring" chips. This service has no surface for them yet. */
  suggestions?: unknown;
  meta?: { provider?: unknown; model?: unknown; rewrittenQuery?: unknown; toolCalls?: unknown };
}

/** The request body Captain Adel's `/v1/chat` expects. */
export interface RemoteChatRequest {
  message: string;
  history: ChatTurn[];
  product: string;
  session?: string;
}

/** Thrown when the remote brain answers with something this service can't use. */
export class RemoteBrainError extends Error {}

const GROUNDING_KINDS: readonly GroundingKind[] = ["grounded", "partial", "refusal", "na"];

/** Build the wire request. `product` is what selects Captain Adel's tenant framing. */
export function buildRemoteRequest(req: {
  message: string;
  history?: ChatTurn[];
  session?: string;
}): RemoteChatRequest {
  return {
    message: req.message,
    history: req.history ?? [],
    product: FLYGACA_TENANT,
    ...(req.session ? { session: req.session } : {}),
  };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Map one remote source onto a `ChatSource`.
 *
 * Captain Adel shapes its sources in `brain/grounding.js` and may carry fields
 * this service has no column for; unknown keys are dropped rather than passed
 * through, so the public `/api/chat` contract stays exactly what
 * `contract.ts` declares.
 */
export function toChatSource(raw: unknown): ChatSource | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const citation = str(r.citation);
  if (!citation) return null;
  return {
    citation,
    url: str(r.url) ?? "",
    ...(str(r.verbatim) ? { verbatim: str(r.verbatim)! } : {}),
    ...(str(r.section) ? { section: str(r.section)! } : {}),
    ...(str(r.part) ? { part: str(r.part)! } : {}),
    ...(str(r.subpart) ? { subpart: str(r.subpart)! } : {}),
    ...(str(r.paragraph) ? { paragraph: str(r.paragraph)! } : {}),
    ...(str(r.subParagraph) ? { subParagraph: str(r.subParagraph)! } : {}),
    ...(str(r.effectiveDate) ? { effectiveDate: str(r.effectiveDate)! } : {}),
    ...(str(r.corpusVersion) ? { corpusVersion: str(r.corpusVersion)! } : {}),
  };
}

/**
 * Map a whole `/v1/chat` response onto `CaptainAdelOutput`.
 *
 * An absent or unrecognised `kind` becomes `"na"` — "no badge" — never
 * `"grounded"`. A remote that stops sending a verdict must degrade to showing no
 * claim of grounding, not to asserting one this service cannot verify.
 */
export function toCaptainAdelOutput(
  body: RemoteChatResponse,
  fallbackCorpusVersion = "",
): CaptainAdelOutput {
  const answer = str(body.answer);
  if (!answer) {
    throw new RemoteBrainError("remote brain returned no answer");
  }

  const sources = Array.isArray(body.sources)
    ? body.sources.map(toChatSource).filter((s): s is ChatSource => s !== null)
    : [];

  const kind = GROUNDING_KINDS.includes(body.kind as GroundingKind)
    ? (body.kind as GroundingKind)
    : "na";

  return {
    answer,
    sources,
    kind,
    ...(str(body.refusalClass) ? { refusalClass: str(body.refusalClass)! } : {}),
    meta: {
      provider: str(body.meta?.provider) ?? "captain-adel",
      retrieved: sources.length,
      corpusVersion: sources.find((s) => s.corpusVersion)?.corpusVersion ?? fallbackCorpusVersion,
    },
  };
}
