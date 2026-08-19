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

The rest of the family, same date:

| Surface | Lines | Branches | Notes |
| --- | --- | --- | --- |
| `functions/` (339 tests) | 98.0% | 90.2% | ratchet 95/89/95/97 (stmt/branch/func/line); **Phase 5 complete** — founding + billing wrappers, gateway + corpus |
| Firestore rules (`tests/rules/`, emulator) | — | — | comprehensive — every collection has allow + deny cases |
| Captain-Adel (`FlyGACA/Captain-Adel`) | 96.3% | 89.9% | `node --test` coverage, report-only; holes → **Phase 9** |
| iOS `FlyGACAKit` (`ay2m/FlyGACA`) | — | — | engines/models/store tested; `FeatureUI` + 2 decoders untested → **Phase 9** |

The aviation-math core (`src/calc/*` — every module has a referencing spec), the backend
`*-core.ts` policy modules, and the client↔server mirror tests are all at or near 100%: the
"pure core, thin wrapper" architecture is holding. The open gaps are concentrated, not diffuse:
(1) the backend **wrappers that move money and write entitlements** (Phase 5 — **complete**:
founding + billing callables + the renewal engine, plus the gateway route/streaming/App-Check
paths and the corpus loader), (2) the
**configured-Firebase half** of the client services (Phase 6), (3) a tail of zero-coverage
components plus shared date-math branches (Phase 7), and (4) everything behind sign-in or payment
in E2E (Phase 8). Family-wide items are batched in Phase 9. Phases 1–4 record the earlier push and
are complete except where noted.

## Conventions for new tests

Reuse the existing patterns — don't invent new scaffolding:

- Render with `renderWithRouter` from `tests/helpers/render.tsx` (adds a `LocationProbe`).
- Global `tests/setup.ts` already boots i18next (en/ar), installs a `MockStorage`, clears the
  content cache, and stubs `scrollIntoView` — assert against real English strings.
- Mock Firebase callables with the `vi.hoisted` holder + `vi.mock('@/lib/services/firebase')` +
  `vi.mock('firebase/functions')` idiom — see `tests/lib/org-client.test.ts`.
- Mock Firestore with `vi.mock('firebase/firestore')` recording into a holder — see
  `tests/lib/sync-io.test.ts`.
- Hooks: `renderHook` + `waitFor` + `act` — see `tests/hooks/fetch-hooks.test.tsx`,
  `tests/lib/pwa-hooks.test.ts`.
- Widgets: seed `localStorage`, then **dynamic** `await import(...)` — see
  `tests/components/dashboard-widgets.test.tsx`.
- `useSyncExternalStore` stores: see `tests/lib/library-prefs-store.test.ts`.

## Phase 1 — Account / billing / entitlement services + backend gate  *(highest risk)*

This is the code that gates money and access. `CLAUDE.md` requires the client mirrors to match the
server core.

- [x] `tests/lib/staff.test.ts` — `src/lib/services/staff.ts`: pure `looksLikeStaff()` matching + all
      `claimStaffAccessIfEligible` no-op/happy paths (callable `claimStaffAccess`).
- [x] `tests/lib/school.test.ts` — `src/lib/services/school.ts` (0%): `claimSchoolSeatIfEligible`
      (callable `claimSchoolSeat`).
- [x] `tests/lib/waitlist.test.ts` — `src/lib/services/waitlist.ts` (0%): `addDoc` payload shape +
      the `'unavailable'` throw when the db is null.
- [x] `tests/lib/study-progress-sync.test.ts` — `src/lib/services/studyProgressSync.ts` (16%):
      local-first no-op paths + the initial upload payload/path. (Now ~88% lines.)
- [x] Broaden existing suites to lift the uncovered branches in `services/account.ts` (~66%),
      `services/billing.ts` (~62%), `services/auth.ts` (~72%). *Partially:* `billing.ts` lifted to
      ~86% lines; `account.ts`/`auth.ts` still sit near 70% — the remainder needs the
      configured-Firebase harness and is carried into **Phase 6**.
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

- [x] Hub controls `ViewToggle` / `SortSelect` (both 0%) — `tests/components/hub-controls.test.tsx`.
- [x] Peripheral chat UI `SourcesDigest`, `CrossRefChips`, `ExportActions` (all 0%) —
      `tests/components/chat-digest.test.tsx`. Ratchet raised again to 76/73/79/77.
- [x] Bento widgets `StatValue` / `ToolsWidget` / `LearnWidget` (all 0%) —
      `tests/components/bento-widgets.test.tsx`.
- [x] Library `SelectionPopover` (0%) — `tests/components/selection-popover.test.tsx`.
- [x] `SpeakButton` (24%) — `tests/components/speak-button.test.tsx` with a `speechSynthesis` stub.

Final app coverage after Phases 1–3: **78.9 / 74.5 / 81.6 / 79.9** (from 72.2 / 70.6 / 74.2 / 72.8).
The ratchet sits at 76/73/79/77 with headroom.

## Phase 4 — Pages coverage

`src/pages/` (99 modules) is deliberately **outside** the coverage `include` in
`vitest.config.ts`; pages are exercised by the Playwright E2E suite (`e2e/`) plus a few targeted
page unit tests. Two complementary tracks:

**Done — widen the cheap render-smoke net** (guards against render-time crashes, no architectural
change):

- [x] `tests/pages/tool-pages-smoke.test.tsx` — the ~45 self-contained CalcShell tool pages (pre-existing).
- [x] `tests/pages/static-pages-smoke.test.tsx` — the static i18n-driven pages (`About`, `NotFound`,
      `Offline`, and the four legal docs). Same parameterized-loop pattern.

**Open — the structural decision (team call):** whether to fold `src/pages/**` into the coverage
`include`. Doing so would drop the headline number sharply (pages are ~40% of `src`, mostly E2E- not
unit-covered) and would pressure unit-testing of data/auth/router-param pages that E2E serves better.
Recommendation: **keep pages E2E-owned**, keep growing the smoke nets above for crash-safety, and
expand `e2e/flows.spec.ts` for the data/auth flows — rather than folding pages into the unit-coverage
ratchet.

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

## Phase 6 — The configured-Firebase half of the client services

Local-first means the null-Firebase path is well tested; the configured path largely isn't.

- [ ] A shared "configured Firebase" fixture (extend the `vi.hoisted` holder idiom from
      `tests/lib/account-firebase.test.ts`) so suites can exercise the non-null path without an
      emulator.
- [ ] `src/lib/services/firebase.ts` (~18% lines — the real init/emulator wiring),
      `services/auth.ts` (~71% — error-mapping branches), `services/account.ts` (~71% — profile
      CRUD + sync-conflict paths). Carried from Phase 1.
- [ ] `src/lib/native/nativeBridge.ts` (~34%) — a fake `window.Capacitor` fixture to exercise the
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
- [ ] **Exit:** raise the app ratchet (76/73/79/77 today) to just below the new live numbers.

## Phase 8 — E2E: authenticated & paid flows

The Playwright suite covers public surfaces well (27-route smoke, 13 flows, axe sweep) but every
deep flow runs anonymous. This is the concrete work-list behind the standing **[platform] E2E
coverage** item in `ROADMAP.md`.

- [ ] Extend the session-stub fixture (the account round-trip in `e2e/flows.spec.ts`) to walk the
      signed-in surfaces: dashboard widgets render, logbook entry create/edit/delete, records CRUD,
      settings.
- [ ] Mocked-success checkout: stub the billing callable, drive `/checkout` → `/checkout/return`,
      assert the entitlement-gated UI flips. Closes the loop that Phase 5 opens server-side.
- [ ] Study flows beyond the free sampler's timed exam: quiz, flashcards, ground school, paths —
      today these pages rely on unit tests only.
- [ ] Flavor route-tree smoke: boot with `IS_FLAVOR_APP` and assert the reduced single-pack tree —
      unit-tested in `tests/app/flavor-router.test.ts`, never driven in a browser.
- [ ] Arabic/RTL passes: run the axe sweep on key routes in `ar` (today only the toggle flow
      asserts RTL flips).

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

**`FlyGACA/Captain-Adel`** — 96.3% lines overall; three specific holes:

- [ ] `evals/checks/citation-faithfulness.js` (39% lines / **0% functions**) — the opt-in
      per-claim judge's extraction/verdict logic is deterministic; unit-test it with fixture
      claims, no API key needed.
- [ ] Page scripts: of 13 files in `public/assets/js/`, only `chat-core.js` is test-loaded. Start
      with `exam.js` and `checkout.js` (scoring + payment UI), following the
      `test/chat-core.test.js` pattern for classic scripts under `node:test`.
- [ ] `src/billing/routes.js` (66% branch) — the uncovered lines are all Moyasar/Firestore error
      paths.

**App Store metadata repos (ELPT · AIP shipping; PPL · CPL · IR · ATPL parked)**

- [ ] A fixture self-test for `scripts/check-metadata.mjs` (feed it a deliberately broken locale
      tree, assert it fails). The script is byte-identical across all six repos and is each repo's
      entire CI gate — author the test once, sync to the siblings.

## Known-good — don't re-audit these

Verified in the August 2026 audit; future coverage passes should skip them:

- `tests/rules/firestore-rules.test.ts` — every collection in `firestore.rules` has allow **and**
  deny/self-grant/forgery cases.
- The backend `*-core.ts` policy modules — all ≈100%.
- `tests/integrity/client-server-mirrors.test.ts` (client mirrors ↔ server cores) and
  `tests/integrity/i18n-parity.test.ts`.
- Every `src/calc` module is imported by at least one spec — calc gaps are branch-level only
  (`recency`, `callsigns` above), not missing files.
- Captain-Adel's brain + eval harness (`evals/cases.json`, 73 cases, EN+AR, plus the parity gate).

## Measuring

- App: `npm run test:coverage` (per-file JSON in `coverage/coverage-summary.json`).
- Backend: `cd functions && npm run test:coverage`. Per-function hit counts (how the Phase 5
  zero-hit list was produced): add `--coverage.reporter=json` and read `fnMap`/`f` in
  `coverage/coverage-final.json`.
- Captain-Adel: `npm run test:coverage` (`node --test --experimental-test-coverage`).
- iOS (in `ay2m/FlyGACA`): `cd apple/FlyGACAKit && swift test` — no coverage tooling wired; the Phase 9 gaps are
  file-level (sources with no referencing test).

Numbers in this doc were measured 2026-08-03 on `main` @ `c93c2c3` (app, functions) and the
sibling repos' `main` of the same date.
