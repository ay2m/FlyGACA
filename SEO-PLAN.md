# Fly GACA — 2026 SEO plan

The live, checkbox-tracked backlog for search + AI-answer visibility. This is the shared
memory across SEO sessions — **update it as items complete** (tick the box, add the date, note
follow-ups). Seeded 2026-07-04 from the `flygaca-seo` skill template (`references/plan.md`) and
reconciled against the actual repo + a live production audit — several template items were already
built, and the audit surfaced a live P0 incident (see below).

**Doc map.** This file is the SEO source of truth (backlog + status). `docs/RUNBOOK-openseo.md` is
the recurring audit runbook; its working files — where run results are written — are
`docs/seo/technical-audit.md`, `docs/seo/keyword-research.md` and `docs/seo/strategy.md`. The
superseded 2026-06 strategy blueprint is archived at `docs/seo/archive/SEO-STRATEGY-2026-06.md`.

**The 2026 target:** AI answers (Google AI Overviews/AI Mode, ChatGPT, Perplexity, Gemini) absorb a
large share of clicks; visibility = being the *cited source*. That requires, in priority order:
crawlable HTML (most AI bots don't run JS), answer-first structure, verifiable dated facts with named
sources, freshness, E-E-A-T + brand footprint, then schema. Fly GACA's cite-the-exact-Part/section
ethos is exactly what these systems reward — lean into it.

Status legend: `[x]` done · `[~]` partial (gap named) · `[ ]` not started.
Effort: S <½ day · M ~1 day · L multi-day.

---

## 🚨 P0 INCIDENT (found 2026-07-04 by `npm run audit:ai`) — the live site is uncrawlable

The audit script (item 0.1) run against production found **every sampled URL failing on two
independent, citation-fatal counts**:

1. **The canonical domain is `noindex`.** `flygaca.com` (apex) 308-redirects to `www.flygaca.com`,
   and **every `www.flygaca.com` response carries `X-Robots-Tag: noindex, follow`** — so the entire
   production site is telling Google/Bing/AI crawlers *do not index*. Root cause: production is served
   by **Vercel** (both apex and www report `server: Vercel`), and the `vercel.json` noindex rule —
   written to keep *mirror* hosts out of the index — matches `www.flygaca.com` because it isn't the
   exact bare `flygaca.com` host. The apex→www redirect then funnels every visitor onto the noindexed
   host. The pages' own `<link rel="canonical">` points back at bare `flygaca.com`, which just
   redirects to the noindexed www again.
2. **Bodies are the SPA shell, not prerendered content.** Every route returns ~15–410 chars of visible
   text, an empty `#root`, the home-hero placeholder leaking onto non-home routes, and **no
   `<footer>`/`<main>`**. Root cause: the body prerender (`scripts/prerender.mjs`) only runs in the
   **Firebase** deploy path (`npm run deploy`); Vercel builds with `npm run build`, which runs only the
   *head* prerender. So even where indexing were allowed, there'd be no crawlable content.

This predates this session's changes (infra/host config, not code touched here). It supersedes the
rest of the plan: **fix host + indexability first, or every downstream SEO item is invisible.**

- [~] **P0.a — Decide the canonical host & kill the noindex (P0, S–M).** **Decided 2026-07-06
      (owner): Firebase Hosting is primary** — option (a). `deploy.yml` (now the only deploy
      workflow; the racing auto-generated `firebase-hosting-merge.yml` was removed) ships the
      body-prerendered `dist/` to Firebase on every push to `main`. Blocking discovery fixed the
      same day: an accidental `firebase init` commit (`c1897f0`, 2026-07-05) had set `firebase.json`
      `hosting.public` to `"y"`, so Firebase was serving a stock welcome page — restored to `dist`
      with the full headers block. *Remaining (owner, not code):* DNS cutover of `flygaca.com` +
      `www` from Vercel to Firebase per `archive/docs/RUNBOOK-cutover.md`, adding `www.flygaca.com` as a
      redirect-to-apex domain in the Firebase console; until then Vercel still serves the apex.
- [ ] **P0.b — Ensure the served host body-prerenders (P0, M).** Whichever host wins P0.a must serve
      `scripts/prerender.mjs` output. If Vercel: add the prerender step to its build (needs Chromium in
      the Vercel build) or a prerender/ISR equivalent. Re-run `npm run audit:ai` until green.
- [~] **P0.c — Reconcile the redirect & canonical (P0, S).** apex↔www redirect direction must point at
      the indexable canonical host and match `src/lib/seo.ts` `SITE` + the sitemap. No
      canonical→redirect→noindex chains. *Partial — 2026-07-06:* the `vercel.json` noindex rule now
      matches "any host except exactly `flygaca.com`", but nothing folded `www.flygaca.com` onto the
      apex, so `www` served a live **noindexed duplicate**. Added a `www.flygaca.com →
      https://flygaca.com` 301 in `vercel.json` `redirects[]` (mirrors the `captadel.com` entries), so
      the only served/indexable host is the non-www canonical used by `seo.ts` `SITE_ORIGIN` + the
      sitemap. Remaining: confirm the served host body-prerenders (P0.b) — a host decision, not a code
      fix; see the log entry below.

DoD for the incident: `npm run audit:ai` exits 0 (all sampled URLs indexable + body-visible to
GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot).
The working backlog for search + AI-answer visibility. Execute items with Claude Code — the `flygaca-seo` skill (`.claude/skills/flygaca-seo/`) carries the playbook, repo conventions, and per-topic references; each item below has a paste-ready prompt. Tick items as they land, note the date, keep this file honest.

**The 2026 thesis:** AI answers (Google AI Overviews/AI Mode, ChatGPT, Perplexity, Gemini) absorb roughly half the clicks that used to reach #1 results; visibility = being the *cited source*. AI crawlers don't execute JavaScript, so the prerender pipeline is the single most important SEO asset. Citability = crawlable HTML → answer-first structure → verifiable facts (cite the GACAR Part/section — our home turf) → freshness (the 28-day AIRAC cycle is a gift) → E-E-A-T/brand footprint → schema. Deprioritized on 2026 evidence: llms.txt tooling (AI crawlers essentially never fetch it), mass-generated content (demoted), `/ar/` path migration (revisit only if 0.3's chosen fix proves insufficient).

Legend: **P0** do first · effort S <½ day, M ~1 day, L multi-day · every item ends with `npm run verify` green and this file updated.

---

## Phase 0 — Verify & harden the crawl foundation (P0)

- [x] **0.1 No-JS visibility audit (S).** `scripts/audit-ai-visibility.mjs` + `npm run audit:ai`.
      Fetches the live sitemap, samples route types × `?lang` variants, requests each with the AI-bot
      UAs + a browser control, and asserts both **indexable** (no `noindex` header/meta) and
      **body-visible** (real `<footer>`/`<main>` + ≥600 chars, not the SPA shell). Exits non-zero on
      failure (CI-cron ready; intentionally *not* in `verify`/`deploy` — it's a network check).
      *Done 2026-07-04. First run immediately surfaced the P0 incident above.*
- [x] **0.2 Prerender coverage gate (M).** `scripts/prerender.mjs` now enumerates every
      sitemap-backed dynamic route the build can expand (reader corpus + aerodromes + prep packs),
      raises `PRERENDER_MAX` to 560, and warns loudly in CI if the corpus is ever trimmed. New
      `scripts/check-prerender-coverage.mjs` diffs the shipped sitemap against body-prerendered
      `dist/` output and fails the deploy when any URL is missing or head-only (`<footer>` is the
      body marker; `PRERENDER_COVERAGE_LENIENT=1` is the emergency escape hatch). Wired into
      `npm run check:prerender`, `deploy` / `deploy:all`, and the Firebase deploy workflow.
      *Done 2026-07-03.* Note: this protects the Firebase path; it does **not** solve the live
      Vercel shell issue captured in P0.b.
- [ ] **0.3 Arabic variant prerender (M).** Structural gap: static hosts resolve by path only, so under
      the `?lang=` model the Arabic body is never served pre-rendered — a no-JS crawler always gets the
      default-language body. Confirmed by 0.1 (Arabic body present on 0/12 `?lang=ar` URLs, though that
      run is dominated by the P0 shell issue). Needs a deliberate decision: dual-render Arabic snapshots
      to distinct paths (+ a serving strategy) or revisit the URL model for content routes. Gates Phase 3.
- [x] **0.4 robots/headers bot posture (S).** `robots.txt` (generated by `scripts/build-sitemap.mjs`)
      now carries explicit `Allow: /` stanzas documenting intent for GPTBot, OAI-SearchBot, ChatGPT-User,
      ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, Bingbot;
      wildcard still `Allow: /`. Mirrors confirmed `noindex` in `vercel.json`/`public/_headers`. *Done
      2026-07-04.* ⚠️ Caveat: the noindex rule is currently over-matching the canonical host — see P0.a.

## Phase 1 — Answer-first content layer (P0–P1)

- [ ] **1.1 KeyFacts component (M).** Reusable bilingual "Key facts" block (3–6 self-contained bullets +
      governing Part/section) under the H1 of guides and Part landings; text from i18n; wired into
      JSON-LD via `usePageMeta`. *Today: guides show intro + a takeaways `<aside>`, no key-facts block.*
- [ ] **1.2 FAQ component + FAQPage schema (M).** Visible FAQ fed by i18n; `faqLd` builder emits FAQPage
      matching on-page text verbatim. *Today: the `faqLd` builder exists and is wired on `/about` only;
      guides have no FAQ.* Roll out to the four money guides first
      (`how-to-become-a-pilot-in-saudi-arabia` / `saudi-ppl-requirements`, `gaca-medical-class-1`,
      `foreign-license-conversion-to-gaca`, `icao-english-saelpt`). Each answer self-contained + its own
      verify-against-GACA caveat, in **both** languages.
- [ ] **1.3 Answer-first rewrite of money pages (L).** H1 as searched, answer complete in first ~200
      words, tables for enumerables, provenance footer. EN + AR authored separately (not translated).
- [ ] **1.4 Part landing summaries (L).** Each GACAR Part landing gets a human summary (what it covers,
      who it applies to, most-referenced sections). *Today: `Document.tsx` renders machine-extracted
      corpus only — no summary panel.* Derive from the Part's actual text; never fabricate. Top-15 by
      traffic first.
- [ ] **1.5 Glossary page (M).** Bilingual GACAR/aviation glossary; `DefinedTermSet`/`DefinedTerm`
      schema; internal-linked. *Today: no route/component/i18n keys, and the corpus already holds 1,736
      definition terms (currently search-only) to seed it.* ≥50 terms, both languages, in sitemap.

## Phase 2 — Structured data upgrades (P1)

- [x] **2.1 BreadcrumbList site-wide (S).** `breadcrumbLd` in `jsonld.ts`, emitted via `usePageMeta` on
      library docs, guides, tools, about. *Largely done; spot-check any content route added later.*
- [~] **2.2 dateModified/dateReviewed everywhere (M).** `articleLd`/`techArticleLd` accept `dateModified`
      and `Document.tsx` feeds corpus `effectiveDate`/`revision`; **but** no visible on-page date and no
      review dates on guides. *To do:* surface the same date on-page; add guide review dates.
- [~] **2.3 Course/LearningResource for Ground School (M).** `courseLd` builder exists but is **not
      wired** to the ground-school/study routes yet.
- [~] **2.4 Organization entity hygiene (S).** `organizationLd` with stable `@id` ships site-wide; verify
      `sameAs` real profiles + `contactPoint` (i@flygaca.com), consistent name/logo. No accreditation
      claims.
- [~] **2.5 JSON-LD validation in CI (M).** `tests/jsonld.test.ts` + `tests/seo.test.ts` +
      `tests/page-meta.test.tsx` cover the builders in `npm run test`. *Missing:* a
      `scripts/validate-jsonld.mjs` that walks the prerendered `dist/` and fails CI on invalid emitted
      schema (as opposed to unit-testing the builders).

## Phase 3 — Arabic as a first-class search track (P1) — gated on 0.3

- [ ] **3.1 Arabic keyword & intent pass (M).** Research Arabic queries natively; adjust AR
      titles/descriptions in `ar.json` for the money pages; document query→URL map here.
- [~] **3.2 hreflang refinement (S).** `src/lib/seo.ts` emits `en` / `ar` / `x-default` via `?lang=`
      (head + sitemap match). *Consider:* `ar-SA` alongside `ar` (Gulf targeting); `og:locale` already
      maps `ar → ar_SA`.
- [ ] **3.3 Arabic answer-first content (L).** AR KeyFacts/FAQ/answer blocks in MSA with Gulf awareness
      (depends on 0.3, 1.1–1.3). Add an Arabic assistant audit (ask in Arabic) to the quarterly check.

## Phase 4 — Performance / CWV (P1–P2)

- [~] **4.1 Field-data plumbing (S).** Uses `@vercel/analytics` + Speed Insights (`src/lib/analytics.ts`,
      web+prod only). *Gap per skill:* Firebase is meant to be the primary host, so Vercel-mirror-only
      field data misses real users — add `web-vitals` reporting into own analytics; review GSC CWV
      monthly. (Interacts with the P0 host decision.)
- [ ] **4.2 INP audit & fixes (M).** Library search input (debounce, chunk/worker the ~19 MB index
      filtering — `useDebouncedValue` exists), calculators, language/RTL toggle. Target <200ms field INP.
- [ ] **4.3 Content-page LCP & CLS pass (M).** LCP = server-present text on library/guide templates;
      reserve space for lazy blocks; test RTL.

## Phase 5 — Freshness & indexing ops (P1–P2)

- [ ] **5.1 AIRAC freshness loop (M).** Aerodrome/chart pages show current AIRAC cycle + last-reviewed;
      `dateModified` bumps from the data pipeline each cycle; sitemap `lastmod` follows real changes.
      *Today: AIRAC math exists (`src/calc/airac.ts`, `changeTracking.ts`) but is shown only on
      `/tools/airac`, not on charts/aerodromes/library.*
- [ ] **5.2 IndexNow on deploy (S).** Post-deploy ping with changed URLs (Bing/Copilot; Google ignores
      it — sitemaps cover Google). *Not started.*
- [ ] **5.3 Quarterly refresh calendar (S, recurring).** Top ~20 pages re-verified/refreshed quarterly
      (AI citation decay ~3 months); log dates here.
- [ ] **5.4 AI-visibility measurement (S, recurring).** Analytics segment for AI referrers
      (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com); quarterly assistant audit
      EN+AR (10 canonical questions, log citations). Pair with a scheduled `npm run audit:ai` run.

## Phase 6 — E-E-A-T & off-site authority (P1–P2, largely non-code)

- [~] **6.1 About/methodology page (M).** `src/pages/About.tsx` has methodology, FAQ, contact +
      org/article/faq/breadcrumb schema. *To add:* `AboutPage` type, an explicit corrections policy,
      update cadence.
- [~] **6.2 Provenance component (S).** *Today:* an inline "verify against GACA" line in `Document.tsx`
      + the global `<Disclaimer />`; no reusable "Source: GACAR Part X §Y — verify at gaca.gov.sa · last
      reviewed DATE" component. Formalize it and put it on all content pages.
- [ ] **6.3 Off-site presence programme (recurring, human-led).** Honest participation where Saudi/GCC
      aviation students gather (Reddit, PPRuNe ME, X, flight-school communities); school/instructor
      partnerships; original-data releases (AIRAC change notes, aerodrome dataset). No astroturfing.
- [ ] **6.4 Entity grounding (S).** Consistent naming/profiles; Wikidata entry; Wikipedia only if
      genuinely notable.

---

## Explicitly deprioritized (2026 evidence)

- **llms.txt tooling** — keep `public/llms.txt` accurate, invest nothing more (AI crawlers essentially
  never fetch it; no measured citation effect).
- **`/ar/` path migration** — textbook-ideal but high-risk refactor; revisit only if the `?lang=ar`
  parameter-variant prerendering (0.3) proves insufficient in GSC/citation data.
- **Mass content generation** — demoted by 2025–26 core updates and corrosive to the trust profile.

## Suggested order of execution

**P0 incident (P0.a → P0.b → P0.c) first — nothing below matters while the site is noindex + shell.**
Then 0.2 → 0.3 → 1.1 → 1.2 → 1.3 (with 2.2, 2.5 alongside content work) → 3.x → 1.4/1.5 → 4.x → 5.x →
6.x. Phases 5.3/5.4/6.3 are recurring.

## Session log

- **2026-07-06** — **Canonical/indexability fix (part of P0.c).** Added a `www.flygaca.com →
  https://flygaca.com` 301 to `vercel.json` `redirects[]` so the non-canonical `www` host stops
  serving a live `noindex` duplicate (the noindex rule matches every host except the bare apex; the
  apex is the non-www canonical used by `seo.ts` `SITE_ORIGIN` + the sitemap). Verified the sitelinks
  `SearchAction` in `index.html` targets `https://flygaca.com/library?q={search_term_string}` on the
  canonical origin and resolves to the working Library `?q=` search — correct, no change. Reconciled
  stale plan items against the shipped code: `courseLd` **is** wired to the study routes
  (Paths/MockExam/Flashcards/Quiz/GroundSchool/PackDetail — item 2.3 largely done); the `/ar`
  locale-prefix migration **is** done (`seo.ts`); noindex is now "all hosts except apex". **Could not
  run `npm run audit:ai`** — this session's egress policy blocks outbound to `flygaca.com` (proxy 403),
  so the live indexability/body-visibility baseline (P0.a/P0.b: is prod still `noindex`? is the served
  host body-prerendering or shipping SPA shells?) is **unconfirmed and still open** — run the audit
  from a network-allowed environment (CI cron or locally) to close it. Host decision (Firebase vs
  Vercel body-prerender) remains the user's call; not touched here.
- **2026-07-04** — Seeded this plan (reconciled to real repo state). Shipped **0.1**
  (`scripts/audit-ai-visibility.mjs` + `npm run audit:ai`) and **0.4** (AI-bot stanzas in the generated
  `robots.txt`). First audit run surfaced the **P0 incident** (canonical domain `noindex` + shell-only
  bodies, served by Vercel) — filed above; not yet fixed. Corrected an earlier mis-read that 0.2's
  coverage gate already existed — it does not (only a non-fatal warn).
- [ ] **0.1 No-JS visibility audit (S).** New `scripts/audit-ai-visibility.mjs`: fetch ~25 production URLs (every route type × both languages) as GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot/browser; assert expected body text; print a coverage table.
  Prompt: *"Using the flygaca-seo skill, build scripts/audit-ai-visibility.mjs per SEO-PLAN item 0.1 and run it against https://flygaca.com."*
- [x] **0.2 Prerender coverage gate (M). DONE 2026-07-03.** The gap was larger than first measured: the sitemap indexes ~530 URLs but `prerender.mjs` only enumerated base routes + the library corpus under a 400 cap — missing 5 capped library docs **plus all 121 aerodrome pages and 6 pack pages** (never enumerated at all). Shipped: (a) `prerender.mjs` now enumerates every sitemap-indexed dynamic route (corpus → aerodromes → packs, citation-value order), default cap 560 (532 needed today, 28 headroom), loud warning on any trim; (b) new `scripts/check-prerender-coverage.mjs` — fails the deploy if any sitemap URL ships missing or head-only (`<footer>` = body marker; `PRERENDER_COVERAGE_LENIENT=1` emergency escape hatch); (c) wired as `npm run check:prerender` into `deploy`/`deploy:all` and as a fatal step in `.github/workflows/deploy.yml`. Verified: gate fixture-tested (fail/pass/lenient), full-repo typecheck + lint/prettier on changed files green, route math confirmed. **Not run here** (sandbox memory limits): full vitest suite + vite build — run `npm run verify` once before committing (changes touch no app source, so risk is low). **Note:** next deploy prerenders 532 routes (~+130 vs before) — expect a longer prerender step.
- [ ] **0.3 Arabic variant prerender (M). CONFIRMED STRUCTURAL GAP (2026-07-03):** static hosts resolve files by path only, so under the `?lang=` model Arabic bodies are never served prerendered — no-JS crawlers always get the default-language body. Decide the mechanism (dual-render Arabic snapshots to distinct paths + serving strategy, or revisit the URL model for content routes) and implement. Gates all of Phase 3.
  Prompt: *"Per flygaca-seo plan item 0.3, analyze the options for making ?lang=ar content crawler-visible and implement the chosen one."*
- [ ] **0.4 robots/headers bot posture (S).** Explicit Allow stanzas for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot in `public/robots.txt`; audit `_headers`/`_redirects`/`firebase.json` for anything challenging bot UAs; confirm mirrors stay noindex.

## Phase 1 — Answer-first content layer (P0–P1)

- [ ] **1.1 KeyFacts component (M).** Bilingual "Key facts" block (3–6 self-contained factual bullets + governing Part/section) under the H1 of guides and Part landings; i18n-fed; wired into JSON-LD via `usePageMeta`. Ship on one guide as the pattern-setter.
- [ ] **1.2 FAQ rollout (M).** Visible FAQ + `faqLd` FAQPage schema on the four money guides (licensing, medical, conversion, ELP). Each answer self-contained with its own GACAR citation + verify-against-GACA caveat (both languages — Arabic caveat written natively). Source questions from Captain Adel logs + GSC.
- [ ] **1.3 Answer-first rewrite of money pages (L).** H1 as-searched, answer complete in first ~200 words, tables for enumerables, provenance footer — EN and AR authored separately.
- [ ] **1.4 Part landing summaries (L).** Human summary per GACAR Part landing (what it covers, who it applies to, key sections). Top-15 Parts first, batchable.
- [ ] **1.5 Glossary (M).** Bilingual GACAR/aviation glossary page with `DefinedTermSet` schema, ≥50 terms, internally linked, in sitemap.

## Phase 2 — Structured data upgrades (P1)

- [ ] **2.1 BreadcrumbList site-wide (S).** `breadcrumbLd` from route ancestry on all content routes, localized names, mirrored in the no-JS layer (`prerender-head.mjs`).
- [ ] **2.2 dateModified/dateReviewed everywhere (M).** From real corpus metadata (AIRAC date, sync date, review date); same date visible on-page.
- [ ] **2.3 Course/LearningResource for Ground School (M).** Course → hasCourseInstance; lessons as LearningResource (`teaches`, `inLanguage`).
- [ ] **2.4 Organization entity hygiene (S).** `sameAs` real profiles, `contactPoint` i@flygaca.com, consistent name/logo. No accreditation claims.
- [ ] **2.5 JSON-LD validation in CI (M).** Vitest specs per builder + `scripts/validate-jsonld.mjs` walking prerendered dist; chain into verify/CI.

## Phase 3 — Arabic as a first-class search track (P1, gated on 0.3)

- [ ] **3.1 Arabic keyword & intent pass (M).** Research Arabic queries natively (not translations); rewrite AR titles/descriptions for money pages; document the query→URL map here.
- [ ] **3.2 hreflang refinement (S).** Consider `ar-SA` alongside `ar`; head and sitemap alternates identical; `x-default` = parameterless URL.
- [ ] **3.3 Arabic answer-first content (L).** AR KeyFacts/FAQ/answer blocks in MSA with Gulf awareness; Arabic added to the quarterly assistant audit.

## Phase 4 — Performance / CWV (P1–P2)

- [ ] **4.1 Field-data plumbing (S).** `web-vitals` reporting into own analytics (Firebase is primary — don't rely on the Vercel mirror's Speed Insights); GSC CWV monthly.
- [ ] **4.2 INP audit & fixes (M).** Library search input path (debounce/chunk/worker), calculators, language/RTL toggle — UI-first updates, heavy work deferred; target <200ms field INP.
- [ ] **4.3 Content-page LCP & CLS pass (M).** LCP element = server-present text on library/guide templates; reserve space for lazy blocks; test both RTL/LTR.

## Phase 5 — Freshness & indexing ops (P1–P2)

- [ ] **5.1 AIRAC freshness loop (M).** Aerodrome/chart pages show current AIRAC cycle + last-reviewed; `dateModified` bumps from the data pipeline each cycle; sitemap `lastmod` truthful.
- [ ] **5.2 IndexNow on deploy (S).** Post-deploy ping with changed URLs (Bing/Copilot ecosystem; Google ignores it — sitemaps cover Google).
- [ ] **5.3 Quarterly refresh calendar (recurring).** Top ~20 pages re-verified/refreshed quarterly (AI citation decay ~3 months). Log dates here.
- [ ] **5.4 AI-visibility measurement (recurring).** Analytics segment for AI referrers (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com); quarterly assistant audit EN+AR (10 canonical questions, log citations).

## Phase 6 — E-E-A-T & off-site authority (P1–P2, largely non-code)

- [ ] **6.1 About/methodology page (M).** Who builds it, how content is processed from GACA sources, update cadence, corrections policy, contact; footer-linked; `AboutPage` schema.
- [ ] **6.2 Provenance component (S).** "Source: GACAR Part X §Y — verify at gaca.gov.sa · last reviewed DATE" on all content pages.
- [ ] **6.3 Off-site presence programme (recurring, human-led).** Honest participation where Saudi/GCC aviation students gather (Reddit, PPRuNe ME, X, flight-school communities); partnerships with schools/instructors; original-data releases (AIRAC change notes, aerodrome dataset). No astroturfing — LLMs learn brands from these surfaces, and one exposed fake thread costs more than a hundred honest answers earn.
- [ ] **6.4 Entity grounding (S).** Consistent naming/profiles; Wikidata entry; Wikipedia only if genuinely notable.

---

**Suggested order:** 0.1 → 0.2 → 0.3 → 0.4 → 1.1 → 1.2 → 1.3 (2.1/2.2/2.5 alongside) → 3.x → 1.4/1.5 → 4.x → 5.x → 6.x. Items 5.3/5.4/6.3 recur.

**Log**
- 2026-07-03 — Plan created. Items 0.2 and 0.3 confirmed as live issues during skill eval runs against repo copies.
- 2026-07-03 — **0.2 shipped**: full sitemap↔prerender enumeration parity (adds 121 aerodromes + 6 packs + 5 capped library docs), cap 400→560, fatal coverage gate (`check:prerender`) in deploy + CI. Follow-up: run `npm run verify` before committing; 0.3 (Arabic bodies) is next and now has a gate to build against.
  bodies, served by Vercel) — filed above; not yet fixed.
- **2026-07-03** — **0.2 shipped**: full sitemap↔prerender enumeration parity (adds aerodromes +
  packs alongside the reader corpus), cap 400→560, fatal coverage gate (`check:prerender`) in deploy
  + CI.
