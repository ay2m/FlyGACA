> Working file of `docs/RUNBOOK-openseo.md` (openseo audit runs write here). The live SEO backlog is the root `SEO-PLAN.md`.

# Fly GACA — SEO Strategy

_Last reviewed: 2026-06-23 · Owner: growth/SEO · Companion docs:
[`technical-audit.md`](./technical-audit.md), [`keyword-research.md`](./keyword-research.md)_

## TL;DR

Fly GACA's technical SEO is already excellent (see the audit). The growth lever is
**content and internal linking on top of assets that already exist** — 55 calculators, 18
guides, and a unique English library of Saudi (GACAR) regulation. The strategy is therefore
deliberately content-led and low-build:

1. **Win the long-tail calculator queries** the 55 tool pages already target (fastest ROI).
2. **Own the GACAR / Saudi-aviation niche** end to end — the defensible moat.
3. **Fill a small number of Saudi-specific "how to" guide gaps** rather than fighting FAA
   giants on generic terms.
4. **Interlink aggressively** so authority flows from hubs to leaf pages and across clusters.

## Positioning & audiences

**Positioning:** the independent, bilingual, educational reference for Saudi civil-aviation
regulation — _find the rule, understand it (Captain Adel cites the exact Part/section), and
study to stay current_. Always "not affiliated with GACA"; the product helps you find/study
regulation, it never replaces it.

**Primary audiences:**
- **Saudi student pilots & PPL/CPL/ATPL candidates** — licensing requirements, ground school,
  exam prep, calculators. (EN + AR.)
- **Active pilots & instructors in the Kingdom/Gulf** — currency, medical validity, flight
  review, day-to-day calculators and decoders.
- **Flight schools (B2B)** — the route to the highest-value buyer (see `/schools`, `/pricing`).
- **Global English-speaking pilots/students** — reachable purely through the calculator long
  tail, regardless of GACAR interest.

**The moat:** the only searchable English GACAR corpus (74 Parts + 21 handbooks), plus
Saudi-specific aerodrome/airspace/VFR-chart data and free tools, plus the Captain Adel
assistant. No competitor combines these for this market.

## Keyword clusters → page map

(Full tables and the Semrush-refresh plan are in `keyword-research.md`.)

| Cluster | Owns | Existing pages | Action |
| --- | --- | --- | --- |
| **Calculators** (crosswind, density altitude, E6B, W&B, TAS, METAR/TAF…) | global long-tail, high intent | `/tools/*` (55, fully marked up) | Interlink + explainer copy + hub polish. Highest ROI. |
| **GACAR / Saudi regulation** | the moat, low competition | `/library`, `/library/*` readers | Framing guides + interlink into corpus. |
| **Licensing / study / currency** | Saudi-flavoured + explainer variants | `/guides/*`, `/study/*`, currency tools | Fill GAP guides; avoid generic FAA head terms. |
| **Weather / procedures / reference** | broad in aggregate | `/tools/*`, `/guides/*` | Opportunistic interlinking. |
| **Brand** (Fly GACA, Captain Adel) | own completely | `/`, `/about` | Protected already by duplicate-host consolidation. |

## Content roadmap / backlog (prioritized)

Each item: _target cluster · page · effort · expected impact_. Keep all new copy bilingual
(keys in **both** `en.json` and `ar.json`) and use `<Disclaimer />` verbatim where relevant.

**P1 — fastest ROI (calculators + interlinking)**
1. **Tool-hub intro copy** — add a short, keyword-rich, indexable paragraph to `/tools` (and
   per-category intros) describing what the calculators do. _Tool · ToolsIndex · S · Med._
2. **Cross-cluster internal links** — from each calculator's "related tools" (already present)
   _and_ from relevant guides → tools and tools → guides/regulations. Authority routing.
   _All · multiple · M · High._
3. **Per-tool explainer depth** — ensure every tool's `formula`/"how it works" explainer is
   populated (it is the on-page text that makes a calculator rank). Audit the 55, fill gaps.
   _Tool · `/tools/*` · M · High._

**P2 — own the GACAR moat**
4. **"Saudi pilot licensing" pillar guide** — a hub guide that frames GACAR Part 61 and links
   into the library readers and the currency/medical tools. _Regulation/Licensing · GAP guide
   · M · High (strategic)._
5. **Library hub framing copy** — short indexable intros on `/library` and its section hubs
   (regulations / reference / handbooks). _Regulation · Library · S · Med._

**P3 — fill Saudi-specific guide gaps**
6. **"How to become a pilot in Saudi Arabia"** (EN + AR) — high-intent, low local competition.
   _Licensing · GAP guide · M · Med–High._ ✅ **Shipped.**
7. **"GACAR explained"** (EN + AR) — pillar for the regulation moat (new `regulation` topic).
   _Regulation · GAP guide · M · Med–High._ ✅ **Shipped.**
8. **ICAO English / class-1 medical explainers** tuned to the Saudi pathway. _GAP/expand
   existing guides · M · Med._ (Existing guides `icao-english-saelpt`, `gaca-medical-class-1`
   already cover the basics; expand as needed.)

**P4 — supporting / technical polish** (see audit "Changes made")
9. `ItemList` on the Study hub. ✅ **Shipped** (Library sections are tabs, not routes — n/a).
10. Per-section OG images. ✅ **Shipped** (generated via `sharp`).
11. Visible breadcrumbs on leaf pages. ✅ **Shipped.**
11. Visible HTML breadcrumbs on leaf pages; preload the primary font.

## Information architecture & internal linking

Hub-and-spoke, already largely in place — the strategy is to **strengthen the links**, not
restructure:

- **Hubs:** `/library`, `/tools`, `/guides`, `/study` → each now (tools/guides) exposes an
  `ItemList` so crawlers read hub → leaf relationships.
- **Spokes link back and sideways:** calculators already render "related tools" chips; extend
  the habit so guides link to the tools and regulations they reference, and regulation readers
  link to the guides that explain them. This spreads authority into the long tail and keeps
  sessions on-site.
- **Captain Adel as a conversion + dwell-time asset:** "Ask Captain Adel" CTAs on tool and
  guide pages deepen engagement (a positive ranking signal) and differentiate from static
  competitors.
- **Bilingual parity:** every indexable page exists in EN and AR via `?lang=`; hreflang +
  `x-default` are emitted per route and per sitemap URL. Prioritize Arabic content parity for
  the GACAR and licensing clusters, where Arabic intent is highest and competition lowest.

## Competitor landscape

(To be quantified with Semrush — see `keyword-research.md` §"Semrush queries to run".)

- **Calculator space:** boldmethod, e6bx, omnicalculator, dauntless-soft, flight-school blogs.
  Beatable on the long tail via UX, explainers, interlinking, and the AI assistant.
- **Regulation/reference:** skybrary, eCFR-style sites, FAA/ICAO official docs — strong on
  US/international, **absent on GACAR**, which is exactly Fly GACA's uncontested ground.
- **Saudi market:** GACA's own properties and a few schools — Fly GACA is differentiated as an
  independent, searchable, bilingual study library rather than an authority/portal.

## Measurement

- **Tooling:** Google Search Console (verification already wired via `VITE_GSC_TOKEN`) + Bing
  Webmaster; optional Semrush position tracking for the cluster head terms.
- **Primary KPIs:** organic impressions & clicks **by cluster**; average position for the
  P1/P2 head terms; indexed-page count vs. sitemap; rich-result eligibility (`SoftwareApp`,
  `FAQPage`, `ItemList`, `Article`).
- **Secondary:** organic → Captain Adel chat starts; organic → Pro/Student/Schools signups;
  Arabic vs. English organic split.
- **Cadence:** monthly review of cluster movement; quarterly refresh of the keyword tables
  from Semrush and re-prioritization of the roadmap.

## Guardrails

- Bilingual + RTL is first-class: any new copy ships in `en.json` **and** `ar.json` (the
  i18n-parity test enforces this).
- The disclaimer never drifts: use `<Disclaimer />`; never reword the not-affiliated /
  verify-against-GACA text — it is also a trust/E-E-A-T signal.
- Tokens-only / logical-properties-only for any new UI.
- Don't chase deprecated rich-result types (e.g. HowTo) or build technical fixes the audit
  shows already exist.
