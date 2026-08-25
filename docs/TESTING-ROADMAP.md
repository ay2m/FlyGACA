# Testing Roadmap

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

A phased plan for raising unit-test coverage where it protects the highest-risk code first.
Companion to `ROADMAP.md` (product) — this one tracks the **test suite**.

## Where we are — August 2026 family-wide audit

`npm run test:coverage` measures the unit-testable layers only (`src/calc`, `src/hooks`,
`src/lib`, `src/components` — pages and app chrome are excluded by `vitest.config.ts` and owned by
the Playwright E2E suite). Measured 2026-08-03 (186 spec files):

| Metric | Coverage | Ratchet |
| --- | --- | --- |
| Statements | 81.8% | 76 |
| Branches | 76.8% | 73 |
| Functions | 85.6% | 79 |
| Lines | 82.8% | 77 |

(The ratchet has since been raised to **84 / 79 / 88 / 85** — statements/branches/functions/lines
— as coverage rose; `vitest.config.ts` is the source of truth, not this audit-day table.)

The rest of the family, same date:

| Surface | Lines | Branches | Notes |
| --- | --- | --- | --- |
| `functions/` (339 tests) | 98.0% | 90.2% | ratchet 95/89/95/97 (stmt/branch/func/line); **Phase 5 complete** — founding + billing wrappers, gateway + corpus |
| Firestore rules (`tests/rules/`, emulator) | — | — | comprehensive — every collection has allow + deny cases |
| Captain-Adel (`ay2m/Captain-Adel`) | 96.3% | 89.9% | `node --test` coverage, report-only; holes → **Phase 9** |
| iOS `FlyGACAKit` (`ay2m/FlyGACA`) | — | — | engines/models/store tested; `FeatureUI` + 2 decoders untested → **Phase 9** |

(The `functions/` and Firestore-rules rows describe the retired Firebase stack. Today's backend is
`server/` — Express on Cloud Run — with its own coverage ratchet in `server/vitest.config.ts`, and
there is no `tests/rules/` tree in this repo.)

The aviation-math core (`src/calc/*` — every module has a referencing spec), the backend
`*-core.ts` policy modules, and the client↔server mirror tests are all at or near 100%: the
"pure core, thin wrapper" architecture is holding. The open gaps are concentrated, not diffuse:
(1) the backend **wrappers that move money and write entitlements** (Phase 5 — **complete**:
founding + billing callables + the renewal engine, plus the gateway route/streaming/App-Check
paths and the corpus loader), (2) the
**configured-API half** of the client services (Phase 6), (3) a tail of zero-coverage
components plus shared date-math branches (Phase 7), and (4) everything behind sign-in or payment
in E2E (Phase 8). Family-wide items are batched in Phase 9. Phases 1–4 record the earlier push and
are complete except where noted.

## Conventions for new tests

Reuse the existing patterns — don't invent new scaffolding:

- The `tests/` tree is **flat** — one file per suite at the root (no lib/, hooks/, components/,
  pages/, integrity/ or rules/ subdirs; only `tests/helpers/` holds shared fixtures).
- Render with `renderWithRouter` from `tests/helpers/render.tsx` (adds a `LocationProbe`).
- Global `tests/setup.ts` already boots i18next (en/ar), installs a `MockStorage`, clears the
  content cache, and stubs `scrollIntoView` — assert against real English strings.
- Mock the backend transport with `vi.mock('@/lib/services/backend')` + the `makeBackendModule`
  holder from `tests/helpers/mockBackend.ts` — see `tests/org-client.test.ts`,
  `tests/sync-io.test.ts`. (No Firebase mocks, no emulators — the backend client is plain fetch.)
- Hooks: `renderHook` + `waitFor` + `act` — see `tests/fetch-hooks.test.tsx`,
  `tests/pwa-hooks.test.ts`.
- Widgets: seed `localStorage`, then **dynamic** `await import(...)` — see
  `tests/dashboard-widgets.test.tsx`.
- `useSyncExternalStore` stores: see `tests/library-prefs-store.test.ts`.

## Phase 1 — Account / billing / entitlement services + backend gate  *(highest risk)*

This is the code that gates money and access. `CLAUDE.md` requires the client mirrors to match the
server core.

- [x] `tests/staff.test.ts` — `src/lib/services/staff.ts`: pure `looksLikeStaff()` matching + all
      `claimStaffAccessIfEligible` no-op/happy paths (callable `claimStaffAccess`).
- [x] `tests/school.test.ts` — `src/lib/services/school.ts` (0%): `claimSchoolSeatIfEligible`
      (callable `claimSchoolSeat`).
- [x] `tests/waitlist.test.ts` — `src/lib/services/waitlist.ts` (0%): `addDoc` payload shape +
      the `'unavailable'` throw when the db is null.
- [x] `tests/study-progress-sync.test.ts` — `src/lib/services/studyProgressSync.ts` (16%):
      local-first no-op paths + the initial upload payload/path. (Now ~88% lines.)
- [x] Broaden existing suites to lift the uncovered branches in `services/account.ts` (~66%),
      `services/billing.ts` (~62%), `services/auth.ts` (~72%). *Partially:* `billing.ts` lifted to
      ~86% lines; `account.ts`/`auth.ts` still sit near 70% — the remainder needs the
      configured-API harness and is carried into **Phase 6**.
- [x] Backend coverage gate: add `@vitest/coverage-v8` + a ratchet threshold to
      `functions/vitest.config.ts` and a `test:coverage` script, so the `functions` CI job can't
      silently regress.

## Phase 2 — Untested hooks + pure widget helpers  *(cheap wins → raise the ratchet)*

- [x] `src/hooks/useForm.ts` (0%, 110 lines) — validate-on-blur/change, submit gating +
      focus-first-invalid, successful submit toggling `isSubmitting`, `resetForm`.
- [x] `src/hooks/useViewMode.ts`, `useDebouncedValue.ts`, `usePrefersReducedMotion.ts` (all 0%).
- [x] `src/lib/prefs/updatesPrefs.ts` (0%) — clone `library-prefs-store.test.ts`.
- [x] `RadarWidget.buildBlips()` in `src/components/bento/widgets/RadarWidget.tsx` (0%) — exported
      the pure helper and pinned its corpus→polar mapping.
- [x] Wire the coverage ratchet into CI: both the app and `functions` jobs now run
      `npm run test:coverage`, so the thresholds gate merges (previously they ran `npm run test`,
      making the ratchet local-only).
- [x] Raise the `vitest.config.ts` thresholds to just below the new live numbers
      (now 75/72/77/76, up from 72/70/73/72).

## Phase 3 — Widget / peripheral-chat render smoke  *(lower risk)*

- [x] Hub controls `ViewToggle` / `SortSelect` (both 0%) — `tests/hub-controls.test.tsx`.
- [x] Peripheral chat UI `SourcesDigest`, `CrossRefChips`, `ExportActions` (all 0%) —
      `tests/chat-digest.test.tsx`. Ratchet raised again to 76/73/79/77.
- [x] Bento widgets `StatValue` / `ToolsWidget` / `LearnWidget` (all 0%) —
      `tests/bento-widgets.test.tsx`.
- [x] Library `SelectionPopover` (0%) — `tests/selection-popover.test.tsx`.
- [x] `SpeakButton` (24%) — `tests/speak-button.test.tsx` with a `speechSynthesis` stub.

Final app coverage after Phases 1–3: **78.9 / 74.5 / 81.6 / 79.9** (from 72.2 / 70.6 / 74.2 / 72.8).
The ratchet sits at 76/73/79/77 with headroom.

## Phase 4 — Pages coverage

`src/pages/` (99 modules) is deliberately **outside** the coverage `include` in
`vitest.config.ts`; pages are exercised by the Playwright E2E suite (`e2e/`) plus a few targeted
page unit tests. Two complementary tracks:

**Done — widen the cheap render-smoke net** (guards against render-time crashes, no architectural
change):

- [x] `tests/tool-pages-smoke.test.tsx` — the ~45 self-contained CalcShell tool pages (pre-existing).
- [x] `tests/static-pages-smoke.test.tsx` — the static i18n-driven pages (`About`, `NotFound`,
      `Offline`, and the four legal docs). Same parameterized-loop pattern.

**Open — the structural decision (team call):** whether to fold `src/pages/**` into the coverage
`include`. Doing so would drop the headline number sharply (pages are ~40% of `src`, mostly E2E- not
unit-covered) and would pressure unit-testing of data/auth/router-param pages that E2E serves better.
Recommendation: **keep pages E2E-owned**, keep growing the smoke nets above for crash-safety, and
expand the Playwright suite (`e2e/`) for the data/auth flows — rather than folding pages into the
unit-coverage ratchet.

**Update (Aug 2026):** the oversized-file split pass is the working model for this. `Chat.tsx`,
`Document.tsx`, `Pricing.tsx`, and `SignInForms.tsx` each shed their pure logic into tested
`calc/*` modules and ratchet-counted hooks (`calc/chat/chatStream`,
`calc/app/{pricingView,passwordPolicy,emailShape}`, `useConversations`, `useFindInPage`,
`usePricingCheckout`, `useSignInForm`, …) while the page itself stayed a thin, E2E-owned shell —
raising the ratchet without folding `src/pages/**` into the `include`.

---

Phases 5–9 come from the **August 2026 family-wide audit** (per-function hit counts, not just file
percentages — see *Measuring* below). Ordered by risk: money first, then access, then UI, then the
sibling repos.

## Phase 5 — Backend money & entitlement wrappers  *(highest risk — go-live confidence)*

`functions/` is two codebases in one: every pure `*-core.ts` policy module sits at ≈100%, and the
whole shortfall lives in three Firebase wrappers — exactly the code that charges cards and writes
`users/{uid}.entitlement`.

- [x] `functions/tests/founding-routes.test.ts` — `functions/src/founding.ts`
      (`claimFoundingAccess`) was the
      **only backend file at 0%**, and it grants a Pro entitlement. Cloned the
      `staff-routes.test.ts` / `school-routes.test.ts` harness (plus a `firebase-admin/auth`
      `getUser` mock for the server-only creation-time signal) and covered: unauthenticated
      rejection, the unverified-email gate, the launch-cutoff eligibility gate, the successful
      time-limited grant, the `foundingGrants/{uid}` one-grant-ever marker, and the upgrade-only
      rule (never touches a non-free account). **Now 100% lines / 93% branch.**
- [x] `functions/src/billing.ts` (was ~50% lines / 37% branch → **now ~97% lines / 84% branch**,
      via `functions/tests/billing-callables.test.ts`). Covered the previously-zero-hit surface:
      `createCheckoutConfig` (all validation guards + every accepted kind + `priceWithPromo`'s
      server-side discount and inactive-code fallthrough), `confirmPayment` (auth/id guards, the
      payment-is-yours check, amount-mismatch cancel, and the full fulfilment matrix — pro card-save
      + subscription, bundle, cohort, credits, pack, promo-redemption counting), `cancelAutoRenew`,
      `getReferralCode`, and the entire scheduled renewal loop (`renewMoyasarSubscriptions` /
      `renewOne` / `recordRenewalFailure`) — successful recharge, lost-token cancel, the
      past_due→give-up retry ladder, and the non-paid-result failure path. Driven through the
      callable/schedule `.run()` escape hatch with an in-memory Firestore (incl. the `where`-query
      for the due sweep) + a per-test Moyasar `fetch` stub.
- [x] `functions/src/gateway.ts` (was ~71% lines → **now ~96% lines / 90% branch**) and
      `functions/src/corpus.ts` (was ~90% lines → **now 100% lines**). Extended
      `gateway-routes.test.ts` (SSE streaming success + mid-stream error, the session
      login/logout endpoints, the licensed-API tier/quota/malformed/500 paths, allowed-Origin +
      localhost CORS, and the fail-open/fail-closed Firestore-fault catches) and added
      `gateway-appcheck-routes.test.ts` (the enforced-App-Check `AuthError → 403` route branch for
      `/chat` and `/feedback`, driven through a second in-process server). corpus: a new
      `corpus-loader.test.ts` covers `loadRaw` (disk + HTTP sources), the `getIndex` cache-reset
      retry, and real BM25 `retrieve` ranking/skip paths. The `gateway-core.ts` extraction recorded
      under Tech debt in `ROADMAP.md` remains a separate (now optional) refactor — the rejection
      paths are covered without it.
- [x] **Exit:** raised the `functions/vitest.config.ts` ratchet 66/66/77/67 → 88/84/91/89 (with the
      founding + billing wrappers) → **95/89/95/97** (with gateway + corpus). Live now
      96.7/90.2/96.9/98.0 stmts/branch/funcs/lines, up from 75.6/75.2/81.8/76.5 at the start of
      Phase 5.

## Phase 6 — The configured-API half of the client services

Local-first means the unconfigured path (`isBackendConfigured()` false, every service a no-op) is
well tested; the configured path largely isn't. (This phase originally targeted
`src/lib/services/firebase.ts`, which no longer exists — the backend client is
`src/lib/services/backend.ts`, plain fetch against the Cloud Run API.)

- [ ] Exercise the configured-API paths of `services/auth.ts` (error-mapping branches) and
      `services/account.ts` (profile CRUD + sync-conflict paths) with the
      `vi.mock('@/lib/services/backend')` + `makeBackendModule` idiom
      (`tests/helpers/mockBackend.ts`) — no emulator, no Firebase. Carried from Phase 1.
- [ ] `src/lib/native/nativeBridge.ts` — a fake `window.Capacitor` fixture to exercise the
      plugin routing (auth/IAP/offline-cache). Matters more with every iOS-family release; today
      only the inert-on-web behaviour is verified.

## Phase 7 — Component zeros + shared date-math branches

16 files under the coverage `include` are at literal 0%. Entitlement-adjacent UI first, then the
rest; same render-smoke patterns as Phases 2–3.

- [ ] Revenue-facing: `components/account/SubscriptionPanel.tsx` (50% lines / 21% branch — renders
      entitlement state, the client half of Phase 5) and `components/UpsellCard.tsx` (0%).
- [ ] User-data entry: `components/account/RecordForm.tsx` (0%),
      `components/account/PasswordStrength.tsx` (0% render — but its rule-test and score logic now
      lives in the fully-tested `calc/app/passwordPolicy.ts`, so only the presentational shell is
      uncovered), `components/calc/SelectField.tsx` (0% — part of the shared calc field kit).
- [ ] The rest of the zeros: `SearchHero`, `ScrollProgress`, `AnalyticsProvider`, `BrandMark`,
      `highlight.tsx`, `categoryTone.ts`, `onboarding/OnboardingHint` (+ lift `OnboardingTour`,
      51%/27%), `dashboard/UpdatesWatchWidget`, the aerodrome family (`RunwayDiagram`,
      `AirportTypeIcon`, `AerodromesHero`, `PositionMarker`; `AerodromeScope` sits at 13%), and the
      `RadarWidget` render path (25% — only the pure `buildBlips` is covered). `CommandPalette` is
      the biggest branch gap of the covered files (~51% branch).
- [ ] `src/calc/recency.ts` (**57% branch**) — the shared date engine under the currency/validity
      tools. Table-driven edge-date spec: `addMonths` month-end behaviour (e.g. 31 Jan + 1 month),
      `parseISO` rejections, `withinDays` window boundaries, `daysLeft` sign at expiry. Also
      `calc/hud/callsigns.ts` (71% lines).
- [ ] **Exit:** raise the app ratchet (84/79/88/85 today — `vitest.config.ts`) to just below the
      new live numbers.

## Phase 8 — E2E: authenticated & paid flows

The Playwright suite (`e2e/`) covers the public surfaces — `smoke.spec.ts` (route + flow smokes),
`a11y.spec.ts` (the axe sweep, including `/ar` RTL scans), `checkout.spec.ts` and `study.spec.ts`
— but every deep flow runs anonymous. This is the concrete work-list behind the standing
**[platform] E2E coverage** item in `ROADMAP.md`.

- [ ] Add a session-stub fixture and walk the signed-in surfaces: dashboard widgets render,
      logbook entry create/edit/delete, records CRUD, settings.
- [x] Offline-first checkout degradation: `e2e/checkout.spec.ts` drives `/checkout` in the
      default no-backend build and asserts it degrades gracefully instead of breaking.
- [ ] Mocked-network checkout success: stub `/api/billing/*` at the network layer, drive
      `/checkout` → `/checkout/return`, assert the entitlement-gated UI flips. Needs a second
      Playwright project running a `VITE_API_SAME_ORIGIN=1` build (so the app actually issues
      `/api` requests to intercept) — deliberately deferred. Closes the loop that Phase 5 opened
      server-side.
- [x] Quiz flow: `e2e/study.spec.ts` drives the quiz end-to-end in a browser.
- [ ] Remaining study flows: flashcards, ground school, paths — today these pages rely on unit
      tests only.
- [ ] Flavor route-tree smoke: boot with `IS_FLAVOR_APP` and assert the reduced single-pack tree —
      unit-tested in `tests/flavor-router.test.ts`, never driven in a browser.
- [x] Arabic/RTL passes: the axe sweep in `a11y.spec.ts` now scans key routes under `/ar` as well.

## Phase 9 — Family-wide (work lands in the named repos)

Tracked here the way `docs/APPS-FAMILY-ROADMAP.md` tracks the app family; the commits belong in
each repo.

**`ay2m/FlyGACA` (FlyGACAKit)** — engines/models/store are tested (incl. the SRS parity vectors);
the gaps:

- [ ] Decode tests for `GroundSchool.swift` and `ReadingPaths.swift` — `quiz.json` and the module
      manifest are decode-tested, these two content formats are not, so a malformed
      `sync-content.sh` refresh fails at app runtime instead of in CI.
- [ ] Exam-scoring parity vectors mirroring the web contract (`percent = round(correct/total ×
      100)`, `passed = percent ≥ passMark`, unanswered = wrong, auto-submit at 0:00) — same
      pattern as `LeitnerTests`' SRS vectors.
- [ ] Wire a UI-test target — every target in `ay2m/FlyGACA`'s `apple/project.yml` has
      `testTargets: []`, so the documented `AppleTests/ScreenshotTests.swift` flow cannot run and
      all seven `FeatureUI` views (incl. `ModuleHomeView`, `QuizView`, `ExamTimerView`) have zero
      coverage. (iOS lives in the `ay2m/FlyGACA` repo; this monorepo only generates its content.)

**`ay2m/Captain-Adel` — separate repo, not retired.** The standalone Captain Adel service this
block audited (its `evals/checks/citation-faithfulness.js` judge, the `public/assets/js/` page
scripts, `src/billing/routes.js`) is live and maintained behind captadel.com, with its own CI. It
is not superseded by this repo's `server/`: the two are parallel implementations of the same
answer contract, which is the drift `docs/DESIGN-brain-consolidation.md` exists to close. What is
true is that its coverage is tracked in its own repo rather than here. (The path above previously
read `FlyGACA/Captain-Adel`; that org does not exist — see `CLAUDE.md`.)

**App Store metadata repos (ELPT · AIP shipping; PPL · CPL · IR · ATPL parked)**

- [ ] A fixture self-test for `scripts/check-metadata.mjs` (feed it a deliberately broken locale
      tree, assert it fails). The script lives only in those metadata repos — nothing in this
      monorepo carries or runs it — and is each repo's entire CI gate: author the test once, sync
      to the siblings.

## Known-good — don't re-audit these

Verified in the August 2026 audit; future coverage passes should skip them:

- The backend `*-core.ts` policy modules — all ≈100%.
- `tests/client-server-mirrors.test.ts` (client mirrors ↔ server cores) and
  `tests/i18n-parity.test.ts`.
- Every `src/calc` module is imported by at least one spec — calc gaps are branch-level only
  (`recency`, `callsigns` above), not missing files.

## Measuring

- App: `npm run test:coverage` (per-file JSON in `coverage/coverage-summary.json`).
- Backend: `cd server && npm run test:coverage`. Per-function hit counts (how the Phase 5
  zero-hit list was produced): add `--coverage.reporter=json` and read `fnMap`/`f` in
  `coverage/coverage-final.json`.
- iOS (in `ay2m/FlyGACA`): `cd apple/FlyGACAKit && swift test` — no coverage tooling wired; the Phase 9 gaps are
  file-level (sources with no referencing test).

Numbers in this doc were measured 2026-08-03 on `main` @ `c93c2c3` (app, functions) and the
sibling repos' `main` of the same date.
