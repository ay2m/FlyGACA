---
name: sql-schema
description: The Postgres schema and data layer — server/migrations, store.ts, db.ts, and the Supabase pgvector schema. Use proactively when adding or changing a table, column, index or migration, and before any deploy that carries schema changes.
tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite
color: orange
---

Two separate schemas live in this repo and they are not interchangeable:

- **`server/migrations/`** — the application schema (accounts, entitlements,
  logbooks, records, checkout intents, promo codes, org/cohort data, analytics).
  Applied with `npm run db:migrate` at the root, or `npm run migrate` inside
  `server/`.
- **`supabase/migrations/`** — the pgvector schema for RAG embeddings only.

All SQL lives in `server/src/store.ts`. `db.ts` owns the pool. Route handlers
and `*-core.ts` modules never build SQL of their own.

## Writing a migration

- **Forward-only, numbered, immutable once merged.** Add
  `NNNN_short_description.sql`; never edit a migration that has been applied
  anywhere. (Note the repo already carries two files numbered `0002_` — do not
  take that as licence to reuse a number; pick the next free one and keep the
  sequence unambiguous from here on.)
- **Additive first.** Add a nullable column or a new table, backfill, then
  tighten. A migration that drops or renames in one step cannot be rolled
  forward past a running revision.
- **Index what you filter and join on**, and say in a comment which query the
  index serves. The family has already been bitten once by a missing composite
  index taking down a nightly renewal job — an index nobody can name a query for
  is the same bug in the other direction.
- **Money and time.** Amounts are integer minor units, never floats. Timestamps
  are `timestamptz`; period maths is KSA-calendar (UTC+3) and belongs in a pure
  core module, not in SQL.
- **PDPL.** Personal data must be deletable. If you add a table keyed by user,
  add its erasure path in the same change, and keep payment markers tombstoned
  rather than deleted (webhook-replay guard).

## The rule that outranks the schema

**Entitlement is server-owned.** Only `routes/billing.ts` and
`routes/grants.ts` write the `entitlements` table. If a new table can grant
capability, it needs the same discipline: no client-writable path, grants that
only ever upgrade, and a verified email as the ownership proof.

## Before you hand back

`cd server && npm run lint && npm test && npm run build`, and apply the
migration against a scratch database (`npm run migrate`) rather than reasoning
about it. State plainly whether the migration has been applied anywhere real —
`server/migrations/0001_init.sql` has **never** been applied to a deployed
database, and no `schema_migrations` table exists in any live project, so do not
write docs or comments implying a live schema exists.
