---
description: Ship a feature across the React surface, the Express API and the corpus in the right order, with the right gates at each step
argument-hint: <feature-name> [web-only|api-only|full]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

Ship `$1` at scope `$2` (default `full`). This is the repo-local sequencing
command. A feature that also needs a change in `ay2m/Office` or
`ay2m/Captain-Adel` is a family-level workflow — use `/full-sync` or the
family-orchestrators `feature-ship` instead, and use this for the FlyGACA half.

Work back-to-front. The API contract is the thing every other layer commits to,
so settling it last means rewriting the layers above it.

## 1. Settle the data shape (skip if `web-only`)

If the feature needs schema: write the migration first, following the
`postgresql-migrations` skill — right directory (`server/migrations/` for the
application schema, `supabase/migrations/` for pgvector only), next free number,
additive-first, named-query index comments, and the PDPL erasure path in the
same change.

## 2. Build the API (skip if `web-only`)

Follow `express-security-patterns`. The rule goes in a pure `*-core.ts` module,
the SQL goes in `store.ts`, the route wrapper stays thin, and the surface goes
under `/api/*` so the CSP can stay `connect-src 'self'`.

If the feature grants or reads capability: entitlement is server-owned, grants
only ever upgrade, and a verified email is the ownership proof.

**Gate:** `cd server && npm run lint && npm test && npm run build`.

## 3. Corpus or content (skip if the feature ships no content)

Follow `gacar-corpus-policy`. Run the pipeline you changed and report the row
counts it produced. A new content route needs its managed JSON-LD node and a
prerender snapshot — `npm run check:prerender:coverage`, not just
`check:prerender`.

## 4. Build the surface (skip if `api-only`)

Follow `react-typescript-strict`. Keys land in **both** `src/i18n/en.json` and
`src/i18n/ar.json` in the same commit, colours come from tokens, spacing is
logical properties, input state lives in the URL, and `entitlement` is read only
to gate UI — the app never grants.

## 5. If retrieval, grounding or citations moved

Follow `gemini-rag-patterns`, and exercise the change on a real question in
**both** languages before handing back.

## 6. If `contract.ts` changed

Stop. That is a three-repo change: bump `version`, re-stamp the self-hash, copy
`contracts/flygaca-family.json` verbatim into the other two repos, open all three
PRs together. `/flygaca-product:family-contract` walks it.

## 7. Full gate sweep

```bash
npm run verify                                   # root: typecheck → lint → format:check → test → build → check:bundle → check:perf
cd server && npm run lint && npm test && npm run build
```

Add `npm run check:prerender:coverage` if a route was added.

## Reporting

Finish with a table: step · touched? · gate · result. Name every gate you
skipped and why. Never imply a gate passed that you did not run.
