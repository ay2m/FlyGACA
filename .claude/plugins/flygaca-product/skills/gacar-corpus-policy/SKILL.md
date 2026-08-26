---
name: gacar-corpus-policy
description: The procedure for changing the regulatory corpus — which pipeline to run, the labelling and licensing rules, AIRAC freshness as actually implemented, and the prerender/JSON-LD gates a new content route must clear. Use for any change under public/data, content/regulations or scripts/, and when a corpus, prerender or JSON-LD check fails.
---

# Changing the corpus

Role context belongs to the `corpus-pipeline` agent. This is the procedure.

Two rules sit above everything: **only GACAR material may be labelled GACAR**,
and **quoted regulatory content belongs to GACA** and is not covered by this
repo's licence.

## How the corpus reaches the browser

JSON ships under `public/data/` and is fetched at runtime through
`src/lib/content.ts` (`fetchJson`; shapes in `content.types.ts`, link routing in
`contentLinks.ts`) plus the `useFetchJson` hook. **The heavy corpus never enters
the JS bundle** — that is the design. The ~19 MB `library-search.json` and the
ebooks stay lazy/streamed; in production the corpus is offloaded to a bucket and
served network-first (`docs/DATA-HOSTING.md`).

## Pick the right pipeline

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

Shared helpers are in `scripts/lib/`. `src/lib/tools.ts` and
`src/lib/prepCatalog.ts` **stay pinned at the `src/lib/` root** because pipeline
scripts parse them by that literal path — moving either breaks the pipelines
silently.

## AIRAC freshness, as implemented

`src/calc/airac.ts` is the cycle maths: **28-day cycles**, anchored to AIRAC
2001 effective 2020-01-02, identifier `YYNN`. `airacStatus()` in
`src/calc/library/changeTracking.ts` marks a source `due` when the next cycle is
within `withinDays`, **default 7**. Quote those two numbers — 28-day cycle,
7-day due window — rather than a combined threshold, and read the code before
asserting any other figure.

## Gates a content change must clear

- **`check:prerender` is weaker than it reads.** It only inspects routes that
  already carry an `hreflang="ar"` alternate — exactly the ones `prerender-head`
  wrote — so a route with **no** snapshot is invisible to it.
  `npm run check:prerender:coverage` is the honest gate. Use it.
- **`check:jsonld` fails a content route carrying no managed JSON-LD node**
  (`data-managed-ld`), not only a malformed one. New guide / library / tool /
  pack routes need their node.
- **Both language trees.** Every route has an `/ar/…` twin. Anything touching
  canonicals, hreflang, sitemaps, prerendering or link-building must account for
  both or it is half-done.
- **Never commit generated output.** `public/sitemap.xml` and
  `public/robots.txt` are git-ignored on purpose.
- **Corpus shape changes are contract changes.** Update `content.types.ts` and
  `contentLinks.ts` together, and check `docs/corpus-link-shape.md` before
  inventing a new link form.

## On the three hosting tiers

`CLAUDE.md` states a three-tier hosting policy — `HOST_SAFE_CORE`,
`HOST_ORIGINAL`, `DO_NOT_HOST`. Those identifiers appear **nowhere in the code
or the corpus data**: as of this writing the tiers are a stated editorial policy,
not a mechanism the pipelines enforce. Apply them as policy when deciding what
to host, and do not write code comments or docs implying a tier field exists.

## Before you hand back

Run the pipeline you changed, then `npm run build` (which chains
`build:sitemap → tsc -b → vite build → prerender-head → check:prerender →
check:jsonld`) and `npm run check:prerender:coverage`. **Report the row counts
or file sizes your run produced** — a corpus pipeline that "succeeded" while
emitting nothing is the failure mode to watch for.
