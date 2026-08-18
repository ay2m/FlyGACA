# BRIEFING — 2026-08-16T23:41:00+03:00

## Mission
Survey backend and security architecture for Fly GACA ATO Admin & Cohort Onboarding Dashboard (R2: Multi-Tenant Backend Roster & Entitlement Management, functions/src/org.ts, Firestore schemas, Cloud Functions, and Security Rules).

## 🔒 My Identity
- Archetype: explorer
- Roles: backend & security architecture investigation, synthesis, gap analysis
- Working directory: /Users/ad/Documents/GitHub/FlyGACA-app/.agents/explorer_backend_survey_2
- Original parent: 2677136f-1287-40be-9767-e0b8eed9583d
- Milestone: ATO Admin & Cohort Onboarding Dashboard - Phase 1 Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production source code changes during exploration
- Output comprehensive 5-component handoff report
- Deliver findings back to parent agent via send_message

## Current Parent
- Conversation ID: 2677136f-1287-40be-9767-e0b8eed9583d
- Updated: 2026-08-16T23:41:00+03:00

## Investigation State
- **Explored paths**:
  - `functions/src/index.ts`, `functions/src/org.ts`, `functions/src/org-core.ts`, `functions/src/school.ts`, `functions/src/school-core.ts`, `functions/src/staff.ts`, `functions/src/billing-core.ts`, `functions/src/auth-core.ts`, `functions/src/region.ts`
  - `firestore.rules`, `tests/rules/firestore-rules.test.ts`
  - `src/lib/services/org.ts`, `src/lib/services/school.ts`, `src/pages/business/Admin.tsx`
  - `functions/package.json`, `functions/tsconfig.json`, `package.json`
- **Key findings**:
  - Multi-tenant data structure designed: `schools/{schoolId}` and `schools/{schoolId}/roster/{cadetUid}` with `analytics/summary`.
  - Cloud Functions `grantSchoolLicence` & `revokeSchoolLicence` design finalized with atomic seat quota tracking and Admin SDK entitlement management.
  - KSA PDPL consent handling (`consent: boolean`, `consentedAt`) designed to ensure cadet privacy and prevent unauthorized instructor access to personal logbooks.
  - Firestore security rules formulated to grant instructors access strictly to `schools/{schoolId}/roster/{cadetUid}` while preventing access to `users/{cadetUid}/logbook/{entry}`.
- **Unexplored areas**: None. Survey complete.

## Key Decisions Made
- Standardized schemas for `schools/{schoolId}` and `schools/{schoolId}/roster/{cadetUid}`.
- Provided pure core architecture for seat limit validation and roster parsing matching repo conventions.
- Formulated exact Firestore rules and verification commands.

## Artifact Index
- DISPATCH.md — Task dispatch record
- BRIEFING.md — Working memory and context
- progress.md — Liveness heartbeat
- handoff.md — Final survey report
