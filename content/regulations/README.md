# Regulatory Markdown source

This directory is the **authoring source-of-truth** for Fly GACA's regulatory corpus. One Markdown
file per GACAR Part (`part-<n>.md`). The pipeline lints these files, extracts their internal
cross-references and compiles a single lookup dictionary (`public/data/regulations-lookup.json`)
for instant frontend rendering. A separate step upserts vector embeddings to Supabase pgvector.

> [!NOTE]
> **These steps are run by hand, not by CI.** This README used to point at a `docs-parser`
> workflow; no such workflow exists — the repo's only workflows are `ci.yml`, `deploy.yml`,
> `deploy-firebase.yml` and `prerender.yml`, and none of them runs the commands below. Run them
> yourself after editing a Part, and commit the regenerated lookup.
>
> Note also that pgvector embeddings are **not** what serves Captain Adel today: the live
> retrieval path is BM25 in-process over `data/rag-chunks.json` (`server/src/corpus.ts`). The
> embeddings are for the hybrid-retrieval design, not the shipped one.

> Fly GACA is **not affiliated with GACA**. These files are educational summaries that help you
> find and study the regulation — they never replace the official GACAR. Keep that framing in copy.

## Frontmatter (required)

```yaml
---
part: '91'                 # string, the Part number as printed
partNum: 91                # integer, used for ordering and lookup
title: General Operating and Flight Rules
category: airspace         # one of the GACAR categories in public/data/gacar-index.json
slug: part-91              # must equal the filename stem
---
```

The parser fails the build if any required key is missing or if `slug` ≠ filename stem.

## Writing cross-references

Reference another Part either as prose (`... must also comply with Part 121 ...`) or as a Markdown
link (`[Part 121](./part-121.md)`) — the AST parser picks up both. Section references in the
`§ 91.205` form are also extracted.

Every referenced Part must be a **real GACAR Part** (present in `public/data/gacar-index.json`).
A reference to a non-existent Part (e.g. a typo like `Part 999`) fails the parse step. You may
reference a Part that has not yet been migrated to Markdown — validation is against the canonical
GACAR registry, not against the files in this folder.

## Local checks

```bash
npm run lint:md           # markdownlint-cli2 over this directory
npm run parse:regulations # compile + validate cross-references → public/data/regulations-lookup.json
npm run embeddings:upsert # optional: push embeddings to Supabase pgvector
```

Run the first two after any edit here — nothing else will.
