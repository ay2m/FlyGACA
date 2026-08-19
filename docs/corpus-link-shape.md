# Corpus link shape — semantic pointers, not routing URLs

Frontend links in the corpus JSON are **semantic**, not routing URLs. A link is
either a corpus pointer or an app route:

```jsonc
{ "kind": "regulations", "id": "part-61", "anchor": "sec-61-51" }  // → Library reader
{ "route": "/tools/vfr-minima" }                                    // → app route
```

The legacy no-build shape — `document.html?type=<t>&id=<slug>#<anchor>` for corpus
docs and `../tools/x.html` / `../guides/x.html` for pages — is **deprecated**.
`src/lib/content.ts` (`toSearchRef`, `linkHref`) still parses it for back-compat,
and `tests/integrity/data-shape.test.ts` fails CI if it reappears in a migrated file.

Files and their link fields:

| File | Field | Shape |
|------|-------|-------|
| `library-search.json` | entry | `{ kind, id, anchor? }` |
| `definitions-index.json` | — | no link field (dead `url` dropped) |
| `paths-index.json` | `steps[]` | `{ kind,id,anchor } \| { route }` |
| `groundschool.json` | `…read` | `{ kind,id,anchor } \| { route }` |
| `quiz.json` | `questions[].citeRef` | `{ kind,id,anchor }` (label stays in `cite`) |
| `rag-chunks.json` | `u` | **legacy on purpose** — backend BM25 contract (`functions/src/corpus.ts`) |

## Who produces these files

- `rag-chunks.json` is built **in this repo** (`scripts/build-rag-chunks.mjs` →
  `scripts/lib/markdown-splitter.mjs`) and feeds the separate, unchanged backend
  retriever. Its `u` field is a deliberate exception — **do not migrate it** here.
- `library-search.json`, `definitions-index.json`, and the curated `paths` /
  `groundschool` / `quiz` files are produced by an **external/offline pipeline**
  (not in any FlyGACA GitHub repo as of this writing). Until that pipeline emits
  the semantic shape, `npm run data:normalize`
  (`scripts/normalize-corpus-data.mjs`, wired into `sync:gaca:apply`) heals the
  committed artifacts after each sync. It is idempotent and lossless.

## Upstream builder patch (apply where the pipeline lives)

At each emit point, drop the composite URL for semantic fields:

```diff
# corpus search / index builder
- const u = `document.html?type=${type}&id=${slug}${anchor ? `#${anchor}` : ''}`;
- entries.push({ d: heading, b: badge, u, x });
+ const kind = { regulations:'regulations', reference:'reference', handbooks:'handbook' }[type];
+ entries.push({ d: heading, b: badge, kind, id: slug, ...(anchor ? { anchor } : {}), x });

# definitions builder — drop the dead field (UI reads term/def only)
- terms.push({ term, def, url: `document.html?type=regulations&id=part-1#${anchor}` });
+ terms.push({ term, def });

# curated paths/groundschool: internal `.html` links → app routes
#   ../guides/x.html → { route: '/guides/x' } ; ../tools/x.html → { route: '/tools/x' }
#   corpus document.html?… → { kind, id, anchor }
# quiz: citeUrl → citeRef { kind, id, anchor } ; keep the `cite` display label
```

## Is the upstream fixed yet? (`npm run data:normalize:check`)

The retirement below is gated on "the pipeline emits the semantic shape and a sync
confirms it" — so that question needs a machine-checkable answer rather than a
careful read of normalize's log. `--check` is `--dry` that **exits non-zero** when
anything would be migrated:

```bash
npm run sync:gaca                  # pull upstream WITHOUT applying/healing
npm run data:normalize:check       # exit 0 → upstream is clean; exit 1 → still legacy
```

Run against the **committed** corpus it always passes (0 migrated — the healing
already happened), so it only tells you something new when it runs on a fresh
sync. A clean exit there is the green light for the steps below; a non-zero exit
names the files the upstream builder is still emitting legacy links for.

> **Status (2026-08-13):** the committed corpus is fully semantic — `--check`
> reports 0 migrated across all five files. What is **not** done is the upstream
> builder patch, and it cannot be done from any FlyGACA GitHub repo: the pipeline
> that emits `library-search.json` / `definitions-index.json` / the curated
> `paths`·`groundschool`·`quiz` files is the external/offline one described above,
> outside `FlyGACA-app`, `Captain-Adel`, `Office` and `ay2m/FlyGACA`. Until it is
> patched where it lives, `data:normalize` stays wired into `sync:gaca:apply` and
> the back-compat parsing in `src/lib/contentLinks.ts` must stay — deleting it
> first would mean the next sync silently ships unroutable links.

## Retiring the legacy path

Once the pipeline emits the semantic shape and a sync confirms it
(`npm run data:normalize:check` exits 0 on a fresh, unhealed sync):

1. Drop the `u`-string / legacy-URL branch from `toSearchRef` / `linkHref` /
   `searchEntryLink` in `src/lib/content.ts` and the deprecated `url` / `u`
   fields from `SearchEntry` / `ContentLink`.
2. Remove `data:normalize` from `sync:gaca:apply` and delete
   `scripts/normalize-corpus-data.mjs`.
3. Keep `tests/integrity/data-shape.test.ts` — it's the standing guard.
