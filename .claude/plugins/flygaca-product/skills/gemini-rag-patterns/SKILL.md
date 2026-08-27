---
name: gemini-rag-patterns
description: The procedure for changing retrieval, generation, grounding or citations in the Captain Adel flow — the provider-as-config wire format, the refuse-rather-than-guess rule, the two-brain seam, and the contract change that forces three PRs. Use when an answer cites the wrong Part, refuses when it shouldn't, or when touching contract.ts.
---

# Changing how an answer is produced

Role context belongs to the `rag-grounding` agent. This is the procedure.

The promise is narrow and absolute: **cite the exact Part and section, or
refuse.** An answer that sounds right and cannot be traced to retrieved GACAR
text is worse than no answer — a pilot being able to check it is the only asset
this product has.

## The wire, and what is config rather than code

- `/api/chat` and `/api/feedback` are the gateway; the licensed `/v1/ask`
  surface is tiered and API-key-authenticated (`api-tier-core.ts`,
  `docs/LICENSED-API.md`).
- Retrieval is **BM25, in-process** (`corpus.ts`). No vector call on the request
  path.
- Generation goes over an **OpenAI-compatible endpoint**: `model-core.ts` is the
  pure wire format, `model.ts` does fetch/SSE, `MODEL_BASE_URL` selects the
  provider. **There is no model SDK.** Gemini today via its OpenAI-compatible
  endpoint; an in-Kingdom ALLaM endpoint the moment one exists. Genkit remains
  only as the flow/streaming harness.
- `grounding-core.ts` decides the verdict. `contract.ts` defines the response
  shape, verdicts, stream and error codes, and the tenant enum.

Adding a provider means configuration and, at most, `model-core.ts`. If a change
needs a vendor SDK on the request path, that is the signal to stop and rethink.

## There are two brains. Do not describe them as one.

This repo's flow (`captain-adel.ts` + `corpus.ts` + `grounding-core.ts`) and the
standalone service in `ay2m/Captain-Adel` are **parallel implementations of one
contract**. Older prose in both repos claimed a single brain called
server-to-server with an `X-Adel-Api-Key` header; that was never true and no
such header exists in `server/`.

`server/src/brain.ts` is the seam where consolidation would happen: it resolves
to the local flow unless `ADEL_REMOTE_BASE_URL` is set, which it is on no
revision. The two decide grounding at **different points in the request** —
ours before the model call, theirs after. Read
`docs/DESIGN-brain-consolidation.md` before touching the seam.

## Invariants

- **Refusal is a feature.** Never widen an answer path so an ungrounded claim
  can ship. If retrieval returns nothing usable, the correct output is a refusal
  with a pointer, not a plausible paraphrase.
- **Citations are exact** — Part and section, matching the retrieved passage.
  Never synthesise one from model memory.
- **Only GACAR material may be labelled GACAR.** The corpus is PDF-extracted and
  noisy; citation shaping degrades in tiers rather than guessing.
- **Arabic is not an afterthought.** A pure-Arabic query behaves differently in
  BM25. Test both languages on any retrieval or prompt change, and never assert
  a property the pipeline does not have.
- **Never echo learner PII** into a request or response log around a model call.

## A contract change is a three-repo change

`contract.ts` is what `contracts/flygaca-family.json` pins for the whole family.
A breaking change there means: edit the owning copy, bump `version`, re-stamp
the self-hash, copy the file **verbatim** into `ay2m/Office` and
`ay2m/Captain-Adel`, and open all three PRs together. Editing without
re-stamping fails every repo's gate immediately.
`/flygaca-product:family-contract` walks the sequence.

## Residency, stated honestly

The generation hop carries no account identity, but it currently leaves the
region. Never write copy, comments or docs asserting in-Kingdom processing of
chat as present fact.

## Before you hand back

`cd server && npm run lint && npm test && npm run build`, plus the root
`npm test` if a client mirror is involved. Then exercise the change on a real
question in **both** languages and paste the citation you got back. State which
gates ran and which you skipped.
