# Migration tracker — legacy vanilla Fly GACA monorepo → `FlyGACA-app`

> ⚠️ **Predates the Cloud Run rebuild — the Firebase/Firestore/App Check/Stripe stack
> below is history, not the system.** The live architecture is an Express service on
> **Cloud Run** backed by **Cloud SQL**, billed through **Moyasar**; there is no Firebase
> dependency, config or import anywhere in `src/` or `server/`. See `CLAUDE.md` for how
> it works today, and `docs/RUNBOOK-deploy.md` → `docs/RUNBOOK-infra.md` →
> `docs/RUNBOOK-golive.md` for how it deploys.

This tracker records the **frontend** rebuild. At the time it was written the backend gateway, the
Captain Adel RAG service, the Python `sales_agents/`, `office/`/`docs/`, and the multi-host routing
generator were out of scope. That is no longer the shape of the repo — the gateway and the RAG flow
now live here under `server/` (see CLAUDE.md). The Python agents and the routing generator were
never migrated.

Stage 3 below describes a Firebase + Stripe setup that no longer exists in any form. Read it as a
record of what was built and then replaced, not as a checklist to follow.

## ✅ Foundation done (this PR)

- Vite + React + TypeScript (strict) toolchain, ESLint, Prettier, Vitest.
- Design tokens ported verbatim (`tokens.css`) + global base layer; CSS Modules.
- i18n + RTL engine (i18next, EN/AR bundles, `<html dir>` flip) replacing the `data-en/data-ar`
  attribute engine. Bilingual key-parity test replacing `check:i18n`.
- App shell (`Layout`/`Header`/`Footer`) replacing the `build-chrome.js` stamper.
- Shared `Disclaimer`, `LangToggle`, `CalcShell` + `useUrlState` (replacing `FGCalc`).
- Typed services: `api` (the `/v1/chat` contract), `auth`, `entitlements` (pure `isActive`),
  `native-bridge`, `content`/`useFetchJson`.
- PWA via `vite-plugin-pwa`; Capacitor config (`com.flygaca.app`, `webDir: dist`).
- **Reference vertical slice:** Home, Tools index (data-driven from `public/data/tools.json`,
  since replaced by the typed `src/lib/tools.ts` registry), and the **Crosswind** tool end-to-end
  (pure `calc/crosswind.ts` + unit tests + diagram).

## ✅ Stage 1 — Expanded tools suite

**Platform (Batch 1.0):** typed tool registry (`src/lib/tools.ts`) driving a grouped, searchable
Tools hub (13 categories, ~50 tools shown with live/soon + "new" badges); shared calc primitives
(`src/components/calc/{NumberField,ResultStat,Grids}`); `useNumericInputs` hook; `CalcShell` v2
("How it works" explainer + related-tool chips + category eyebrow). Registry integrity test added.

**Batch 1.1 — Atmosphere & altitude:** pressure altitude / flight level, ISA temp & deviation,
altimeter QNH↔QFE, cloud base (`calc/altimetry.ts`, `calc/cloud.ts` + specs).

**Batch 1.2 — Speed, climb & turns:** Mach↔TAS (`calc/speed.ts`), climb gradient
(`calc/climb.ts`), standard-rate turn (`calc/turn.ts`) + specs.

**Batch 1.3 — Wind & runway:** all-runways wind table (`calc/windTable.ts`), hydroplaning speed
(`calc/hydroplaning.ts`), takeoff/landing runway margin (`calc/runwayPerf.ts`, rule-of-thumb factors
with AFM/POH disclaimer) + specs.

**Batch 1.4 — Navigation & descent:** wind triangle, great-circle distance/bearing, 1-in-60
(`calc/navigation.ts`); top-of-descent, descent/VDP (`calc/descent.ts`); time–speed–distance
(`calc/tsd.ts`) + specs.

**Batch 1.5 — Fuel & weight:** fuel burn/endurance/range + specific range (`calc/fuel.ts`);
weight & balance with %MAC (`calc/weightBalance.ts`) + specs.

**Batch 1.6 — Time & cycles:** Zulu/KSA clock (`calc/zulu.ts`), AIRAC cycle (`calc/airac.ts`),
sun times & civil twilight (`calc/sun.ts`, SunCalc algorithm). Added shared `TextField` primitive.

**Batch 1.7 — Currency & validity:** Part 61 currency, medical validity, flight review/IPC
(`calc/recency.ts`; regulatory period is a user input + "confirm against the cited Part" note).

**Batch 1.8 — Procedures:** holding entry + timing/fuel (`calc/holding.ts`), longitudinal
separation (`calc/separation.ts`), VFR self-brief checklist, LOA letter builder.
**Now live: 32 tools.**

**E6B hub:** tabbed flight computer (true airspeed · wind triangle · time–speed–distance) composing
the existing cores. **Stage 1 calculators complete — 33 tools live.** Remaining: Stage 2
(data/reference).

## ✅ Stage 2 — Data & reference tools

- **Quick reference:** unit converter (`calc/units.ts`), transponder/squawk codes, ICAO phonetic
  alphabet & Morse, chart symbols.
- **Decoders:** METAR (`calc/metar.ts`) + TAF (`calc/taf.ts`) with a bilingual decode layer
  (`lib/wxText.ts`); NOTAM field/abbreviation decoder (`calc/notam.ts`).
- **GACAR reg lookups:** VFR minima, oxygen, fuel reserves, licence conversion — a shared
  `RegLookup` with a "confirm against the cited Part" note + Library/Adel links (no fabricated figures).
- **Directory:** aerodromes (`airports.json`), ICAO airspace classes, GACAR Part 1 glossary
  (`definitions-index.json`, fetched at runtime).
- **Planning:** route planner (great-circle legs from `airports.json`), ICAO flight-plan builder.

**Stage 2 complete.** `src/lib/tools.ts` now registers **55 tools, all `status: 'live'`** — the
count to trust, since the registry is the single source of truth.

## ✅ Stage 4 — Account & commerce (local-first)

Built on a local-first account layer (`src/lib/account.ts`, localStorage via useSyncExternalStore)
standing in for the Stage 3 Firebase service layer — same component API will map onto Firestore:

- Account (email sign-in/out), Dashboard (medical & flight-review validity, total hours), Logbook
  (add/delete flights, column totals, JSON export), Settings (profile, language, delete-all-data).
- Pricing (Free/Pro/Schools, monthly↔annual; checkout stubbed until billing) and Schools (B2B).

## ✅ Stage 5 — Study & guides (client-side)

- Study hub, quizzes + flashcards (`quiz.json`), ground school (`groundschool.json`), mock exam
  (timed, pass-mark), reading paths (`paths-index.json`), prep packs (Pro-gated teaser).
- 10 bilingual guide articles (`/guides`) linking to the regulation, the tools and Captain Adel.

**Remaining (needs the Stage 3 backend or later stages):** real Firebase Auth/Firestore + billing
(Stage 3), full Library document reader + heavy assets (Stage 6), Chat SSE streaming (Stage 7),
native Capacitor (Stage 8), CI + hosting/CSP + Playwright E2E (Stage 0/9), and `met-brief`.

## ✅ Stage 3 — Firebase + billing (emulator-first)

- **Batch 3a — foundation (done).** `src/lib/firebase.ts`: config-gated, lazy bootstrap of
  App/Auth/Firestore (+ App Check) from `VITE_FIREBASE_*`. When unset (CI, preview, no-secret
  contributors) every accessor resolves to `null` and the app stays **fully local-first** — and the
  SDK is dynamic-`import()`ed, so `firebase/*` never enters the main bundle (290 kB, unchanged).
  Dev `VITE_FIREBASE_EMULATOR=1` wires the Local Emulator Suite. Real `src/lib/auth.ts`:
  `getIdToken()` (already consumed by chat), `onAuthChange`, Google/email sign-in + register,
  `signOutUser` — all graceful no-ops when unconfigured. Unit-tested.
- **Batch 3b — account → Firestore (done).** `account.ts` gains a uid + entitlement and, on Firebase
  sign-in, hydrates profile/logbook/entitlement from `users/{uid}` (+ `logbook/`) and write-throughs
  mutations — keeping its `useSyncExternalStore` API and the localStorage offline cache; all guarded
  so it's inert (pure local-first) when unconfigured. The Account page shows real Google/email sign-in
  when configured (local form otherwise); the Dashboard shows the effective plan. `src/lib/sync.ts`
  pure mappers (never serialize the server-only `entitlement`) are unit-tested. The Firestore
  round-trip is verified against the emulator per `docs/RUNBOOK-firebase.md`.
- **Batch 3c — billing (done).** `src/lib/billing.ts`: web Pro checkout via the existing
  `createCheckoutSession` Cloud Function (region `me-central2`) → Stripe-hosted page (requires a
  signed-in user); native iOS routes to RevenueCat IAP via `billingChannel()` (the `native-billing`
  branch, wired in the shell). `firebase.ts` gains a region-pinned `getFns()`. The Pricing Pro CTA
  calls checkout when `canCheckout()` (configured + web), redirecting an unauthenticated visitor to
  sign in; otherwise it stays disabled. Gated + unit-tested; emulator-verified per the runbook.

  **Remaining for production (owner live-ops — see the step-by-step in `docs/BILLING.md`):** create the
  Stripe product/prices, set the `STRIPE_*` secrets/params + `APP_ORIGIN`, register the `/api/stripe-webhook`
  endpoint, `npm run deploy:functions` + `deploy:rules`, then provision the reCAPTCHA/App-Check key and
  enable `enforceAppCheck` last. Native RevenueCat IAP purchase is wired when the
  `@revenuecat/purchases-capacitor` plugin is added to the iOS shell.

  > Fixed in-repo: the client's `FUNCTIONS_REGION` had drifted to `me-central1`; it now matches the billing
  > callables' `me-central2` so checkout resolves in production (guarded by a test in `tests/billing.test.ts`).

## ✅ Stage 9 — Hardening & cutover

- **Route-level code-splitting (9a):** every page except Home is `React.lazy` (typed `lazyNamed`
  helper) under a single `Suspense` boundary in `Layout`. The app shell dropped **300 → 155 kB**
  (91 → 53 kB gzip); eager JS (entry + vendors) is ~134 kB gzip. `scripts/check-bundle.mjs` enforces
  a 160 kB-gzip initial-JS budget as a CI step.
- **SEO finish (9b):** `usePageMeta` emits canonical, `og:url/type/image/locale` and hreflang
  alternates (en/ar via `?lang=` + x-default); `src/lib/seo.ts` pure helpers (unit-tested); `i18n`
  honours `?lang=`; `index.html` has baseline OG/twitter tags. (`sitemap.xml`/`robots.txt` already
  generated at build.)
- **E2E + a11y (9c):** new flows for account sign-in, pricing, charts, study sheets, met-brief; axe
  WCAG2 A/AA extended to `/pricing`, `/account`, `/library/charts`, `/study/sheets`.
- **Cutover (9d):** `archive/docs/RUNBOOK-cutover.md` — parity checklist, the production secret flip, preview
  channel → prod smoke, DNS switch, rollback (legacy host retained). Content-QA: Disclaimer is
  site-wide (Footer + CalcShell + explicit) and no fabricated GACAR figures ship.

**The rebuild is feature-complete and parity-ready — the only remaining gate is the production
secret flip (Firebase config · App Check · Stripe price IDs · deploy rules) before DNS cutover.**

## ✅ Verticals — charts · PDF sheets · met-brief

- **VFR charts** (`/library/charts`): the 13 GACA AIP visual (UVR) sheets as pan/zoom Leaflet image
  overlays (`CRS.Simple`, local images only → no CSP change), grouped by region with a variant
  switcher and shareable `?chart=`. **Leaflet is `React.lazy`-loaded** (~153 kB chunk) — never in the
  main bundle. Linked from the Library header.
- **PDF study sheets** (`/study/sheets`): the deployed one-page study PDFs rendered inline via a
  native `<object>` embed (no PDF library), with open/download and `?doc=`. New Study mode tile.
- **met-brief** (`/tools/met-brief`): the last `soon` tool, now **live**. A route _briefing builder_
  that links each aerodrome to the official source (aviationweather.gov) + our own decoders — it
  never fabricates weather, so no new CSP origin. **All 54 catalog tools are now live.**

## ✅ Stage 7 — Captain Adel chat completeness

- **SSE streaming client** (`src/lib/api.ts`): `sendChatStream()` POSTs `/api/chat?stream=1` and
  yields `token`/`reset`/`final`/`error` events; a pure, unit-tested `drainSse()` implements the
  legacy line protocol (`data:` frames, `[DONE]` sentinel, partial-frame carry-over). Buffered JSON
  is the automatic fallback when the gateway doesn't stream. `sendChat()` retained.
- **Streaming UI** (`src/pages/chat/Chat.tsx`): tokens append to a live bubble with a blinking caret
  (reduced-motion aware); `reset` clears, `final` settles the answer + verdict + sources. Graceful
  "engine not connected" path preserved.
- **Grounding badge** (`src/components/chat/GroundingBadge.tsx`): bilingual grounded / partially
  grounded / hold-not-grounded, with the `§refusalClass` shown LTR via `<bdi>`; new `--warning`/
  `--danger` Falcon tokens. `na`/unknown renders nothing.
- **Sources + verbatim**: citation chips; rows with a passage expand via a native `<details>`
  (corpus version shown). **Transcript persistence** in `localStorage` (`flygaca:adel-transcript`)
  with a Clear action. Auth token already forwarded for Stage 3.
- Unit tests for the SSE parser; an e2e flow asserts a streamed mock renders tokens + a grounded
  badge + a source. CSP already permits same-origin SSE — no `firebase.json` change.

## ✅ Stage 8 — Native Capacitor shell

- **Real `native-bridge` adapter** (`src/lib/native-bridge.ts`): `initNative()` (called from
  `main.tsx`) configures the status bar, hides the splash, marks `<html class="is-native">` and
  wires the Android back button + deep links (`toAppPath()` → the SPA router). `nativeStore`
  (Preferences), `share()` and `openExternal()` fall back to web APIs in a browser. Plugins load via
  `import()` behind an `isNative()` guard, so the **web bundle only ships `@capacitor/core`** (the
  plugin web stubs split into tiny on-demand chunks).
- **Capacitor v8 plugins:** app, status-bar, splash-screen, keyboard, preferences, share, browser,
  plus the ios/android platform packages. `capacitor.config.ts` sets the dark background, manual
  splash hide and keyboard resize.
- **Safe-area insets** (`src/styles/native.css`): the sticky-header height folds in the top inset
  via `--nav-h`, and the footer/body respect the home indicator + landscape notch — all 0 on the
  web. Unit tests cover the web fallbacks + deep-link parsing. See `docs/RUNBOOK-native.md` for
  generating the `ios/`/`android/` projects on macOS.

## ✅ Stage 9 — E2E, a11y & SEO

- **Per-route titles + Open Graph** via `usePageMeta` (replacing the single static title), wired
  through `CalcShell`, the Document reader and every top-level/account/legal page.
- **Generated `sitemap.xml` + `robots.txt`** (`scripts/build-sitemap.mjs`, run before `vite build`)
  from the route table + content indexes; private routes excluded.
- **Playwright E2E** (`e2e/`): a smoke spec (every key route loads, renders an `<h1>`, sets its
  title), critical-flow specs (crosswind compute, library full-text search → reader, EN→AR/RTL
  toggle, chat graceful-degrade) and an **axe a11y** spec (no serious/critical WCAG 2 A/AA
  violations on the top pages). New `e2e` CI job builds, previews and runs them on Chromium.
- **Vendor chunk split** clears the bundle-size warning (app chunk ~265 kB).

**Remaining:** Lighthouse perf budget, more flow coverage, and the production cutover.

## ✅ Stage 6 — Library completeness

- **Full in-app document reader** (`pages/library/Document.tsx`): fetches the regulation HTML,
  sanitizes it (defense-in-depth: strips script/style/iframe/handlers/`javascript:`), builds a
  filterable sticky table of contents from the headings, and deep-links to section anchors.
- **Lazy full-text search:** typing 3+ characters fetches `library-search.json` once and shows
  in-text matches with the query highlighted, each linking into the reader at the exact section.
- **All three corpora** are now browsable + readable behind one generic reader and a corpus
  switcher — **GACAR Regulations** (74 Parts, `parts/`), **Reference Library** (205 docs,
  `library/`) and **GACA Handbooks** (21 docs, `ebooks/`). `searchHref()` maps every legacy
  `type`/`id` to its reader route, so all 46,369 indexed passages are clickable.

**Remaining (deferred):** charts vertical (Leaflet) and the heavy ebook PDFs.

## ✅ Batch 2 done

- **Calculators:** Density altitude (`calc/isa.ts`) and True airspeed (`calc/tas.ts`), both pure +
  unit-tested, built on the Crosswind pattern (`CalcShell` + `useUrlState`).
- **Library:** index page (`pages/library/Library.tsx`) — data-driven from `gacar-index.json`
  with category filter + search — and a per-Part `Document` page showing metadata + outline.
- **Captain Adel chat** (`pages/chat/Chat.tsx`): message list, suggested prompts, `?q=` prefill +
  auto-send, session id, sources rendering, graceful "engine not connected" fallback. Talks to
  `/api/chat` via `lib/api` (JSON POST).
- **Static pages:** About (`pages/About.tsx`) + Disclaimer / Terms / Privacy via a shared
  `LegalPage` prose component driven by structured i18n content.

## Migration complete — what remains

The stage sections above are the record: every catalog tool is live, and the tools, library,
chat (SSE streaming + grounding), study/guides, account/billing (emulator-first), native shell
and hardening/SEO/E2E stages are all done.

Open work — production secret flip, native IAP wiring, the Lighthouse perf budget and broader
E2E coverage, and the rest — is tracked in [`ROADMAP.md`](./ROADMAP.md), the single source of
truth for what's next. This file stays the historical log of the rebuild and no longer carries a
parallel to-do list.
