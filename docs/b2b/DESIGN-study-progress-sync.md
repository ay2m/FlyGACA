# Design proposal — study-progress sync (readiness prerequisite)

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

Status: **Signed off + implemented (ships dark).** Owner: Fly GACA. Last updated: 2026-07-18.
Unblocks: `PLAN.md` §8.2 (readiness report) and §8.3 (admin dashboard).

**Sign-off decisions (§9):** store **scores + completion only** (no answers); sync for **all
signed-in users** (doubles as backup; the report only reads a roster's own uids); consent via a
**`/settings` notice + the proposal/DPA clause** (no per-member toggle); ship **dark** behind
`SYNC_STUDY_PROGRESS` (in `src/lib/services/studyProgressSync.ts`), flip to `true` once the rules are
deployed. Implemented per this doc: the `users/{uid}/progress/summary` rules + tests, the pure
`toProgressSummary` projection + tests, and the debounced best-effort writer wired into
`account.ts` (lazy-loaded, so it stays out of the initial bundle). `SYNC_STUDY_PROGRESS` is now
**on**, the `/settings` consent notice ships for school-seat members, and the readiness columns are
live in `school-cohort-report.mjs`. Remaining: deploy the rules with hosting; a branded PDF report.

> **Not affiliated with GACA.** This stores a member's *practice* progress to power a training
> readiness report; it is not an exam record and never replaces the official GACA exam.

## 1. Why

The B2B readiness report and admin dashboard need per-seat **coverage** and **Mock Exam scores**.
Today those live only in the browser: `src/lib/studyProgress.ts` keeps everything in `localStorage`
(`flygaca:quiz:*`, `flygaca:study:exam*`, …) and nothing is written to Firestore. So there is no
server-side data to report on. This proposes the minimal sync to change that — **without giving up
local-first**.

## 2. Goals / non-goals

**Goals**
- Persist a compact, per-user **readiness projection** (quiz best scores + Mock Exam history) to
  Firestore so a report/dashboard can read it.
- Keep the local store the **source of truth** for the study UI; sync is an upload/backup, not a
  dependency. The app must work identically offline.
- Reuse the existing owner-scoped `users/{uid}` subtree + rules pattern (`logbook`, `records`).

**Non-goals**
- No real-time cross-device merge. Last-writer-wins on a single summary doc is enough for a report.
- Don't sync study *aids* that reporting doesn't need (flashcard SRS schedules, flagged questions,
  `lastBank`). Data minimisation: store scores, not the member's whole study state.
- Not the cross-user read path. An **admin** reading their cohort still needs the `orgs/{id}` +
  ownership model (`PLAN.md` §8.3); this proposal only makes each member's own data server-visible.

## 3. Data model

One summary doc per user — a projection of `StudyState`, not the whole thing:

```
users/{uid}/progress/summary
{
  quizBest:   { [bankId: string]: number },   // 0–100, best % per quiz bank  → coverage
  exam:       { pct: number, passed: boolean, date: string } | null,  // last Mock Exam
  examBest:   number,                          // best Mock Exam % (denormalised for the report)
  examCount:  number,                          // attempts (for "median attempts" KPI)
  gsDone:     { [moduleId: string]: true },    // ground-school completion (optional coverage input)
  updatedAt:  string                           // ISO; client clock, for staleness/last-active
}
```

- **Why a summary, not full `StudyState`:** the report needs coverage + scores only. `quizBest`,
  `exam*`, and `gsDone` cover it; `fcSrs`, `flagged`, `pathDone`, `lastBank`, `streak` stay local.
- **Bounded:** `quizBest`/`gsDone` are keyed by the fixed catalogue of bank/module ids (~tens of
  keys), each a small number/bool — well within a Firestore doc. Rules cap this (below).
- **Subcollection, not fields on `users/{uid}`:** keeps the strict `validProfile()` +
  `entitlementUntouched()` rules on the account doc untouched, exactly as `logbook`/`records` do.

## 4. Firestore rules

Mirror the `logbook`/`records` blocks — owner read/write/delete, server (Admin SDK) reads for the
report; validate shape and cap size so a client can't bloat or poison it:

```
match /users/{uid}/progress/{doc} {
  allow read, delete: if isOwner(uid);
  allow create, update: if isOwner(uid)
    && request.resource.data.keys().hasOnly(
         ['quizBest','exam','examBest','examCount','gsDone','updatedAt'])
    && request.resource.data.updatedAt is string
    && request.resource.data.updatedAt.size() <= 40
    && (!('examBest' in request.resource.data)
        || (request.resource.data.examBest is number
            && request.resource.data.examBest >= 0
            && request.resource.data.examBest <= 100))
    && (!('quizBest' in request.resource.data)
        || request.resource.data.quizBest.keys().size() <= 100);
}
```

(Exact per-field checks finalised in the rules test — the point is: owner-scoped, key-allowlisted,
size-capped, no cross-user read. Add a `tests/rules/` case per branch, like the `schoolInvites`
deny test.)

## 5. Client sync (where it writes)

- A thin `src/lib/services/studyProgressSync.ts` subscribes to the `studyProgress` store
  (`useSyncExternalStore` source) and, **debounced** (~5 s) and only when signed in + Firebase
  configured, writes the projection with `setDoc(..., { merge: true })`. Best-effort and swallowed
  on failure — identical to the existing `sync.ts` posture (offline just retries later).
- Projection built by a pure `toProgressSummary(state): ProgressSummary` (unit-tested), so the
  local→doc mapping is testable without Firestore.
- On sign-in hydration (`sync.ts` `loadAccount`), read the summary too — but **local wins** for the
  live UI; the remote copy is for the server/report. (We do not overwrite richer local state with a
  thinner remote one.)
- Gate behind a small flag (e.g. `SYNC_STUDY_PROGRESS`) so it can ship dark and be enabled once the
  rules + tests are in.

## 6. Privacy & consent

- **What's stored:** practice **scores and completion**, keyed by bank/module id. **Not** the
  member's answers, not free text, not the questions.
- **Who reads it:** the member (owner), and the server (Admin SDK) to build *their own
  organisation's* readiness report. No client-to-client reads; cross-user access is gated by the
  future org model and stays server-mediated.
- **Framing:** a seat is a training relationship the org is paying for; the readiness report is the
  deliverable. Surface a one-line notice in `/settings` ("study progress for your seat is shared
  with your school") and in the proposal/DPA (`PROPOSAL-TEMPLATE.md` already has a data clause).
- **Retention:** delete with the account (`allow delete: if isOwner`); a revoked seat stops new
  reporting. Consumer (non-seat) users' progress simply isn't reported on.

## 7. What this unblocks

- **§8.2 readiness report:** `school-cohort-report.mjs` gains real columns — read
  `users/{uid}/progress/summary` alongside the entitlement, compute coverage (banks attempted vs.
  pack) + best Mock Exam %, and derive **ready** (full coverage + Mock Exam ≥ threshold). CSV first.
- **§8.3 admin dashboard:** same data, surfaced in-app once the org/ownership model lands.

## 8. Rollout & testing

1. Land rules + `toProgressSummary` + `studyProgressSync` behind the flag (dark).
2. Rules tests (owner read/write, cross-user deny, key-allowlist, size cap) + a unit test for the
   projection. Frontend gate + `test:rules` as usual.
3. Enable the flag; verify a real signed-in session writes the summary and it round-trips.
4. Extend `school-cohort-report.mjs` with the readiness columns (separate PR).

## 9. Open questions for sign-off

1. **Scope of stored data** — is the §3 projection (scores + completion, no answers) the right
   line? Anything to add (e.g. per-bank attempt counts) or remove?
2. **Consent surface** — is a `/settings` notice + the proposal/DPA clause sufficient, or do we
   want an explicit opt-in toggle for seat members?
3. **Automatic vs. seat-only** — sync for *all* signed-in users (simpler, also gives consumers
   cloud backup), or only for `school`-entitled seats (tighter data minimisation)? Recommendation:
   **all signed-in users**, since it doubles as progress backup and the report only ever reads a
   roster's own uids.
4. **Flag default** — ship dark then enable, or enable on first release? Recommendation: **dark
   first**, enable after the rules test is green in CI.

Once these are settled I'll implement §5 + §4 + tests in one PR (still no change to the offline-first
study UX), then the readiness columns in a follow-up.
