# Test Coverage Analysis & Improvement Plan

**Date:** 2026-08-31  
**Scope:** ay2m/FlyGACA, ay2m/FlyGACA-ios, ay2m/Office  
**Status:** Initial Analysis

---

## Executive Summary

The Fly GACA family maintains strong unit test coverage across all three repositories, with **130+ frontend tests**, **38+ backend tests**, and **15+ iOS Swift tests** covering critical business logic. However, several high-impact areas lack adequate test coverage, particularly:

1. **Integration & E2E gaps** — frontend E2E tests are strong but incomplete for complex user workflows
2. **Backend route edge cases** — security boundaries and error handling under load
3. **Cross-platform parity verification** — iOS ↔ Web contract drift risk
4. **Payment & billing flows** — Moyasar integration partially tested
5. **Real-time systems** — SSE/chat streams, notifications

---

## 1. FRONTEND (React 19 + TypeScript) - `ay2m/FlyGACA/src`

### Current State

**Coverage Thresholds (config/vitest.config.ts):**
- Statements: 84% (floor)
- Branches: 79% (floor)
- Functions: 87% (floor)
- Lines: 85% (floor)
- **Status:** Currently at or slightly above thresholds

**Well-Tested Areas:**
- ✅ Calculation modules (`src/calc/`) — 100% coverage on flight tools (crosswind, TAS, ISA, runway, recency)
- ✅ Study state management (`src/lib/studyProgress.ts`) — parity vectors with iOS/web
- ✅ SRS/Leitner engine (`src/calc/study/srs.ts`) — parity-critical tests
- ✅ Data transformations — 130+ tests covering hooks, utilities, services
- ✅ Form validation — auth flows, password policy, referrals
- ✅ Offline behavior — cache hydration, PWA manifest generation

**Gaps & Risks:**

| Area | Gap | Impact | Effort |
|------|-----|--------|--------|
| **Components** | Pages and complex UI rarely tested via vitest; relied on Playwright E2E | Medium | Medium |
| **RTL/i18n** | Arabic layout not tested in unit tests, only E2E | Low-Med | Low |
| **Theming** | Dark/light mode switching, token application in CSS Modules | Low | Low |
| **Firebase Monitoring** | Recent module; `firebase-monitoring/analytics` has minimal coverage | Medium | Medium |
| **Chat/RAG** | Grounding module logic has shallow tests; RAG chunking not tested | High | High |
| **Billing Views** | Pricing display, pack selection UI exercises only client logic; server pricing parity not verified | Medium | Medium |
| **Checkout Flow** | Moyasar integration point mocked; real error states not tested | High | High |
| **School/Org Features** | B2B school dashboards, staff grants, org features lightly tested | Medium-High | High |
| **PWA Updates** | Service worker update flow, install prompts, caching strategies | Medium | High |
| **Accessibility (A11y)** | Keyboard navigation, screen-reader labels in components not unit-tested | Medium | Medium |

### Recommendations

1. **Expand component testing** — Add vitest suites for high-traffic pages (Study, Dashboard, Account):
   - `src/pages/study/` — study session state machine, quiz UI interactions
   - `src/pages/chat/` — conversation threading, message rendering, keyboard shortcuts
   - `src/components/bento/` — dashboard widget logic, drag/drop persistence
   - **Effort:** 2–3 sprints; add 40–50 tests

2. **Establish RAG/grounding test suite**:
   - Mock Gemini responses; test citation accuracy, fallback behavior
   - Test BM25 retrieval ranking and deduplication
   - Verify prompt injection guards
   - **Effort:** 1–2 sprints; 20–30 tests

3. **Payment flow integration tests** — real Moyasar API contract (mocked but realistic):
   - Create order → payment redirect → callback verification
   - Error cases: declined card, timeout, network failure, webhook replay
   - **Effort:** 1–2 sprints; 15–20 tests

4. **Checkout state machine verification**:
   - Pack selection → entitlement grant → UI state consistency
   - Promo code application; discount rendering parity
   - **Effort:** 1 sprint; 10–15 tests

5. **School/Org feature matrix**:
   - Admin dashboard: member invite, revoke, role changes
   - Staff grants: enrollment, cohort creation, readiness reporting
   - **Effort:** 2–3 sprints; 30–40 tests

6. **PWA & offline lifecycle**:
   - Service worker activation, cache versioning, update triggering
   - Offline access to cached content; online re-sync
   - **Effort:** 2 sprints; 20–25 tests

7. **A11y regression suite** (vitest + axe-core):
   - Test ARIA labels, keyboard focus management in key components
   - RTL mirroring of interactive elements
   - **Effort:** 2 sprints; 25–30 tests

---

## 2. BACKEND (Express 5 + Node.js) - `ay2m/FlyGACA/server`

### Current State

**Test Coverage:**
- **Tests:** 38 test files under `server/tests/`
- **Core modules tested:** auth, billing, account, org, corpus, Captain Adel flows
- **Routes:** auth, billing, grants, org/account endpoints
- **No separate CI coverage reporting** (unlike frontend)

**Well-Tested Areas:**
- ✅ Auth flows — registration, email verification, OAuth (Google, Apple), password reset
- ✅ Session & JWT management — HttpOnly cookie security, token validation
- ✅ Billing & entitlement logic — subscription state transitions, promo code merging
- ✅ Organization model — school setup, staff grants, authz checks
- ✅ Chat quota enforcement — per-user rate limits, quota calculation
- ✅ Captain Adel gateway — SSE flow, grounding core, prompt construction
- ✅ Corpus citation verification — GACAR anchor extraction
- ✅ Rate limiting & CSRF — anti-enumeration, token exchange

**Gaps & Risks:**

| Area | Gap | Impact | Effort |
|------|-----|--------|--------|
| **Database Concurrency** | Store operations rarely tested under concurrent writes; SwiftData/Firestore sync conflict handling untested | High | High |
| **Payment Webhook Handling** | Moyasar callback validation, idempotency, replay attacks | High | Medium |
| **Error Propagation** | Generic error responses to client verified; Stack traces/PII in logs not audited | Medium | Low |
| **Data Residency** | Queries assume `me-central2`; no test for region enforcement | Medium | Low |
| **PDPL Compliance** | Right-to-be-forgotten procedure tested; audit trail verification missing | High | High |
| **Captain Adel Overflow** | Token budget exhaustion, context window limits, streaming interrupts | Medium | High |
| **Analytics Ingestion** | Flight hour tracking, analytics event payloads, race conditions in aggregation | Medium | Medium |
| **Firestore Rules** | Backend auth logic verified; Firestore read/write rules not tested in isolation | High | High |
| **Load Testing** | Connection limits, query timeouts, concurrent user load never tested | High | Very High |
| **Schema Migration Safety** | Forward-only migrations verified via type system; runtime data transformation not tested | High | High |

### Recommendations

1. **Moyasar webhook idempotency suite**:
   - Mock webhook callbacks; test duplicate handling, signature validation, state transitions
   - Test failure modes: webhook before DB write, after write, partial failure
   - **Effort:** 1–2 sprints; 12–15 tests

2. **Database concurrency & consistency**:
   - Simulate concurrent writes to user progress, entitlements, subscriptions
   - Test optimistic locking / conflict resolution
   - **Effort:** 2–3 sprints; 20–30 tests

3. **PDPL audit trail verification**:
   - Ensure every user mutation is logged (creation, deletion, data access)
   - Test right-to-be-forgotten flow end-to-end (mark deleted → scrub → verify gone)
   - Verify encrypted-at-rest storage
   - **Effort:** 1–2 sprints; 15–20 tests

4. **Firestore security rules testing**:
   - Use Firebase emulator; test auth, public queries, read/write boundaries
   - Test per-user data isolation (users can't read/write other users' progress)
   - **Effort:** 1–2 sprints; 20–25 tests

5. **Captain Adel token budgeting & recovery**:
   - Mock Gemini API; test prompt truncation when context grows
   - Test graceful degradation when token budget exceeded
   - Test streaming interruption handling
   - **Effort:** 1–2 sprints; 12–18 tests

6. **Analytics pipeline correctness**:
   - Mock learner event producers; verify aggregation (daily flight hours, question attempts)
   - Test late-arriving events, out-of-order sequences
   - **Effort:** 1–2 sprints; 15–20 tests

7. **Schema migration safety**:
   - Test each forward-only migration in isolation with sample data
   - Verify old and new queries work during phased rollouts
   - **Effort:** 1 sprint per major migration; ongoing

8. **Load testing baseline**:
   - Use k6 or Artillery to define realistic user journeys (login, study, chat, checkout)
   - Establish latency budgets and throughput targets
   - Run nightly on staging
   - **Effort:** 2–3 sprints to scaffold; ongoing maintenance

---

## 3. iOS (Swift) - `ay2m/FlyGACA-ios`

### Current State

**Test Targets (5):**
- ✅ `CoreModelsTests` — ModuleManifest, QuizDecode, Aviation models
- ✅ `StudyEnginesTests` — Leitner (SRS), Sessions, Streak, Sampler, Readiness
- ✅ `ContentKitTests` — Content loading, signed corpus refresh
- ✅ `PersistenceKitTests` — SwiftData store operations
- ✅ `PlatformLiveTests` — Live service implementations (Firebase, Moyasar, Captain Adel)

**Well-Tested (Critical Parity):**
- ✅ SRS/Leitner engine — byte-for-byte parity with `src/calc/study/srs.ts` via hand-computed vectors
- ✅ Study session state machine — fixed-date testing, no time dependencies
- ✅ Content manifest parsing — module JSON schema validation
- ✅ Signed corpus refresh — Ed25519 signature verification

**Gaps & Risks:**

| Area | Gap | Impact | Effort |
|------|-----|--------|--------|
| **SwiftUI Component Preview** | Few component preview snapshots; UI rarely tested in simulator | Medium | High |
| **App Group Sync** | Shared container sync between ELPT/AIP apps not tested | Medium-High | Medium |
| **Firestore Sync** | Real-time progress sync, offline queue, conflict resolution only mocked | High | High |
| **Payment Integration** | Moyasar flow in PlatformLive only mocked; real payment UX untested | High | Very High |
| **Captain Adel Streaming** | SSE connection lifecycle, reconnection, message parsing only mocked | High | High |
| **Entitlements Caching** | Cached vs. refreshed entitlements; stale entitlement edge cases | Medium | Medium |
| **Remote Corpus Refresh** | Signature failure, network timeouts, version conflicts | Medium | Medium |
| **Screenshot Tests** | HTML-rendered mockups (Playwright) only; real device screenshots manual | Medium | High |
| **Accessibility** | VoiceOver navigation, Dynamic Type scaling not tested | Medium | Medium |
| **Background Modes** | App termination, background sync, lock screen behavior | Low-Med | High |

### Recommendations

1. **App Group sync verification**:
   - Create two isolated app targets with shared SwiftData container
   - Test progress, streaks, entitlements are visible cross-app
   - Test concurrent writes (one app studying while other offline)
   - **Effort:** 1–2 sprints; 15–20 tests

2. **Firestore integration (with emulator)**:
   - Test real-time listener activation, offline queue, conflict resolution
   - Test user login/logout; progress sync across sessions
   - **Effort:** 2–3 sprints; 20–30 tests

3. **Captain Adel SSE connection**:
   - Test message parsing, reconnect backoff, stream interruption
   - Mock Genkit grounding responses; verify citations are rendered
   - **Effort:** 1–2 sprints; 15–20 tests

4. **Payment flow (instrumented test)**:
   - Wire PlatformLive's Moyasar service instead of mocks (staging environment)
   - Test pack purchase → entitlement grant → UI state consistency
   - Test error cases: declined, timeout, network failure
   - **Effort:** 1–2 sprints; 10–15 tests (+ staging Moyasar account)

5. **Device screenshot tests** (XCUITest):
   - Automate real simulator screenshots for App Store release candidates
   - Verify text, button placement, landscape orientation
   - Integrate into CI (see `CLAUDE.md` §Screenshots)
   - **Effort:** 2–3 sprints (ongoing maintenance)

6. **Accessibility (VoiceOver) testing**:
   - Add VoiceOver navigation tests to key screens (study, quiz, purchase)
   - Verify Dynamic Type scaling doesn't break layout
   - **Effort:** 2 sprints; 20–25 tests

7. **Entitlements edge cases**:
   - Test cached entitlements used offline; refresh on reconnect
   - Test pack purchase during sync; offline pack study; delayed entitlement grant
   - **Effort:** 1 sprint; 12–15 tests

---

## 4. E2E & Integration Testing

### Current State

**E2E Test Suite (Playwright):**
- **Location:** `e2e/` directory (not enumerated but referenced in `package.json`)
- **Coverage:** smoke tests + axe accessibility suite
- **CI Integration:** `npm run test:e2e` runs on every PR targeting main
- **Scope:** Frontend only (no backend mocking)

**Gaps:**

| Scenario | Gap | Impact | Effort |
|----------|-----|--------|--------|
| **Cross-browser** | Chromium only; no Firefox/Safari testing | Low-Med | Low |
| **Checkout flow** | Real Moyasar sandbox (if available) or production-fidelity mock | High | Medium |
| **Captain Adel chat** | Streaming response rendering; error recovery | Medium | Medium |
| **Offline behavior** | Simulate network offline; cache integrity; re-sync | High | Medium |
| **Mobile/Responsive** | Responsive design, touch interactions | Medium | Medium |
| **Authentication flows** | OAuth callback, email verification, password reset | High | Medium |
| **School/Org workflows** | Admin invite, member revocation, staff grants | Medium | High |

### Recommendations

1. **API contract verification**:
   - Publish server's `contract.ts` as OpenAPI/JSON Schema
   - Validate client requests/responses match schema in E2E tests
   - **Effort:** 1 sprint

2. **Checkout flow E2E** (Playwright + Moyasar sandbox):
   - Pack selection → checkout → payment confirmation
   - Promo codes, regional pricing, entitlement grant
   - **Effort:** 1–2 sprints; 8–12 tests

3. **Captain Adel chat E2E**:
   - Prompt submission → streaming response → citation rendering
   - Error handling (model refusal, grounding failure)
   - **Effort:** 1–2 sprints; 6–10 tests

4. **Offline scenario suite**:
   - Study pack download, offline quiz, sync on reconnect
   - Verify cache freshness, conflict resolution
   - **Effort:** 1 sprint; 6–8 tests

5. **School workflow E2E**:
   - Admin: create school, invite staff, assign students to cohorts
   - Staff: view student progress, export readiness report
   - Student: join via code, study with cohort
   - **Effort:** 2–3 sprints; 12–18 tests

6. **Mobile E2E baseline**:
   - Extend Playwright to test iPhone SE viewport
   - Touch gestures, mobile-specific flows (notification prompts, PWA install)
   - **Effort:** 1–2 sprints

---

## 5. Cross-Repo Parity Verification

### Gaps

| Contract | Verification | Gap | Risk |
|----------|---------------|-----|------|
| **SRS/Leitner** | Hand-computed vectors (Leitner iOS, study-progress web) | Drift possible if web changes without iOS follow-up | High |
| **Pricing & Bands** | Server `prices.ts` vs. client pricing views | No automated sync test | Medium |
| **Family contract** | `contracts/flygaca-family.json` byte parity across three repos | CI gates it; no nightly re-verification | Low-Med |
| **Entitlements model** | Server-authored; iOS/web consume via API | No test that models match | Medium |
| **Chat response shape** | Server `contract.ts` vs. client Captain Adel types | No schema validation in tests | Medium |

### Recommendations

1. **Automate parity checks**:
   - Add `tests/cross-repo-parity.test.ts`: fetch live schema from server, validate client types
   - Run nightly; alert on drift
   - **Effort:** 1 sprint

2. **SRS regression matrix**:
   - Extend `LeitnerTests.swift` to include probabilistic tests (random box transitions, various now dates)
   - Add `tests/study-srs-parity.test.ts` to web
   - **Effort:** 1 sprint

3. **Pricing parity test**:
   - Server computes `prices` for packs; client renders based on region, auth, promo
   - Add E2E: set region, apply promo, verify displayed price matches server calculation
   - **Effort:** 1 sprint

---

## 6. Recommended Testing Roadmap

### Phase 1: Foundation (Weeks 1–4)
- ✅ Moyasar webhook idempotency tests (backend)
- ✅ Checkout flow unit tests (frontend)
- ✅ App Group sync verification (iOS)
- ✅ Cross-repo parity automation (all)
- **Outcome:** CI gates prevent silent contract drift; payment flow verified

### Phase 2: Integration (Weeks 5–8)
- ✅ Captain Adel E2E chat tests
- ✅ Firestore sync tests (iOS + backend emulator)
- ✅ School/org dashboard unit tests (frontend)
- ✅ Database concurrency tests (backend)
- **Outcome:** Real-time systems, org features verified; concurrent user safety

### Phase 3: Resilience (Weeks 9–12)
- ✅ Offline scenario E2E tests
- ✅ Payment integration test (iOS + staging)
- ✅ PDPL audit trail verification
- ✅ Load testing baseline (k6)
- **Outcome:** Offline behavior, compliance, performance baselines established

### Phase 4: Coverage & Accessibility (Weeks 13–16)
- ✅ Component preview snapshots (iOS)
- ✅ A11y regression suite (frontend + iOS)
- ✅ Screenshot automation (iOS XCUITest)
- ✅ RAG/grounding test suite
- **Effort:** ~8 sprints total, distributed across team

---

## 7. CI/CD Integration

### Recommended Additions

1. **Test coverage ratchet (frontend):**
   - `npm run test:coverage` CI step; fail if below thresholds
   - Currently set at `statements: 84, branches: 79, functions: 87, lines: 85`
   - Suggestion: Raise to `86/81/88/87` over 2 quarters

2. **Backend coverage dashboard:**
   - Add `npm run test:coverage` to CI; publish HTML report
   - No numeric threshold yet; goal is visibility

3. **Nightly parity check:**
   - Scheduled job: fetch server schema, validate client types, SRS vectors
   - Slack alert on drift; blocks Friday release if unresolved

4. **Load testing:**
   - Weekly staging run; k6 script exercises user journeys
   - Track latency, error rate; alert on 10% regression

5. **Security scanning:**
   - E2E tests verify CSRF, open-redirect guards, enumeration resistance
   - Zap scan against staging API

---

## 8. Tools & Infrastructure

| Tool | Purpose | Status | Recommendation |
|------|---------|--------|-----------------|
| **Vitest** (frontend, backend) | Unit testing | ✅ Configured | Maintain; add coverage dashboard |
| **Playwright** | E2E testing | ✅ Configured | Extend to checkout, chat, offline flows |
| **XCTest** (iOS) | Unit testing | ✅ Configured | Add integration tests; emulator Firebase |
| **Firebase Emulator** | Local backend testing | ⚠️ Available but underused | Integrate into CI; test auth, Firestore rules |
| **k6 / Artillery** | Load testing | ❌ Not set up | Scaffold nightly job; establish baselines |
| **Moyasar Sandbox** | Payment testing | ❌ Account not set up | Request staging credentials; use in E2E |

---

## Summary of High-Impact Improvements

| Change | Repos | Benefit | Effort |
|--------|-------|---------|--------|
| Moyasar webhook idempotency | Backend | Prevents double-billing; ensures payment safety | 1–2 sprints |
| Checkout E2E tests | Frontend, Backend, E2E | Catch regressions before release; builds user confidence | 1–2 sprints |
| App Group sync verification | iOS | Ensures users can seamlessly switch between ELPT/AIP | 1–2 sprints |
| Firestore integration tests | iOS, Backend | Verifies real-time sync, offline safety | 2–3 sprints |
| Cross-repo parity automation | All three | Prevents silent contract drift (SRS, pricing, entitlements) | 1 sprint |
| Captain Adel E2E | Frontend, Backend, E2E | Verifies chat UX; ensures grounding accuracy | 1–2 sprints |
| PDPL audit trail verification | Backend | Ensures compliance; proves deletion procedure works | 1–2 sprints |
| Load testing baseline | Backend | Establishes performance budget; catches scaling issues | 2–3 sprints |

---

## Conclusion

Fly GACA's test suite is strong at the unit level, particularly for mission-critical business logic (SRS parity, auth, billing calculations). The main gaps are in **integration testing** (real-world flows under concurrency), **payment systems** (Moyasar end-to-end), **real-time features** (Captain Adel streaming), and **cross-platform verification** (iOS ↔ Web contract drift).

Implementing the Phase 1 recommendations (weeks 1–4) will close the highest-risk gaps and establish automated parity checks to prevent silent failures in future releases. Phases 2–4 build out resilience, offline safety, and accessibility.

**Recommended starting point:** Moyasar webhook tests + checkout E2E + cross-repo parity automation (3–4 sprints). These unlock payment confidence and prevent contract drift simultaneously.
