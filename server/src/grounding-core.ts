/**
 * Grounding policy — the pure half of Captain Adel's "do we actually have the
 * rule?" decision. Kept out of `captain-adel.ts` (which owns the Genkit client)
 * so the gate is unit-testable without a model call, in the same shape as the
 * billing/staff/school cores.
 *
 * WHY THIS IS NOT A SCORE THRESHOLD
 *
 * The gate used to compare the top BM25 score against fixed thresholds. BM25's
 * score is a *sum* over query terms, so it grows with query length regardless of
 * relevance: measured against the shipped 29,165-chunk corpus, 9 of 10 off-topic
 * questions ("who won the world cup in 2018 and what was the final score") cleared
 * the grounded threshold purely by being wordy, while the "partial" band never
 * fired once. Normalising by query length does not fix it either — verbose but
 * genuine questions score *below* off-topic ones, because both are mostly filler.
 * Nor does term rarity: "translate good morning into french and spanish" matches
 * the rarest terms in the whole corpus, since rare-and-irrelevant beats
 * common-and-relevant on idf.
 *
 * What actually separates them is how many *distinct* query terms co-occur in one
 * passage. A real regulatory question lands 3-5 terms in a single chunk; an
 * off-topic one lands 1-2 stray words in an unrelated chunk, whatever its score.
 * So the gate keys off term overlap, with the score kept only as a floor.
 *
 * KNOWN LIMITATION — short abbreviation queries refuse
 *
 * A two-word query whose subject is an abbreviation ("ELT battery") retrieves the
 * right chunk, but that chunk is short enough (median 136 chars) not to contain
 * the second word, so it reads as 1-of-2 overlap. Measured against the corpus,
 * "ELT battery" and "laptop battery" produce an *identical* signature — same
 * overlap, same coverage, same score band. Term statistics cannot separate them,
 * so both refuse. That is the deliberate direction to fail in: for a regulatory
 * assistant a false refusal costs a rephrase, while a false "grounded" puts a
 * wrong figure in front of a student under an authoritative badge. Recovering
 * these queries needs a signal this module does not have — whether the matched
 * term appears in the passage *heading* (the ELT chunk is titled "Emergency
 * locator transmitter (ELT)"; the laptop one is titled "Practical Training
 * Topics"). That is the recommended next step, not a threshold change.
 */
import type { GroundingKind } from "./contract.js";

/** What the gate needs to know about the best-matching passage. */
export interface RetrievalEvidence {
  /** Distinct query terms present in the top passage. */
  matched: number;
  /** Distinct non-stopword terms in the query (the coverage denominator). */
  queryTerms: number;
  /** BM25 score of the top passage, used only as a floor. */
  topScore: number;
}

/** Tunable bounds. Exported so the tests pin the same numbers the flow uses. */
export const GROUNDING = {
  /** Below this the passage is noise regardless of overlap. */
  minScore: 1.5,
  /** Distinct-term overlap that stands on its own, however long the question. */
  strongMatch: 3,
  /** Fraction of the question's terms the passage must cover to be "grounded". */
  groundedCoverage: 0.6,
  /** Below this, a two-term overlap is coincidence rather than a topic match. */
  minPairCoverage: 0.5,
} as const;

/**
 * Grade a retrieval into the verdict the client badges.
 *
 * - `refusal` — answer from the corpus is not available; the model is not called.
 * - `partial` — the topic is present but the question is broader than what was
 *   retrieved (a rambling question, or one only adjacent to the corpus).
 * - `grounded` — the passage covers the question.
 */
export function gradeRetrieval(evidence: RetrievalEvidence): GroundingKind {
  const { matched, queryTerms, topScore } = evidence;
  if (queryTerms <= 0 || matched <= 0) return "refusal";
  if (!Number.isFinite(topScore) || topScore < GROUNDING.minScore) return "refusal";

  const coverage = matched / queryTerms;

  // A single matched term only counts when it *is* the question ("MEL",
  // "logbook"). One stray word inside a long question is noise.
  if (matched < 2) return coverage >= 1 ? "grounded" : "refusal";

  // Two terms out of many is the signature of an off-topic question brushing an
  // unrelated chunk ("chocolate cake" → 2/7), so it needs real coverage to pass.
  if (matched === 2 && coverage < GROUNDING.minPairCoverage) return "refusal";

  // Well-covered question: the passage answers what was actually asked.
  if (coverage >= GROUNDING.groundedCoverage) return "grounded";

  // Enough overlap to be on-topic, but the question ranged wider than the
  // passage — say so rather than badging it fully grounded.
  return matched >= GROUNDING.strongMatch ? "partial" : "refusal";
}
