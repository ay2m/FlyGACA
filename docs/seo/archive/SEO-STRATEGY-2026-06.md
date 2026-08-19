> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

> **ARCHIVED 2026-07-23.** Superseded by the root `SEO-PLAN.md` (the live backlog, driven by the
> `flygaca-seo` skill). Kept for historical rationale — do not execute items from this file.

# Fly GACA — SEO Strategy & Technical Blueprint

> **Scope.** A production-ready, multi-layered SEO strategy for **FlyGACA.com**, the independent
> educational platform and open regulatory library for Saudi civil aviation (GACAR). This document
> is grounded in the app's real architecture (`src/router.tsx`, `public/data/*`, the `usePageMeta`
> head manager) and pairs the _strategy_ with the _technical work already shipped in this branch_
> (structured data, search-engine verification, an enriched sitemap) plus a scoped plan for static
> prerendering.
>
> **Positioning guardrail.** Fly GACA is **not affiliated with GACA**. It helps users _find and
> study_ regulation and always cites the exact Part/section; it never replaces the official source.
> Every page carries `<Disclaimer />`, and the "verify against GACA" pattern is itself an SEO and
> trust asset (see Phase 4). No GACAR figures are ever fabricated in content or schema.

## Inventory at a glance (what we are optimizing)

| Surface                                          | Count | Route pattern                                                          | Indexable?                              |
| ------------------------------------------------ | ----- | ---------------------------------------------------------------------- | --------------------------------------- |
| GACAR Parts (section-anchored)                   | 74    | `/library/:slug` (`part-91`) → `#sec-91-165`                           | Yes                                     |
| Reference library (FAA/ICAO/GACA)                | 211   | `/library/reference/:slug`                                             | Yes                                     |
| GACA handbooks                                   | 21    | `/library/handbook/:slug`                                              | Yes                                     |
| Flight tools (calculators)                       | 54    | `/tools/:id`                                                           | Yes                                     |
| Editorial guides                                 | 10    | `/guides/:slug`                                                        | Yes                                     |
| Study hub (quiz/exam/ground school/paths/sheets) | —     | `/study/*`                                                             | Partial                                 |
| Hubs & marketing                                 | —     | `/`, `/library`, `/tools`, `/guides`, `/about`, `/pricing`, `/schools` | Yes                                     |
| Account/dashboard/logbook                        | —     | `/account`, `/dashboard`, …                                            | **No** (private, excluded from sitemap) |

Full-text discovery is backed by `library-search.json` (46,369 passages), each linking into the
reader at the exact `#sec-*` anchor — the raw material for long-tail regulatory ranking.

---

## Phase 1 — Keyword Research & Intent Mapping (localized)

Saudi aviators **code-switch**: they keep technical terms in English ("Part 61", "METAR", "VFR
minima", "AIRAC") and wrap them in Arabic intent phrases ("شروط", "كيف", "متطلبات", "تحويل
رخصة"). The strategy targets the blended query, maps each cluster to **routes that already exist**,
and reserves long-tail clause queries for **section anchors**.

### Cluster A — Licensing & license conversion (highest commercial/visa intent)

Maps to: `/library/part-61`, `/library/part-67`, `/guides/foreign-license-conversion-to-gaca`,
`/guides/saudi-ppl-requirements`, `/tools/conversion-checker`, `/tools/medical-validity`.

| English / blended                           | Arabic (code-switched)        | Transliteration              | Intent        | Target                                       |
| ------------------------------------------- | ----------------------------- | ---------------------------- | ------------- | -------------------------------------------- |
| GACAR Part 61 requirements                  | متطلبات GACAR Part 61         | mutatallabāt…                | Informational | `/library/part-61`                           |
| convert FAA license to GACA                 | تحويل رخصة FAA إلى GACA       | taḥwīl rukhṣat…              | Transactional | `/guides/foreign-license-conversion-to-gaca` |
| Saudi commercial pilot license requirements | شروط رخصة طيار تجاري سعودي    | shurūṭ rukhṣat ṭayyār tijārī | Informational | `/guides/saudi-cpl-requirements`             |
| GACA Class 1 medical                        | الكشف الطبي GACA الفئة الأولى | al-kashf al-ṭibbī…           | Informational | `/guides/gaca-medical-class-1`               |
| EASA to GACA conversion                     | تحويل EASA إلى GACA           | —                            | Transactional | `/tools/conversion-checker`                  |

### Cluster B — Exam & study prep (student pilots, high volume)

Maps to: `/study/quiz` (12 domains), `/study/exam`, `/study/groundschool`, `/study/sheets`,
`/guides/icao-english-saelpt`.

| English / blended            | Arabic                                 | Intent                   | Target                        |
| ---------------------------- | -------------------------------------- | ------------------------ | ----------------------------- |
| SkyTest preparation Saudi    | تحضير SkyTest                          | Commercial investigation | `/study/exam`                 |
| GACAR written exam questions | أسئلة اختبار GACAR                     | Informational            | `/study/quiz`                 |
| Saudi civil aviation exams   | اختبارات الطيران المدني السعودي        | Informational            | `/study`                      |
| ICAO English SAELPT test     | اختبار اللغة الإنجليزية للطيران SAELPT | Commercial               | `/guides/icao-english-saelpt` |
| PPL ground school Saudi      | جراوند سكول PPL                        | Informational            | `/study/groundschool`         |

### Cluster C — Regulatory long-tail (clause-level; the moat)

One query → one **section anchor**. This is where Fly GACA out-ranks generic aggregators, because
the reader deep-links to the exact paragraph and `library-search.json` already indexes it.

| Query                                     | Target anchor                                            |
| ----------------------------------------- | -------------------------------------------------------- |
| GACAR 91.105 / flight crew at stations    | `/library/part-91#sec-91-105`                            |
| GACAR VFR weather minima                  | `/library/part-91#sec-91-155` (plus `/tools/vfr-minima`) |
| supplemental oxygen requirements Part 91  | `/library/part-91#sec-91-211` (plus `/tools/oxygen`)     |
| Part 61 recent flight experience / 90-day | `/library/part-61` (plus `/tools/part61-currency`)       |
| drone / UAS registration Saudi            | `/library/part-101`, `/library/part-107`                 |

> **Tactic:** for the ~30 highest-demand clauses, ensure the section `id` is stable and surfaced in
> the sitemap roadmap (Phase 3) and cross-linked from the matching tool's "How it works" panel.

### Cluster D — Tools & quick reference (utility intent, recurring sessions)

Maps to all 54 `/tools/:id`. These are the EFB/cockpit-companion queries.

| English / blended              | Arabic                      | Target                    |
| ------------------------------ | --------------------------- | ------------------------- |
| crosswind component calculator | حساب مركبة الرياح المتقاطعة | `/tools/crosswind`        |
| density altitude calculator    | حساب الارتفاع الكثافي       | `/tools/density-altitude` |
| METAR decoder                  | فك تشفير METAR              | `/tools/metar`            |
| squawk / transponder codes     | أكواد الترانسبوندر          | `/tools/transponder`      |
| AIRAC cycle dates              | تواريخ دورة AIRAC           | `/tools/airac`            |

### Cluster E — Pathway / "how do I become a pilot in Saudi Arabia"

Top-of-funnel discovery feeding Clusters A/B. Maps to `/guides`, `/study/paths`, `/schools`.

| English / blended                     | Arabic                     | Target                           |
| ------------------------------------- | -------------------------- | -------------------------------- |
| how to become a pilot in Saudi Arabia | كيف تصبح طيار في السعودية  | `/guides/saudi-ppl-requirements` |
| flight schools in Saudi Arabia        | مدارس الطيران في السعودية  | `/schools`                       |
| steps to get a pilot license KSA      | خطوات الحصول على رخصة طيار | `/study/paths`                   |

---

## Phase 2 — On-Page SEO & Content Architecture

### 2.1 Silo / hierarchy

```
/                       (brand + top-level intents)
├── /library            HUB — corpus switcher + full-text search
│   ├── /library/part-61            PILLAR (TechArticle)
│   │     └── #sec-61-xxx           clause anchors (long-tail)
│   ├── /library/reference/:slug
│   └── /library/handbook/:slug
├── /tools              HUB — 13 categories
│   └── /tools/crosswind            LEAF (SoftwareApplication)
├── /guides             HUB — 6 topics
│   └── /guides/:slug               PILLAR (Article)
└── /study              HUB — quiz/exam/ground school (Course)
```

The internal-linking graph is already strong and should be preserved as a ranking asset: quiz
explanations deep-link to the cited section, `paths-index.json` threads Parts → handbooks → tools,
ground-school lessons carry a reading assignment link, and each tool's "related" chips + guide
"related tools" cross-link Clusters A–E. **Every Part page should link up to `/library` and across
to its matching tool and guide** (e.g. `part-67` ⇄ `/tools/medical-validity` ⇄
`/guides/gaca-medical-class-1`).

### 2.2 Making each Part the definitive reference

The reader (`src/pages/library/Document.tsx`) already emits the right semantics — preserve them:

- **One `<h1>`** = the Part title (e.g. "Part 91 — General Operating and Flight Rules").
- **`<h2>`** = Subparts, **`<h3>`** = Sections, each with a stable `id="sec-91-165"` and a
  copy-link affordance. These anchors are the long-tail landing targets.
- A visible **"Verify against the official GACA source"** line + outbound `sourceUrl` (trust signal).
- Breadcrumb + prev/next + related Parts (crawl depth + topical clustering).
- **TechArticle + BreadcrumbList JSON-LD** (shipped — see Phase 3 / Implementation).

### 2.3 Pillar blueprint — "The Ultimate Guide to GACAR License Conversion"

Target `/guides/foreign-license-conversion-to-gaca`. Recommended semantic outline:

```html
<h1>The Ultimate Guide to GACAR License Conversion (FAA / EASA → GACA)</h1>
<p class="lead">Who this is for, what GACAR governs the process, and the disclaimer.</p>

<nav aria-label="On this page">… table of contents …</nav>

<h2>1. Does your licence qualify? (GACAR Part 61 & ICAO Annex 1)</h2>
<h3>FAA ATP/CPL holders</h3>
<h3>EASA ATPL/CPL holders</h3>
<h3>ICAO-contracting-state licences</h3>
<h2>2. The medical: GACA Class 1 (GACAR Part 67)</h2>
<h3>Validity windows & where to renew</h3>
<!-- links /tools/medical-validity -->
<h2>3. Aviation English — SAELPT / ICAO Level 4+</h2>
<!-- links /guides/icao-english-saelpt -->
<h2>4. Theory & skill assessment</h2>
<!-- links /study/exam, /study/quiz -->
<h2>5. Document checklist & submission</h2>
<h2>6. Timeline, fees & common rejections</h2>
<h2>Frequently asked questions</h2>
<!-- FAQPage candidate (Phase 3) -->
<h3>Can I fly on a foreign licence while converting?</h3>
<h3>How long is GACA Class 1 valid?</h3>

<aside>Related tools: Conversion checker · Medical validity · Part 61 currency</aside>
<footer><Disclaimer /></footer>
```

Rules: exactly one `<h1>`; never skip a heading level; every regulatory claim links to the cited
Part/section; the Arabic rendering mirrors the same outline (RTL is automatic).

### 2.4 Indexing interactive tools without crawl walls

Tools are JS calculators — their _value_ must be visible to crawlers even before interaction:

- Render a real `<h1>` + intro + the **"How it works" explainer** (`CalcShell` `formula` panel) as
  server-visible text — these describe the formula, inputs, and the GACAR basis in words.
- Keep inputs in the URL (`useUrlState`) so example states are linkable/shareable, but **never gate
  the explanatory copy behind a click**. Use `<details>` (already used) — its content is in the DOM.
- Add `SoftwareApplication` JSON-LD (shipped) so the tool can earn an app-style rich result.
- For search bars / document viewers: expose crawlable links to the underlying documents (the
  Library already lists every Part as an `<a>`; the sitemap enumerates them) rather than relying on
  the search box alone. Do **not** `noindex` the reader.

---

## Phase 3 — Technical SEO for Cockpit & Mobile (EFB) Environments

Pilots open tools on tablets/phones over patchy ramp/aircraft Wi-Fi. The PWA (`vite-plugin-pwa`,
app-shell precache, `/data/*` network-first) already helps repeat visits; the focus is first-load.

### 3.1 Core Web Vitals

| Metric  | Current posture                                                                       | Action                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LCP** | Route code-splitting keeps initial JS ~134 kB gzip; fonts preconnect + `display=swap` | Ensure the hero/`<h1>` is text (not an image); preload the LCP font subset; keep above-the-fold free of lazy chunks. Prerender (3.3) removes the "blank shell → hydrate" LCP delay. |
| **INP** | Calculators recompute on input                                                        | Keep `calc/*` pure & cheap (already the case); debounce expensive find-in-page (already 200 ms); avoid long tasks on keystroke.                                                     |
| **CLS** | `usePageMeta` injects late; fonts swap                                                | Reserve space for the reading-progress bar & toolbar; `font-display: swap` with metric-matched fallbacks; avoid injecting layout-affecting banners after paint.                     |

Add field monitoring for CWV, **host-aware** (the repo ships both Firebase Hosting scripts in
`package.json` _and_ an active Vercel integration — PRs build a Vercel preview, so the production
target should be confirmed before choosing):

- **If production is Vercel** — wire the already-installed `@vercel/analytics` + `@vercel/speed-insights`
  (`<Analytics />` + `<SpeedInsights />` in the app root). Zero new deps; near-zero effort.
- **If production is Firebase Hosting** — those two packages are inert there; instead report
  `web-vitals` into the **existing Firebase GA4** (gated on `VITE_FIREBASE_MEASUREMENT_ID`):
  `onLCP/onINP/onCLS → logEvent('web_vitals', …)`.

### 3.2 Structured data (Schema.org) — implementation plan

Shipped in this branch (`src/lib/jsonld.ts`, injected by `usePageMeta`):

| Schema type                                   | Applied to                            | Route(s)                              | Rich-result goal                      |
| --------------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- |
| `Organization` + `WebSite` (+ `SearchAction`) | Site-wide, **static in `index.html`** | all                                   | Sitelinks search box, knowledge panel |
| `BreadcrumbList`                              | reader, tools, guides                 | `/library/*`, `/tools/*`, `/guides/*` | Breadcrumb trail in SERP              |
| `TechArticle`                                 | GACAR Part / handbook / reference     | `/library/*`                          | Article eligibility, freshness        |
| `Article`                                     | guides                                | `/guides/:slug`                       | Article rich result                   |
| `SoftwareApplication`                         | tool pages                            | `/tools/:id`                          | App rich result (free, SAR offer)     |
| `Course`                                      | ground school / study paths           | `/study/groundschool`, `/study/paths` | Course list (builder ready)           |
| `FAQPage`                                     | pages with **genuine** Q&A            | selected `/guides/*`, `/pricing`      | FAQ rich result                       |

> `Course` and `faqLd` builders are implemented and unit-tested but only wired where the underlying
> content genuinely exists — **never** synthesize Q&A pairs to chase a rich result (it violates
> Google's structured-data policy and our no-fabrication rule). Wire `faqLd` once a guide/pricing
> page exposes real Q&A in i18n.

Validation: paste any rendered page's `<script type="application/ld+json">` into Google's Rich
Results Test; the static Org/WebSite graph is in the initial HTML, the per-route block is injected
by `usePageMeta` (verified in `tests/page-meta.test.tsx`).

### 3.3 Crawlability & LCP — static hero shell + prerender (implemented)

**Problem.** The app is a client-rendered SPA: the served HTML was `<div id="root"></div>`, so both
content _and_ the per-route meta/JSON-LD appeared only after hydration — the cause of the LCP 4.7 s
(the hero `<h1>` is text that can't paint until the bundle + i18n + React render).

**Shipped — two layers:**

1. **Static hero shell** (`index.html`, every host): the home hero (eyebrow, `<h1>`, subtitle, CTAs)
   is baked into `#root` with inline critical CSS, so it paints at CSS-load time as the LCP element;
   `createRoot` in `src/main.tsx` clears and renders the live app on boot. A 3-line inline script
   removes the shell on non-home routes (the SPA fallback serves this file for every path).
2. **Post-build snapshot prerender** (`scripts/prerender.mjs`, Vercel build only): boots
   `vite preview`, drives **Playwright Chromium** over a curated route list (reusing the
   `scripts/build-sitemap.mjs` enumeration — `/`, hubs/marketing, every `/tools/:id`, every
   `/guides/:slug`; private routes and the heavy library reader corpus excluded), waits for the real
   app (`footer`) to render, and writes each route's HTML to `dist/<route>/index.html`. Wired only
   into the Vercel `buildCommand` (`npx playwright install chromium && npm run build && npm run
prerender`) and **non-fatal** (any error → warn + exit 0), so it can't break CI or other hosts.
   Vercel serves the per-route snapshot (filesystem wins over the `/(.*) → /index.html` rewrite);
   the client still hydrates + live-fetches `/data/*`, so snapshots are _shell + above-fold_, never
   stale data. To extend to the production host (Firebase/Netlify/Cloudflare), add the same
   `&& npm run prerender` to its build.

**Trade-offs.** Adds ~1–2 min of build time and a Puppeteer dev dependency; snapshots are
above-the-fold only (dynamic corpus still hydrates live); biggest win is reliable indexing + faster
LCP. **Rejected alternative:** `vite-react-ssg` / full SSR — it requires reworking the router entry
and the runtime `/data/*` fetch model, which is disproportionate for a content-snapshot need.

### 3.4 Search-engine verification (shipped)

`vite.config.ts` injects `<meta name="google-site-verification">` / `<meta name="msvalidate.01">`
**only** when `VITE_GSC_TOKEN` / `VITE_BING_TOKEN` are set — keeping forks/previews clean. Set these
in the production deploy env, then submit `https://flygaca.com/sitemap.xml` in Search Console &
Bing Webmaster Tools.

### 3.5 Bilingual / hreflang

`usePageMeta` emits `canonical` + `hreflang` (en/ar via `?lang=` + `x-default`), and the sitemap now
carries the same `xhtml:link` alternates per URL. Document the `?lang=` model; if locale paths
(`/en/*`, `/ar/*`) are ever adopted, they are strictly better than the query param — track as a
future initiative, not a blocker.

---

## Phase 4 — Localized Content & Off-Page Authority

### 4.1 Editorial model — technical EN, scannable AR

- **English** = the authoritative, standards-precise register: exact Part/section citations, ICAO
  terminology, tables. This is what active pilots/instructors and conversion candidates search.
- **Arabic** = highly scannable, educational summaries: short paragraphs, bulleted "متطلبات"
  (requirements) and "خطوات" (steps), the English technical term kept inline in Latin script the way
  aviators actually write it ("رخصة CPL", "اختبار SAELPT"). RTL is automatic via logical properties.
- **Parity discipline:** every user-facing string lives in both `en.json` and `ar.json` (enforced by
  `tests/i18n-parity.test.ts`). New guides ship bilingual or they do not ship.
- **Freshness cadence:** tie content reviews to the AIRAC cycle and to GACAR revision dates
  (`gacar-index.json` carries `effectiveDate`/`revision`/`contentHash`, now surfaced as sitemap
  `lastmod`). A visible "reviewed for AIRAC YYWW" line reinforces freshness for users and crawlers.

### 4.2 Ethical link-building & authority (aviation-specific)

- **Flight schools (ATOs) & academies** — the `/schools` B2B surface is the natural anchor: offer
  embeddable study-path widgets / a "GACAR library" resource link; co-publish conversion guides.
  Pursue listings/links from Saudi ATOs (e.g. Oxford Saudia, academies at OERK/OEJN).
- **Regulatory & sector bodies** — earn citations from GACA-adjacent educational pages, IATA/ICAO
  training resource lists, and university aviation departments by being the cleanest free GACAR
  reference. Never imply endorsement; the disclaimer stays.
- **Communities & forums** — answer real questions on PPRuNe, Reddit r/flying & regional groups,
  Saudi pilot Telegram/WhatsApp/X communities, linking to the exact `#sec-*` anchor or tool that
  resolves the question (deep links convert far better than the homepage).
- **Regional tech/edu blogs & press** — digital-PR hooks: "free bilingual GACAR library", AIRAC
  explainers, "GACAR vs FAA/EASA" comparisons. Pitch around regulation updates.
- **The "Verify against GACA" pattern as authority** — outbound links to the official source on
  every reader build trust (E-E-A-T), and the no-fabrication stance is itself a differentiator worth
  stating in outreach.
- **Internal "link equity" housekeeping** — keep the hub→pillar→clause graph dense; ensure new tools
  and guides are added to the relevant `related`/`GUIDE_TOOLS` maps so equity flows automatically.

---

## Implementation status (this branch)

| Item                                                                          | Status                          | Where                                                  |
| ----------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| Per-page JSON-LD builders (pure, tested)                                      | **Done**                        | `src/lib/jsonld.ts`, `tests/jsonld.test.ts`            |
| `usePageMeta` injects a single managed LD script                              | **Done**                        | `src/lib/usePageMeta.ts`, `tests/page-meta.test.tsx`   |
| Site-wide Organization + WebSite graph (static)                               | **Done**                        | `index.html`                                           |
| Library reader → TechArticle + Breadcrumb                                     | **Done**                        | `src/pages/library/Document.tsx`                       |
| Guides → Article + Breadcrumb                                                 | **Done**                        | `src/pages/guides/Guide.tsx`                           |
| Tools → SoftwareApplication + Breadcrumb                                      | **Done**                        | `src/components/CalcShell.tsx`                         |
| GSC / Bing verification (env-gated)                                           | **Done**                        | `vite.config.ts` (`VITE_GSC_TOKEN`, `VITE_BING_TOKEN`) |
| Sitemap: priority tiers + per-URL hreflang + real `lastmod`                   | **Done**                        | `scripts/build-sitemap.mjs`                            |
| `Course` / `FAQPage` builders                                                 | **Ready, wire on real content** | `src/lib/jsonld.ts`                                    |
| Static hero shell (every host) + Vercel prerender of public routes            | **Done**                        | §3.3 (`index.html`, `scripts/prerender.mjs`)           |
| CWV field monitoring (Vercel Analytics _or_ web-vitals → GA4, host-dependent) | **Recommended**                 | §3.1                                                   |
| Locale path URLs (`/en`,`/ar`)                                                | **Future**                      | §3.5                                                   |

### Production env to set

- `VITE_GSC_TOKEN`, `VITE_BING_TOKEN` — search-engine verification.
- `VITE_SITE_URL` / `SITE_URL` — canonical origin (defaults to `https://flygaca.com`).
- `VITE_FIREBASE_MEASUREMENT_ID` — enables GA4 (and the optional web-vitals reporting).
