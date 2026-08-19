# B2B AIP Exam Prep — Product & Go-to-Market Plan

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

> **Fly GACA is an independent, educational platform — not affiliated with GACA.** This
> offering helps organisations *prepare* candidates to find and study Saudi civil-aviation
> regulation and the Saudi AIP. It never replaces the official GACA exam, the GACAR, or the
> official eAIP. Every answer and study sheet cites the exact Part/section so candidates learn
> to verify against the source of truth.

Status: **Proposal / v0 plan.** Owner: Fly GACA. Last updated: 2026-07-16.

---

## 1. What this is

A packaged, org-facing version of the AIP exam-prep material Fly GACA already ships to
individual users (the `aip` prep pack: the `aip-ais` + `airspace` quiz banks, the bilingual
"Saudi AIP — from 0 to pass" study sheets, the AIM reader, the eAIP GEN/ENR reading path, and
the Mock Exam). B2B wraps that content in **cohort delivery, seat management, progress
reporting, and a co-branded landing** so a flight school, airline, ground-school provider, or
AIS/ATS unit can put a group of candidates through structured AIP preparation and see who is
ready.

The consumer product is self-serve and priced per-person via Stripe (`Fly GACA Pro`). B2B is
**seat-based and invoiced**, sold to the organisation, with an admin who manages the cohort.

## 2. Why AIP, why now

- The AIP prep pack is the newest and most defensible content we have: the corpus is ported
  from the 14 Saudi eAIP documents (GEN/ENR/AD), and as of PR #302 it is the only pack with a
  dedicated multi-page bilingual study sheet plus a live question bank and Mock Exam.
- AIP/AIS knowledge is a recurring, examinable requirement across pilot licensing (PPL→ATPL),
  licence conversion for expat crews, and AIS/ATS/dispatcher roles — all of which sit in
  **organisations** that today train ad-hoc from PDFs.
- Nobody offers Saudi-specific, bilingual (EN + AR, RTL-first), citation-backed AIP prep. The
  regulatory corpus + Captain Adel RAG assistant is the moat.

## 3. Target buyers (ICP)

| Segment | Who buys | The job | Cohort size |
| --- | --- | --- | --- |
| **Flight training organisations (ATO/FTO)** | Head of Training | Get PPL/CPL/IR students through the AIP/AIS knowledge component | 15–60 / intake |
| **Airlines & operators** | Crew training / conversion lead | Onboard/convert expat pilots to Saudi airspace & AIP | 10–40 / batch |
| **AIS / ATS / dispatch units** | Unit training officer | Standardise AIP-structure literacy for new hires | 5–25 |
| **Ground-school & test-prep providers** | Owner / academic lead | White-label a modern AIP module they don't have to build | 30–200 / year |

Beachhead: **flight training organisations in KSA** — clearest budget, clearest exam driver,
warmest to a Saudi-specific bilingual tool.

## 4. The offer (packaging)

Three tiers. All include the AIP pack content, bilingual, on web + native app.

### Starter — "Cohort"
- Up to **25 seats**, single intake, 90-day access.
- Admin dashboard: invite by email/CSV, see per-seat quiz coverage + Mock Exam scores.
- Bilingual study sheets (EN/AR PDF) + AIM reader + eAIP reading path.
- Captain Adel assistant (cited answers) for every seat.
- Email support, self-serve onboarding.

### Growth — "Academy"
- Up to **100 seats**, rolling intakes over 12 months.
- Everything in Cohort, plus:
  - **Co-branded landing** (org logo + name; the not-affiliated disclaimer stays verbatim).
  - Exportable **readiness report** (CSV/PDF) per cohort for the training file.
  - Custom pass threshold + "ready to sit" flag per candidate.
  - Priority support, one onboarding session.

### Enterprise — "Institution"
- **100+ seats / SSO / procurement.**
- Everything in Academy, plus:
  - SSO (Google Workspace / Microsoft Entra) + domain-verified auto-join.
  - Content review workshop mapping the pack to the org's own syllabus.
  - Named success contact, quarterly review, SLA on support.
  - Optional: private question bank additions authored with the org (still cited to the corpus).

> **Add-ons (any tier):** extra seats (per-seat overage), Arabic-only cohort, instructor-led
> kickoff webinar, printed study-sheet licence.

See `CURRICULUM.md` for exactly what a seat learns, and `PROPOSAL-TEMPLATE.md` for a quotable
version of the above.

## 5. Pricing model (indicative, SAR)

Seat-based, billed annually or per-intake. Figures are **planning placeholders** to be
validated with 3–5 design-partner quotes — not published prices.

| Tier | Seats | Indicative list | Effective / seat |
| --- | --- | --- | --- |
| Cohort | up to 25 | SAR 6,000 / intake | ~SAR 240 |
| Academy | up to 100 | SAR 22,000 / year | ~SAR 220 |
| Institution | 100+ | Custom (from SAR 40,000) | negotiated |

- Anchor: consumer Pro list price × seats, discounted ~30–50% for volume + invoicing.
- Overage: per-seat rate above the tier cap, trued-up quarterly.
- Design-partner pricing: **50% off year one** in exchange for a logo + case study + feedback.

Billing mechanics: near-term, **invoice + Stripe seat subscription** (`quantity` = seats) so we
reuse the existing `stripeWebhook` entitlement path; the org admin's account carries a
`team`/`org` entitlement that fans out seats. This needs the small backend change in §8.

## 6. Go-to-market

**Motion:** founder-led, high-touch, design-partner first. This is a <20-logo, land-and-expand
play in year one — not self-serve.

1. **Design partners (weeks 0–8).** Sign 3–5 KSA flight schools / one operator at 50% off for a
   full case study. Deliver one real cohort each, instrument everything.
2. **Proof (weeks 8–16).** Turn the cohorts into a readiness-report artefact + a written case
   study ("X% of the cohort hit the ready threshold in N weeks"). Publish on flygaca.com.
3. **Repeatable outbound (month 4+).** Warm intros via the design partners; a two-email +
   one-pager sequence (`SALES-ONE-PAGER.md`) to heads of training; demo = a live cohort
   dashboard with sample data.
4. **Inbound assist.** SEO already targets AIP/GACA queries (see `SEO-PLAN.md`); add a
   `/for-schools` (or `/business`) page that routes org traffic to a "book a demo" form.

**Channels:** GACA-adjacent training networks, IATA/airline training contacts, aviation
LinkedIn, existing consumer users who are instructors (identify via feedback + email domain).

## 7. Success metrics

| Layer | Metric | v1 target |
| --- | --- | --- |
| Pipeline | Design partners signed | 3–5 in Q1 |
| Delivery | Cohorts delivered | 5 by end of Q2 |
| Learning | Seats reaching "ready" threshold | ≥70% of active seats |
| Engagement | Median Mock Exam attempts / seat | ≥3 |
| Commercial | ARR from B2B | first SAR 100k booked in H1 |
| Retention | Design partners who renew / expand | ≥60% |

Instrument via the existing analytics (Amplitude) — new events: `cohort_created`,
`seat_invited`, `seat_activated`, `mock_exam_completed`, `seat_ready`.

## 8. What we have to build (product gaps)

Ordered by necessity. Most of the *content* exists — and, it turns out, so does the day-one seat
mechanism. The remaining gaps are the self-serve/admin surfaces on top of it.

**Already built (reuse, don't rebuild):**

- **School-seat entitlement + roster provisioning.** `functions/src/school-core.ts` defines the
  invoiced `school` tier (which satisfies every Pro feature via the plan rank) and roster
  parsing; `functions/scripts/grant-school-seats.mjs` grants/revokes it per roster email via the
  Admin SDK — idempotent, optional contract-expiry, `--dry-run`. This *is* the org/seat
  entitlement for cohort #1: an admin runs it against the roster and every existing account
  unlocks. On the marketing side, `/schools` sells bulk seats, shows the three-tier packaging,
  and feeds an enquiry form.

- **Self-serve seat claim** *(built).* `claimSchoolSeat` (`functions/src/school.ts`) — a callable
  mirroring `claimStaffAccess` — grants a `school` seat to a VERIFIED email that is either on an
  **approved school domain** (`APPROVED_SCHOOL_DOMAINS`, empty until an operator adds one) or on
  the **invite roster** (`schoolInvites/{email}`, deny-all client access, provisioned by the
  grant script with an optional contract-expiry). The app calls it on sign-in for free-plan users,
  so an invited/domain member unlocks without a script re-run — and roster emails with no account
  yet self-unlock on their first sign-in. Grant-only, idempotent, App Check enforced.

- **Cohort seat report** *(built).* `functions/scripts/school-cohort-report.mjs` reports each
  roster email's **seat** status — active / invited / expired / none — from the account
  `entitlement` + the `schoolInvites` roster, with a `--csv` export for the shared tracker. Status
  logic is the pure `schoolSeatStatus` in `school-core.ts` (tested).

**Two prerequisites blocking the rest (discovered while building the above):**

- **Study progress is local-first.** `src/lib/studyProgress.ts` keeps quiz coverage, Mock Exam
  scores and the streak in `localStorage` only — nothing is written to Firestore. So the
  **readiness dimension** (coverage %, Mock Exam score, "ready") has no server-side data to report;
  it needs a study-progress sync (per-user Firestore write on quiz/exam completion, deny-all-else
  rules) before any automated readiness report or dashboard column is possible. This is a
  deliberate architecture change (the app is offline-first), so it's a decision, not a given.
- **No org→admin ownership model.** `schoolInvites` are global (provisioned by the ops script),
  not owned by a customer admin, and there is no `orgs/{id}` doc. An **in-app** admin dashboard
  needs that model so an admin can scope "my cohort" and read only their members. The ops report
  script sidesteps this (an operator runs it against the roster file).

- **Study-progress sync** *(built + enabled; design in `DESIGN-study-progress-sync.md`).*
  `users/{uid}/progress/summary` — a per-user readiness projection (quiz best + Mock Exam history +
  ground-school completion, **scores/completion only, no answers**) written by a debounced,
  best-effort client sync (`src/lib/services/studyProgressSync.ts`); local store stays source of truth.
  Owner-scoped + key-allowlisted + size-capped rules (with tests). `SYNC_STUDY_PROGRESS` is now
  `true` — **deploy the `firestore.rules` change with/before hosting** (until then writes 403 and
  are swallowed). A `/settings` consent notice shows to school-seat members.

- **Readiness report** *(built).* `school-cohort-report.mjs` reads each seat's `progress/summary`
  and reports **coverage** (quiz banks ≥ threshold), **best Mock Exam %**, **last active**, and a
  **ready** flag (all expected banks ≥ threshold AND Mock Exam ≥ threshold; `--banks`/`--threshold`
  configurable, default the AIP pack at 75%), with a `--csv` export. Status logic is the pure
  `schoolReadiness` in `school-core.ts` (tested). A seat that has synced nothing shows `ready: —`.

**Still to build (in priority order):**

1. **Admin dashboard (MVP)** *(design in `DESIGN-admin-dashboard.md`, awaiting sign-off).* Needs an
   `orgs/{id}` + admin-ownership model; a server-aggregated `getCohortReadiness` callable (so an
   admin never cross-reads member progress), a read-only cohort table under `/business/admin`, then
   self-serve provisioning. Until it ships, `grant-school-seats.mjs` + `school-cohort-report.mjs` +
   a shared tracker cover provisioning, status and readiness.
2. **Readiness report PDF.** Cohort-branded PDF via the Playwright HTML→PDF pattern
   (`scripts/build-*-sheet.mjs`); the CSV already ships.
3. **Seat overage true-up.** Report seats-in-use vs. contracted count; surface for billing.
4. **SSO (Enterprise only, later).** Defer until an Enterprise deal requires it.

**Cohort #1 needs nothing new** — `grant-school-seats.mjs` provisions accounts and invites the
rest (who self-unlock via `claimSchoolSeat`), and `school-cohort-report.mjs` gives the weekly seat
status (see `DELIVERY-PLAYBOOK.md`). Study readiness is tracked by hand until progress sync (item 1).

## 9. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Buyers assume affiliation with GACA | Disclaimer stays verbatim everywhere; sales scripts lead with "independent prep, verify against GACA". |
| Content drift vs. real AIP (AIRAC cycles) | Corpus is versioned; add an AIRAC-freshness note per cohort; `sync-gaca.mjs` keeps the library current. |
| "We already train from PDFs" objection | Lead with bilingual + Mock Exam readiness reporting + Captain Adel citations — the report is the wedge. |
| Long procurement cycles | Start with the smallest paid Cohort tier / single intake to get in the door. |
| Building the admin dashboard before demand is proven | Cohort #1 provisions + reports today via `grant-school-seats.mjs` + `claimSchoolSeat` + `school-cohort-report.mjs`; only build progress sync/readiness/admin (§8.1–3) once a second buyer is real. |

## 10. Timeline (indicative)

| Phase | Weeks | Outcome |
| --- | --- | --- |
| Validate | 0–4 | 3 design-partner LOIs; pricing confirmed; `SALES-ONE-PAGER` + proposal live. |
| Build MVP | 2–8 | Study-progress sync → readiness report → admin MVP (§8.1–3); provisioning, self-serve claim + seat report already ship. |
| Deliver | 6–14 | First 3 cohorts run; readiness reports shipped; case study drafted. |
| Expand | 14+ | `/for-schools` live; outbound sequence; Academy tier sold; SSO on demand. |

---

## Documents in this package

- **`PLAN.md`** — this file: strategy, packaging, pricing, GTM, roadmap.
- **`CURRICULUM.md`** — the AIP exam-prep syllabus, mapped to the in-app assets and the eAIP.
- **`SALES-ONE-PAGER.md`** — prospect-facing summary for heads of training.
- **`PROPOSAL-TEMPLATE.md`** — a fill-in-the-blanks quote/SOW for a specific org.
- **`DELIVERY-PLAYBOOK.md`** — how a cohort is onboarded, run, and reported (incl. the manual
  path for cohort #1 before the admin dashboard ships).
