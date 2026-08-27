---
name: postgresql-migrations
description: The procedure for writing a forward-only Postgres migration in this repo — which of the two schemas it belongs to, numbering, additive-first sequencing, indexing, money/time conventions and the PDPL erasure path. Use when adding or changing a table, column or index, and before any deploy carrying schema changes.
---

# Writing a migration here

Role context belongs to the `sql-schema` agent. This is the procedure.

## First: which schema?

Two schemas live in this repo and they are **not** interchangeable.

| Directory | Holds | Applied with |
| --- | --- | --- |
| `server/migrations/` | The application schema — accounts, entitlements, logbooks, records, checkout intents, promo codes, org/cohort data, analytics | `npm run db:migrate` (root) or `npm run migrate` inside `server/` |
| `supabase/migrations/` | The pgvector schema, **RAG embeddings only** | Supabase tooling |

Putting an application table in the pgvector schema, or an embedding table in
the application schema, is the mistake this section exists to prevent.

## Numbering

Forward-only, numbered, **immutable once merged**: add
`NNNN_short_description.sql` and never edit a migration that has been applied
anywhere.

`server/migrations/` currently holds `0001_init.sql`, `0002_add_apple_oauth.sql`,
`0002_founder_grant_ay2m.sql` and `0003_pdpl_and_analytics.sql` — note **two
files numbered `0002_`**. That is a existing wart, not a licence: pick the next
free number and keep the sequence unambiguous from here on.

## Sequencing

**Additive first.** Add a nullable column or a new table → backfill → tighten.
A migration that drops or renames in one step cannot be rolled forward past a
running revision, and there is no rollback path.

## Indexing

Index what you filter and join on, and **write a comment naming the query the
index serves**. The family has already been bitten by a missing composite index
taking down a nightly renewal job; an index nobody can name a query for is the
same bug pointing the other way.

## Money and time

- Amounts are **integer minor units**. Never a float.
- Timestamps are `timestamptz`.
- Period maths is KSA-calendar (UTC+3) and belongs in a pure core module, not
  in SQL.

## PDPL

Personal data must be deletable. If you add a table keyed by user, add its
erasure path **in the same change**. Payment markers are tombstoned rather than
deleted — they are the webhook-replay guard.

## The rule that outranks the schema

**Entitlement is server-owned.** Only `routes/billing.ts` and `routes/grants.ts`
write the `entitlements` table. Any new table that can grant capability needs
the same discipline: no client-writable path, grants that only ever upgrade, and
a verified email as the ownership proof.

## Before you hand back

`cd server && npm run lint && npm test && npm run build`, and apply the
migration against a scratch database (`npm run migrate`) rather than reasoning
about it.

State plainly whether the migration has been applied anywhere real:
`server/migrations/0001_init.sql` has **never** been applied to a deployed
database and no `schema_migrations` table exists in any live project. Do not
write docs or comments implying a live schema exists.
