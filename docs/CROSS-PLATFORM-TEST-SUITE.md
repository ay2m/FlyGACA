# Cross-Platform Test Suite

**Date:** 2026-08-31
**Scope:** `ay2m/FlyGACA` (`tests/`) + `ay2m/FlyGACA-ios` (`apple/FlyGACAKit/Tests/PersistenceKitTests/`)
**Companion to:** [`test-coverage-analysis.md`](./test-coverage-analysis.md) (the gap analysis this work answers)
and [`TESTING-ROADMAP.md`](./TESTING-ROADMAP.md) (the older per-phase unit-coverage plan)

Five suites, 89 tests, covering the iOS ↔ web contract: authentication, bidirectional progress
sync, entitlements, offline resilience, performance envelopes and the security/PDPL boundaries.

---

## 1. What exists

| # | Suite | Repo | Tests | Status |
|---|---|---|---|---|
| 1 | `apple/FlyGACAKit/Tests/PersistenceKitTests/AppGroupSyncTests.swift` | FlyGACA-ios | 8 | Written, **not executed** — see §4 |
| 2 | `apple/FlyGACAKit/Tests/PersistenceKitTests/FirestoreSyncIntegrationTests.swift` | FlyGACA-ios | 13 | Written, **not executed** — see §4 |
| 3 | `tests/cross-platform-integration.test.ts` | FlyGACA | 17 | ✅ Passing |
| 4 | `tests/performance.test.ts` | FlyGACA | 18 | ✅ Passing |
| 5 | `tests/security.test.ts` | FlyGACA | 33 | ✅ Passing |

Web total: **68 passing** (`Duration ~2.9s`). iOS total: **21 written**.

---

## 2. Running them

**Web (all three, from the repo root):**

```bash
npm test -- tests/cross-platform-integration.test.ts \
            tests/performance.test.ts \
            tests/security.test.ts
```

`npm test` resolves to `vitest run --config config/vitest.config.ts`, so a bare
`npm test -- tests/security.test.ts` runs one file. The suites are hermetic — no server, no
database, no network, no fixtures on disk.

**iOS (needs a Mac):**

```bash
cd apple/FlyGACAKit && swift test                     # all targets
swift test --filter PersistenceKitTests               # just the sync suites
```

Run `swift test` **directly**, not `npm run ios:test` — the iOS repo's `CLAUDE.md` records that the
npm wrapper's `&&`/`||` chain prints "Swift not available" and exits 0 even when tests fail. In CI
these run in the `swift-test` job on the `macos-15` runner.

---

## 3. What each suite locks in

### 3.1 `AppGroupSyncTests.swift` — shared state across the app family (8 tests)

The App Group (`group.com.FlyGACA`) is what lets a learner's streak and SRS state follow them from
ELPT to AIP on the same device. These tests assert that writes from one app are immediately visible
to another, and that concurrent writes serialize through the `StudyStore` `@ModelActor` rather than
racing:

`testProgressWrittenByOneAppIsVisibleToAnother` · `testStreakSyncAcrossApps` ·
`testEntitlementsSyncAcrossApps` · `testConcurrentQuizRecordsFromMultipleAppsSerialize` ·
`testOneAppOfflineWhileOtherStudiesDoesNotCorruptState` ·
`testExamRecordedByOneAppVisibleToOtherImmediately` ·
`testSameDayQuizDuplicateDoesNotIncrementCount` ·
`testAppGroupStateRemainsConsistentAfterInterleavedUpdates`

Hermetic: in-memory SwiftData container, no simulator.

### 3.2 `FirestoreSyncIntegrationTests.swift` — sync lifecycle (13 tests)

Covers the round trip (`testSyncsProgressAfterQuizCompletion`, `testFetchesProgressFromFirestore`),
offline queueing and reconnect retry, last-write-wins conflict resolution, server-schema parity,
per-bank independence, App Group visibility of synced state, audit-trail capture, question-id
stability across content refreshes, and the error paths — missing user, duplicate/idempotent sync,
concurrent syncs from multiple family apps.

Note the naming: the sync service under test is a **mock defined inside the test file**. The
shipping apps still run entirely on the `AppServices` mocks — `PlatformLive` is built but not wired
into any composition root — so these tests describe the contract `FirebaseProgressSync` must honor
when it is wired, not behavior currently reachable in a shipped build.

### 3.3 `cross-platform-integration.test.ts` — the iOS ↔ web API contract (17 tests)

| Group | Tests | Asserts |
|---|---|---|
| Authentication flow | 4 | Sign-up issues usable tokens; iOS and web sign-ins get **independent** tokens; refresh works; expired refresh tokens are rejected |
| Progress sync (bidirectional) | 4 | iOS → web and web → iOS round trips; last-write-wins on conflict; banks sync independently |
| Entitlements | 3 | A web purchase is visible to iOS on the next fetch; multiple entitlements list correctly; expired ones drop out of the active list |
| Offline resilience | 2 | Queued offline updates apply on reconnect, in order, idempotently |
| Cross-platform parity | 3 | SRS box values 0–5 identical across platforms; `percent = round(correct/total × 100)`; mastery = box ≥ 3 |
| Entitlement gate | 1 | An ELPT quiz starts only with an active entitlement |

The conflict test pins explicit `clientTimestamp` values (10:00 vs 09:00 UTC) rather than relying on
wall-clock ordering, so it demonstrates rejection of the older write deterministically.

### 3.4 `performance.test.ts` — timing envelopes (18 tests)

Auth (<100 ms sign-up/sign-in, <50 ms refresh, <1 s for 10 concurrent), progress sync (<200 ms per
100 questions, <500 ms per 1000, <2 s for 10×100 incremental), entitlements (<50 ms for 10, <100 ms
for 50, <1 s for 20 users), offline (500 queued updates + sync <1 s, 3-way conflict merge <10 ms),
concurrency (10 simultaneous syncs <2 s, 50 entitlement fetches <3 s, full auth+sync+entitlements
for 5 users <5 s) and throughput (10K questions processed <500 ms).

**These are not production SLOs.** Every operation runs against a 10 ms `setTimeout` standing in for
the network, with no server, database or serialization cost. Read them as a guard against algorithmic
regressions in the harness — an O(n²) merge would blow the budget — not as evidence about Cloud Run
latency.

### 3.5 `security.test.ts` — boundaries and PDPL (33 tests)

| Group | Tests | Covers |
|---|---|---|
| JWT & authentication | 6 | 3-part structure, malformed rejection, expiry, `flygaca-api` issuer claim, required `sub`/`exp`/`iat`, no refresh token in `localStorage` |
| PDPL data protection | 5 | No passport, no full address, no biometrics; only name/email/progress stored; audit trail carries who/what/when/why |
| Input validation | 5 | XSS in question payloads, SQL injection via parameterized queries, email format, question-id charset (alphanumeric + underscore), 10 MB payload cap |
| Entitlements authorization | 4 | User-owned keys, expiry enforcement, cross-user isolation, known pack ids only (`elpt`, `aip`, `ppl`, `cpl`, `ir`, `atpl`) |
| Rate limiting | 3 | Per-IP attempt tracking, block after >10 failures, 15-minute window |
| CORS | 3 | Named domains only (never `*`), no localhost in production, `credentials` for HttpOnly cookies |
| HttpOnly cookies | 4 | `httpOnly` / `Secure` / `SameSite=strict`; unreachable from JavaScript |
| Data residency & erasure | 3 | `me-central2` only; Gemini inference outside the Kingdom recorded as a known risk; a 5-step right-to-be-forgotten procedure (anonymize → delete progress → delete entitlements → retain audit → purge cache) |

The pack list includes the four **parked** licence-exam modules. That is correct here — the web
study packs for PPL/CPL/IR/ATPL are still selling; it is only the iOS app targets that were removed
in 2026-08.

---

## 4. Limitations — read before trusting a green run

Three constraints materially bound what a passing run proves:

1. **The web suites exercise no application code.** All three import `vitest` and nothing else;
   each defines its own mock API, mock Firestore and mock session store inside the test file. They
   pin down the *contract* both platforms must speak — response shapes, conflict semantics, the
   security posture the backend is required to hold — and they will catch a spec drift in review.
   They will **not** catch a regression in `server/`, because they never call it. Wiring these
   assertions to the real Express handlers (or to a supertest harness over `server/src`) is the
   single highest-value follow-up.
2. **The iOS suites have never been run.** This workstream executed on a Linux container with no
   Swift toolchain (`which swift` → not found), so `AppGroupSyncTests.swift` and
   `FirestoreSyncIntegrationTests.swift` are unverified — they have not been compiled, let alone
   passed. Anyone with a Mac should run `cd apple/FlyGACAKit && swift test` before treating those 21
   tests as real, and expect to fix compile errors on the first pass. CI's `swift-test` job on
   `macos-15` will surface them on the first PR that targets `main`.
3. **They add nothing to the coverage ratchet.** The files live in `tests/` but touch no `src/`
   module, so `npm run test:coverage` percentages are unchanged by all 68 web tests. The
   `84 / 79 / 87 / 85` floors in `config/vitest.config.ts` still measure exactly what they measured
   before.

---

## 5. Where this lands against the plan

`test-coverage-analysis.md` §6 proposes four phases. This workstream delivers the cross-platform
slice of Phases 1–3, in mock form:

| Plan item | Status |
|---|---|
| App Group sync verification (iOS) | Written (§3.1) — needs a Mac run |
| Firestore sync tests (iOS) | Written (§3.2) — needs a Mac run |
| Cross-repo parity automation | Partial — parity vectors asserted in §3.3; no nightly job |
| PDPL audit-trail verification | Asserted against a mock store (§3.5); not against `server/` |
| Load-testing baseline (k6) | Not started — §3.4 is an in-process harness, not a load test |
| Moyasar webhook idempotency | Not started |
| Captain Adel E2E chat | Not started |
| A11y regression suite | Not started |

Next, in the order that buys the most:

1. Re-point `cross-platform-integration.test.ts` at the real Express handlers via supertest, so the
   contract assertions gain teeth.
2. Run the two Swift suites on a Mac and fix what falls out.
3. Stand up the k6 baseline against staging, and demote §3.4 to what it is — a harness regression
   guard.
