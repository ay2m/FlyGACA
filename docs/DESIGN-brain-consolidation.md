# Design — consolidating the two Captain Adel brains

**Status:** specification. Nothing here is switched on.
**Seam:** `server/src/brain.ts`, gated on `ADEL_REMOTE_BASE_URL` (set on no revision).

---

## The problem

Captain Adel is implemented twice.

This repo has a full brain in `server/src/`: `corpus.ts` (BM25 over
`data/rag-chunks.json`), `grounding-core.ts` (the cite-or-refuse gate),
`captain-adel-prompt.ts` and `captain-adel.ts` (the flow), generating over an
OpenAI-compatible endpoint via `model.ts`.

`ay2m/Captain-Adel` has another in `src/brain/`, over its own copy of the same
GACAR corpus (`_chunks.json.gz`), and calls itself "the single source of truth".

Neither statement in the family's docs about how these relate was true:

- Captain-Adel's `CLAUDE.md` and `README.md` said its brain "also powers Fly
  GACA's API (called server-to-server with `X-Adel-Api-Key`)". Nothing in this
  repo has ever called it — there was no `X-Adel-Api-Key` anywhere in `server/`.
- Its `brain/tenants.js` ships a `flygaca` tenant whose framing has never been
  reachable, because nothing set `product: "flygaca"` against it.
- This repo's `docs/ARCHITECTURE-BLUEPRINT.md` said the two "share the retrieve →
  ground → cite contract so answers can't diverge". They had already diverged.

Both docs have since been corrected. `contracts/flygaca-family.json` now pins the
part of the contract that genuinely is shared, and each repo's CI asserts its own
half. This document covers the part a manifest cannot fix: the two brains still
answer the same question by different mechanisms.

## How far apart they actually are

| | this repo (`server/src/`) | `ay2m/Captain-Adel` (`src/brain/`) |
|---|---|---|
| Retrieval | BM25, `corpus.ts` | BM25 + optional dense (BGE-M3) + optional cross-encoder rerank |
| Chunking | flat chunks with `lineage` | chunks + **parent-child expansion** to the whole section (≤4000 chars), on by default |
| Direct citations | no fast path | exact-lookup fast path for "Part 91, §91.155" |
| Query rewriting | none | `rewrite.js` (`ADEL_REWRITE`, heuristic by default) |
| Strategies | one: retrieve-then-read | two: agentic tool-calling (Gemini/EN) and retrieve-then-read (all Arabic) |
| Arabic | same path as English | `route.js` detects Arabic ratio and routes to ALLaM/Jais/Fanar/Qwen/Command-R |
| Compute tools | none | `brain/tools/` — wind, fuel, W&B, recency, density |
| **Grounding** | **`grounding-core.ts` — gates BEFORE the model on distinct-term overlap; a weak retrieval refuses and the model is never called** | **`grounding.js` — calls the model, then extracts citations and classifies the answer (`structural` by default, `faithfulness` opt-in)** |
| Extra response fields | — | `suggestions`, `grounding`, `meta.rewrittenQuery`, `meta.toolCalls` |
| Regression gate | unit tests | `evals/` with EN+AR cases and a provider **parity gate** |

## What consolidating would buy, and what it would cost

**Gains.** One brain to maintain instead of two. Arabic provider routing, which
this repo has no equivalent of. Compute tools with deep links back to our own
calculators. Query rewriting for follow-ups. The `evals/` regression suite and
its parity gate, which is a stronger quality bar than our unit tests.

**Costs, in order of difficulty.**

1. **The grounding models are not interchangeable — this is the hard part.**
   `grounding-core.ts` is a *pre-call* gate, and its docstring records why: score
   thresholds were measured against the shipped 29,165-chunk corpus and 9 of 10
   off-topic questions cleared the "grounded" band purely by being wordy, so the
   gate was rebuilt on distinct-term overlap. Its deliberate failure direction is
   that short abbreviation queries ("ELT battery") refuse. Captain Adel has no
   equivalent: it calls the model and judges the answer afterwards. Adopting it
   means accepting a different — not obviously worse, but different and untested
   here — distribution of false refusals and false "grounded" badges on
   safety-critical material. **This needs an eval run over our own corpus before
   anything is switched on, not a code review.**
2. **Residency.** Every `/api/chat` turn would take a second network hop to
   another service. `docs/RUNBOOK-golive.md` §5 scopes our current generation hop
   as carrying no account identity. The same reasoning has to be redone for the
   remote hop, and the sub-processor disclosure updated, before this is legal to
   ship — see also `CLAUDE.md`'s standing caution that no in-Kingdom claim is
   true today.
3. **Corpus provenance.** Two copies of GACAR with no shared version stamp. A
   consolidated brain answers from Captain-Adel's copy while our library deep
   links resolve against ours; `ChatSource.corpusVersion` is the field that would
   have to carry the mismatch, and nothing currently reconciles the two.
4. **Latency and availability.** A second hop, and a hard runtime dependency on a
   service that has never been deployed for this product.
5. **Streaming.** Our SSE contract streams token deltas. The seam's remote path
   currently buffers and emits one chunk (see `brain.ts`) — deliberately, since
   an untested SSE translation is the worst thing to leave dormant. Real
   pass-through is work item 3 below.

## The seam as it stands

`gateway.ts` no longer imports `captainAdelFlow`. It calls `brain`, which has the
same shape (callable, plus `.stream()`) and resolves to:

- `ADEL_REMOTE_BASE_URL` **unset** → the local flow, unchanged. This is every
  revision. Behaviour is byte-identical to before the seam existed.
- `ADEL_REMOTE_BASE_URL` **set** → `remote-brain.ts`, which POSTs `/v1/chat` with
  `X-Adel-Api-Key` and `product: "flygaca"`.

The wire mapping is `remote-brain-core.ts`, pure and specced in
`tests/remote-brain-core.test.ts`. Two rules in it are load-bearing:

- **Unknown fields are dropped, not passed through.** Captain Adel's response is a
  superset; `/api/chat` keeps exactly what `contract.ts` declares.
- **An unrecognised verdict degrades to `na`, never `grounded`.** A remote that
  stops sending a verdict must show no claim of grounding rather than assert one
  this service cannot verify.

Our own `gateway.ts` still owns auth, quota and rate limiting, and the call is
made on the trusted tier so Captain Adel does not meter it a second time.

## If we decide to do it

1. Deploy `ay2m/Captain-Adel` for this product and confirm the trusted tier.
2. **Run `evals/` against our corpus** and compare refusal and citation rates to
   `grounding-core.ts` on the same cases. This is the gate; cost 1 above is
   decided here, on numbers, or not at all.
3. Build real SSE pass-through in `remote-brain.ts` and extend the mapper spec.
4. Redo the residency analysis and update the sub-processor disclosure.
5. Reconcile the two corpora, or make `corpusVersion` carry the divergence.
6. Switch `ADEL_REMOTE_BASE_URL` on one revision, watch, and keep the local flow
   as the rollback — it stays in the tree until the eval evidence says otherwise.

Only after all six does deleting `captain-adel.ts`, `corpus.ts` and
`grounding-core.ts` become the right change.
