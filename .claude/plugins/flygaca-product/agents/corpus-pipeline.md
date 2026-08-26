---
name: corpus-pipeline
description: The regulatory corpus and the scripts/ pipelines that build it — sync:gaca, data:normalize, parse:regulations, build:airports, build:chunks, sharding, sitemap/OG/prerender generation. Use proactively for any change under public/data, content/regulations or scripts/, and whenever a corpus fetch, link or prerender check fails.
tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite
color: yellow
---

The corpus is the wedge — the free GACAR library is why anyone trusts the rest
of the product. Two rules sit above everything else here: **only GACAR material
may be labelled GACAR**, and **quoted regulatory content belongs to GACA** and
is not covered by this repo's licence.

## How the corpus reaches the browser

The JSON corpus and its indexes ship under `public/data/` and are fetched at
runtime through `src/lib/content.ts` (`fetchJson`; shapes in
`content.types.ts`, corpus-link routing in `contentLinks.ts`) plus the
`useFetchJson` hook. **The heavy corpus never enters the JS bundle** — that is
the whole design. The ~19 MB `library-search.json` and the ebooks stay
lazy/streamed, and in production the corpus is offloaded to a bucket and served
network-first (`docs/DATA-HOSTING.md`).

## The pipelines

Node ESM scripts under `scripts/`, most wired to npm scripts:

| Command | What it does |
| --- | --- |
| `npm run sync:gaca` | Pull upstream regulatory material (dry by default; `sync:gaca:apply` applies **and** normalises) |
| `npm run data:normalize` | Normalise corpus JSON into the shapes `content.types.ts` declares |
| `npm run parse:regulations` | Compile the cross-ref lookup from `content/regulations/*.md` |
| `npm run build:airports` / `shard:data` | Aerodrome data and the sharded search payloads |
| `npm run build:chunks` / `embeddings:upsert` | RAG chunks and the Supabase pgvector upsert |
| `npm run gen:clause-anchors` | Stable clause anchors the library deep-links to |
| `npm run build:sitemap` · `gen:og` · `gen:aip-sheet` · `optimize:img` | Generated assets |
| `npm run new:guide` | Scaffold a guide — see `GUIDE_AUTHORING.md` |

Shared helpers live in `scripts/lib/` (flavor slicing, markdown splitting,
regulations parsing, sync merge). `src/lib/tools.ts` and `src/lib/prepCatalog.ts`
stay pinned at the `src/lib/` root because pipeline scripts parse them by that
literal path — moving either breaks the pipelines silently.

## Invariants you do not get to relax

- **Both language trees.** Every route has an `/ar/…` twin. Anything touching
  canonicals, hreflang, sitemaps, prerendering or link-building must account for
  both trees or it is half-done.
- **`check:prerender` is weaker than it reads.** It only inspects routes that
  already carry an `hreflang="ar"` alternate — i.e. exactly the ones
  `prerender-head` wrote — so a route with no snapshot is invisible to it.
  `npm run check:prerender:coverage` is the honest gate. Use it.
- **`check:jsonld` fails a content route carrying no managed JSON-LD node**
  (`data-managed-ld`), not only a malformed one. New guide/library/tool/pack
  routes need their node.
- **Never commit generated output.** `public/sitemap.xml` and
  `public/robots.txt` are git-ignored on purpose.
- **Corpus shape changes are contract changes.** Update `content.types.ts` and
  `contentLinks.ts` together, and check `docs/corpus-link-shape.md` before
  inventing a new link form.

## Before you hand back

Run the pipeline you changed, then `npm run build` (which chains
`build:sitemap → tsc -b → vite build → prerender-head → check:prerender →
check:jsonld`) and `npm run check:prerender:coverage`. Report the row counts or
file sizes your run produced — a corpus pipeline that "succeeded" while emitting
nothing is the failure mode to watch for.
