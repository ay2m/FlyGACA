> Working file of `docs/RUNBOOK-openseo.md` (openseo audit runs write here). The live SEO backlog is the root `SEO-PLAN.md`.

# Fly GACA — Keyword Research

_Last reviewed: 2026-06-23_

> **Data status — read first.** Live Semrush retrieval was **not available** when this was
> compiled (the Semrush MCP tool was gated behind an approval that could not be granted in
> the session). The volume / difficulty figures below are **directional estimates** based on
> domain knowledge of aviation-training search behaviour and the niche size of Saudi (GACAR)
> regulation — they are **not** measured data. Treat them as a prioritization scaffold, then
> replace each `~` figure with measured Semrush numbers using the queries in the last
> section. Estimates are marked `~` and tagged **(est.)**.

## How to read this

- **Intent**: `Info` (learning), `Tool` (wants a calculator/decoder now), `Nav/Brand`
  (looking for a specific thing), `Commercial` (course/subscription).
- **Difficulty (KD)**: estimated 0–100; lower = easier to rank.
- **Target page**: the existing Fly GACA page that should own the term (or "GAP" = content
  to create). All target pages below already exist unless marked GAP.

## Cluster 1 — Saudi / GACAR regulation (the moat)

This is Fly GACA's defensible territory: it is effectively the only searchable English
library of GACAR. Volumes are **low but uncontested and extremely on-brand**.

| Keyword | Intent | Vol (est.) | KD (est.) | Target page |
| --- | --- | --- | --- | --- |
| GACAR | Info/Nav | ~low | ~low | `/library` |
| GACA regulations | Info | ~low–med | ~low | `/library` |
| Saudi aviation regulations | Info | ~low–med | ~low | `/library` |
| GACAR Part 61 | Info | ~low | ~low | `/library/part-61` (reader) |
| Saudi pilot license requirements | Info | ~low–med | ~med | `/guides/*licensing*` |
| GACA pilot license | Info/Comm | ~low–med | ~med | `/guides/*licensing*` |
| لوائح الطيران المدني السعودي (AR) | Info | ~low | ~low | `/library?lang=ar` |
| رخصة طيار السعودية (AR) | Info/Comm | ~low–med | ~med | `/guides/*?lang=ar` |

**Why it wins:** near-zero competition, perfect topical authority, and the corpus already
exists. The job is technical surfacing (done) + internal linking + a few framing guides.

## Cluster 2 — Flight calculators (long-tail, high-intent volume)

These are global English terms with **meaningful volume and clear "use it now" intent**.
Fly GACA already ships 55 tools, each on its own indexable URL with `SoftwareApplication`
JSON-LD — this is the biggest near-term traffic opportunity.

| Keyword | Intent | Vol (est.) | KD (est.) | Target page |
| --- | --- | --- | --- | --- |
| crosswind calculator | Tool | ~med–high | ~med | `/tools/crosswind` |
| density altitude calculator | Tool | ~med | ~med | `/tools/density-altitude` |
| E6B calculator (online) | Tool | ~med–high | ~med–high | `/tools/e6b` |
| weight and balance calculator | Tool | ~med | ~med | `/tools/weight-balance` |
| true airspeed (TAS) calculator | Tool | ~med | ~med | `/tools/tas` |
| METAR decoder | Tool | ~med | ~med | `/tools/metar` |
| TAF decoder | Tool | ~low–med | ~med | `/tools/taf` |
| fuel planning calculator | Tool | ~low–med | ~med | `/tools/fuel` |
| climb gradient calculator | Tool | ~low–med | ~low–med | `/tools/climb-gradient` |
| pressure altitude calculator | Tool | ~med | ~low–med | `/tools/pressure-altitude` |
| top of descent calculator | Tool | ~low–med | ~low | `/tools/top-of-descent` |
| standard rate turn calculator | Tool | ~low | ~low | `/tools/standard-rate-turn` |

**Competitors here:** boldmethod, e6bx, omnicalculator, dauntless-soft, various flight-school
blogs. Beatable on the long tail with: unique tool UX, a short "how it works" explainer
(already present via `CalcShell` `formula`), related-tool internal links (already present),
and the "Ask Captain Adel" differentiator.

## Cluster 3 — Licensing / study / currency (informational)

Evergreen learning queries. Some are competitive (FAA-dominated); Fly GACA should target the
**Saudi/GACAR-flavoured** and **explainer** variants where it can be genuinely best.

| Keyword | Intent | Vol (est.) | KD (est.) | Target page |
| --- | --- | --- | --- | --- |
| private pilot ground school | Info/Comm | ~med–high | ~high | `/study/groundschool` |
| instrument rating requirements | Info | ~med | ~high | `/guides/*` |
| ICAO English language requirements | Info | ~med | ~med | `/guides/*language*` |
| pilot medical validity / class 1 medical validity | Info | ~low–med | ~med | `/guides/*medical*` + `/tools/medical-validity` |
| recency of experience / Part 61 currency | Info | ~low–med | ~med | `/tools/part-61-currency` + guide |
| flight review requirements | Info | ~low–med | ~med | `/tools/flight-review` |
| how to become a pilot in Saudi Arabia | Info/Comm | ~low–med | ~med | **GAP** → new guide |
| how to become a commercial pilot Saudi Arabia (AR + EN) | Info/Comm | ~low–med | ~med | **GAP** → new guide |

## Cluster 4 — Weather / procedures / reference (supporting)

Lower individually but broad in aggregate; map to existing tools/guides and interlink.
Examples: "holding pattern entry", "transponder codes", "phonetic alphabet aviation",
"NOTAM decoder", "AIRAC cycle dates", "Zulu time converter", "great circle distance
calculator". All have matching live tools under `/tools/*`.

## Brand / navigational
"Fly GACA", "Captain Adel", "captadel" — own these completely (the duplicate-host
consolidation in `seo.ts` already protects the brand SERP).

## Prioritization (where to spend effort first)

1. **Cluster 2 (calculators)** — highest volume × intent, pages already exist and are
   well-marked-up. Win via internal linking, explainer copy, and a few hub landing
   improvements. _Fastest ROI._
2. **Cluster 1 (GACAR)** — lowest competition, perfect authority, strategic moat. Win via a
   handful of framing guides + interlinking into the corpus.
3. **Cluster 3 (licensing/study)** — fill the Saudi-specific GAP guides; avoid head-to-head
   with FAA giants on generic terms.
4. **Cluster 4** — opportunistic; mostly already covered, needs interlinking.

## Semrush queries to run (to replace the estimates above)

Workflow per the Semrush MCP instructions: discovery tool → `get_report_schema` →
`execute_report` (default `database: "us"`; also pull `"sa"`/regional for the GACAR + Arabic
clusters; `display_limit` 30–50).

1. `keyword_research` → phrase/related/questions reports for the seeds in each cluster above
   (e.g. `crosswind calculator`, `density altitude calculator`, `E6B calculator`,
   `METAR decoder`, `GACAR`, `Saudi pilot license requirements`, plus the Arabic seeds).
   Capture **volume, KD, CPC, intent, SERP features**.
2. `organic_research` (keyword-gap / competitors) against `boldmethod.com`, `e6bx.com`,
   `skybrary.aero`, `omnicalculator.com` — find terms they rank for that Fly GACA's existing
   tool/guide pages could win.
3. `overview_research` on `flygaca.com` (and `captadel.com`) for the current authority-score
   / traffic baseline to measure against.

When the data lands, update the `~ (est.)` columns and re-sort each cluster by
`volume × intent ÷ difficulty`, then feed the result into the roadmap in `strategy.md`.
