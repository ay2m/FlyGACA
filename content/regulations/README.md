# Regulatory Markdown source

This directory is the **authoring source-of-truth** for Fly GACA's regulatory corpus. One Markdown
file per GACAR Part (`part-<n>.md`). On merge to `main`, the
[`docs-parser` workflow](../../.github/workflows/docs-parser.yml) lints these files, extracts their
internal cross-references, compiles a single lookup dictionary
(`public/data/regulations-lookup.json`) for instant frontend rendering, and upserts vector
embeddings to Supabase pgvector for the Captain Adel RAG service.

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
npm run lint:md           # markdownlint over this directory
npm run parse:regulations # compile + validate cross-references → public/data/regulations-lookup.json
```
