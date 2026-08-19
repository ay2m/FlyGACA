# B2B AIP Exam Prep

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

The organisation-facing version of Fly GACA's AIP exam-prep material — sold to flight schools,
airlines, and AIS/ATS units as seat-based cohorts with progress reporting, rather than
per-person consumer Pro.

> **Fly GACA is independent and not affiliated with GACA.** This offering *prepares* candidates
> to study the Saudi AIP and civil-aviation regulation; it never replaces the official exam or
> the official eAIP. Every study item cites the exact Part/section.

## Read in this order

1. **[`PLAN.md`](./PLAN.md)** — the plan: strategy, ICP, packaging, pricing, GTM, roadmap,
   product gaps, risks, timeline. *Start here.*
2. **[`CURRICULUM.md`](./CURRICULUM.md)** — what a seat learns, mapped 1:1 to the live `aip`
   prep pack (banks, study sheets, eAIP reading, Mock Exam).
3. **[`SALES-ONE-PAGER.md`](./SALES-ONE-PAGER.md)** — prospect-facing summary for a demo.
4. **[`PROPOSAL-TEMPLATE.md`](./PROPOSAL-TEMPLATE.md)** — fill-in-the-blanks quote / SOW.
5. **[`DELIVERY-PLAYBOOK.md`](./DELIVERY-PLAYBOOK.md)** — how to run a cohort, incl. the manual
   path for cohort #1 before the admin dashboard ships.
6. **[`DESIGN-study-progress-sync.md`](./DESIGN-study-progress-sync.md)** — design for the readiness
   prerequisite (persisting per-user study scores to Firestore). *Signed off + built.*
7. **[`DESIGN-admin-dashboard.md`](./DESIGN-admin-dashboard.md)** — design for the `/business/admin`
   cohort dashboard + the `orgs/{id}` ownership model. *Awaiting sign-off.*

## The one-line version

The content already exists (the `aip` pack: `aip-ais` + `airspace` banks, bilingual study
sheets, the AIM reader, the eAIP GEN/ENR reading path, and the Mock Exam), and so does seat
provisioning (`functions/scripts/grant-school-seats.mjs` grants the invoiced `school`
entitlement from a roster). B2B wraps it in **seats + an admin + a readiness report** and sells
it to the organisation. Cohort #1 can be delivered today — provisioning and self-serve seat claim
both ship; the near-term build is a minimal admin view and a CSV report (`PLAN.md` §8).

## Status

v0 plan / proposal. Pricing figures are planning placeholders to validate with design partners —
not published prices. Nothing here changes app behaviour; these are planning documents.
