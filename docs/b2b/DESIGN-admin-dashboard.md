# Design proposal — `/business/admin` cohort dashboard + org model

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

Status: **Proposal for sign-off.** Owner: Fly GACA. Last updated: 2026-07-18.
Implements: `PLAN.md` §8.1 (admin dashboard). Depends on: the seat entitlement, `schoolInvites`,
`progress/summary` sync, and the readiness logic (`schoolReadiness`) — all already on `main`.

> **Not affiliated with GACA.** The dashboard reports a cohort's *practice* readiness so a school
> can manage its own candidates; it is not an exam record and never replaces the official GACA exam.

## 1. Why

Today an operator runs `grant-school-seats.mjs` + `school-cohort-report.mjs` from a terminal and
tracks a cohort in a shared sheet. That works for cohort #1 but doesn't scale and can't be handed to
a customer. This adds an in-app **`/business/admin`** surface where a school's own admin sees their
cohort's seat status + readiness, exports it, and (phase 2) invites seats — without Fly GACA staff in
the loop.

## 2. The gap that forces a decision

Two things don't exist yet, and both are real decisions:

1. **No org identity.** `schoolInvites` are global (ops-provisioned); nothing links a seat or an
   invite to a *customer admin*. An admin page needs to scope "my cohort".
2. **An admin can't read members' progress.** `users/{uid}/progress/summary` is **owner-read only**
   (by design). A dashboard must get cohort readiness **without** cross-user client reads.

## 3. Proposed model

### `orgs/{orgId}` (server-owned, like `stripeCustomers`)
```
orgs/{orgId}
{
  name:            string,
  ownerUids:       string[],        // admins (the buyer + delegates)
  seatLimit:       number,
  passThreshold:   number,          // default 75
  banks:           string[],        // expected quiz banks (default the AIP pack)
  approvedDomains: string[],        // optional domain auto-unlock for THIS org
  createdAt:       string
}
```
- **Deny-all client access** in `firestore.rules` (mirror `stripeCustomers`/`schoolInvites`). Written
  only by the Admin SDK — provisioned by an ops step or a `provisionSeats` callable (phase 2).

### Tie seats + invites to the org
- Extend `schoolInvites/{email}` with `orgId` (the grant script gains `--org=`), so a member's seat
  is attributable to a cohort.
- On claim, `claimSchoolSeat` copies `orgId` onto a small **server-written** membership record —
  `orgMembers/{orgId}/{uid}` (email + claimedAt) — so the aggregation callable can enumerate a
  cohort's uids. (Alternative: add `orgId` to the `entitlement`; rejected — keeps the entitlement
  shape stable and membership is a separate concern.)

### Read path — a server-aggregated callable, not client cross-reads
`getCohortReadiness(orgId)` (callable, App Check, owner-verified):
1. Assert `request.auth.uid ∈ orgs/{orgId}.ownerUids` — else `permission-denied`.
2. Read `orgMembers/{orgId}/*`, each member's `entitlement` + `progress/summary` (Admin SDK).
3. Return the same rows the ops report builds — reusing the **pure** `schoolSeatStatus` +
   `schoolReadiness` (already in `school-core.ts`) so the dashboard and the CLI can't diverge.

This keeps the rule "a member's progress is owner-read only" intact: the admin never reads member
docs directly; the server aggregates and returns only the roll-up the admin is entitled to.

## 4. The page (`/business/admin`)

- New lazy route in `src/router.tsx`, gated by **being an org owner** (a `useOrgAdmin()` hook that
  calls a tiny `getMyOrgs()` callable; non-admins get a "not authorised" state, not a 404 of intent).
- Renders the cohort table — email · seat status · coverage · best Mock Exam % · last active ·
  **ready** — from `getCohortReadiness`, with counts (N active, N ready, N no-progress) and a
  **client-side CSV export** (same columns as `school-cohort-report.mjs`).
- Bilingual (EN + AR), logical-property CSS for RTL, `<Disclaimer />`, tokens only — like `/schools`.
- **Phase 2:** an invite panel (paste/upload emails → `provisionSeats(orgId, emails, expiresAt)`
  callable, owner-verified, seat-limit-enforced) so the admin self-serves provisioning.

## 5. Phasing (ship the safe half first)

- **Phase 1 — read-only dashboard.** `orgs` + `orgMembers` model, `getCohortReadiness` +
  `getMyOrgs` callables, the page, rules, tests. Provisioning stays the ops script (which gains
  `--org=`). This is the whole "see my cohort" value with the least new surface.
- **Phase 2 — self-serve provisioning.** `provisionSeats` callable + the invite panel + seat-limit
  + overage reporting (`PLAN.md` §8.3).

## 6. Rules & security

- `orgs/{orgId}` and `orgMembers/{orgId}/{uid}`: `allow read, write: if false` (server-only), with
  rules tests mirroring the `schoolInvites` deny cases.
- All new callables enforce **App Check** and re-verify org ownership server-side (a stolen ID token
  can't enumerate a cohort). Grant/aggregation only; never a client write path to entitlement.
- `provisionSeats` (phase 2) is the only new writer of seats/invites besides the ops script; it
  enforces `seatLimit` and stays grant-only (mirrors `claimStaffAccess`/`grant-school-seats.mjs`).

## 7. Privacy

- The admin sees their **own cohort's** practice readiness only (scores/completion — no answers),
  which the seat member is told about via the `/settings` consent notice already shipped. No access
  to anyone outside the org; all cross-user data is server-mediated and owner-gated.

## 8. Testing & rollout

1. Phase 1 behind a flag: model + callables + rules + a read-only page with sample data.
2. Rules tests (orgs/orgMembers deny), unit tests for the aggregation mapping (reuse the pure core),
   a callable test for the ownership check, and an e2e that loads the page as an org owner.
3. Enable for the first design-partner admin; verify against the CLI report for the same roster.
4. Phase 2 (provisioning) as a follow-up once phase 1 is validated with a real cohort.

## 9. Open questions for sign-off

1. **Org creation** — for the first customers, provision `orgs/{orgId}` + `ownerUids` by an **ops
   step** (simplest), or build a self-serve "create your school" flow now? Recommendation: **ops
   step**; self-serve later.
2. **Admin ↔ member domain** — assume an admin's own account is *not* a seat (they manage, don't
   study), or allow an admin to also hold a seat? Recommendation: **allow both** (independent).
3. **Phase 1 scope** — read-only dashboard first (recommended), or build provisioning in the same
   pass?
4. **Route** — `/business/admin` vs. `/schools/admin` vs. `/dashboard` (the consumer dashboard
   already exists at `/dashboard`, so a distinct `/business/admin` avoids collision). Recommendation:
   **`/business/admin`**.

Once these are settled I'll build **Phase 1** (model + `getCohortReadiness`/`getMyOrgs` + the
read-only page + rules + tests), reusing the pure `school-core` helpers so the dashboard and the CLI
report always agree.
