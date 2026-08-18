# Original User Request

## Initial Request — 2026-08-16T20:30:32Z

Build a production-ready, fully-integrated Automated Flight School (ATO) Admin & Cohort Onboarding Dashboard for Fly GACA (`instructor.html` frontend UI + Firebase Cloud Functions backend + Firestore security rules), allowing flight academies in Saudi Arabia to manage cadet rosters, monitor study progress, track exam readiness, and provision annual seat licenses.

Working directory: /Users/ad/Documents/GitHub/FlyGACA-app
Integrity mode: development

## Requirements

### R1. Flight School Admin Dashboard Interface (`instructor.html` / React UI)
Build/enhance an intuitive, responsive dashboard interface allowing Academy Admins and Flight Instructors to view active cadet rosters, monitor Leitner SRS retention, track GACAR mock exam pass rates, and trigger cohort progress exports.

### R2. Multi-Tenant Backend Roster & Entitlement Management (`functions/src/org.ts` & Firestore)
Implement secure Firestore data isolation under `schools/{schoolId}/roster/{cadetUid}`, Cloud Functions for seat granting (`grantSchoolLicence`) and revocation (`revokeSchoolLicence`), and cadet KSA PDPL privacy consent handling (`consent: true`).

### R3. Automated Cohort Health & Exam Readiness Analytics
Implement automated calculation of 5-factor Customer Health Scores ($H$) and cadet mock exam pass probability indicators, exporting pre-aggregated summaries to `schools/{schoolId}/analytics/summary` to eliminate N+1 Firestore read bottlenecks.

### R4. Verification & Testing Suite
Ensure strict TypeScript type safety (`npm run typecheck`), 100% unit test pass rate (`npx vitest run`), and clean production bundling (`npm run build`).

## Acceptance Criteria

### Functional & UI Criteria
- [ ] Dashboard displays active cadet rosters with seat utilization counters (e.g. 45/50 active seats).
- [ ] Instructors can view cadet mock exam pass rates and automated GACAR exam readiness indicators.
- [ ] Cohort progress exports generate clean summary reports for academy directors.

### Backend & Security Criteria
- [ ] Firestore rules enforce multi-tenant isolation so instructors read strictly from `schools/{schoolId}/...` and cannot access private user logbooks.
- [ ] Cadet data sharing requires explicit PDPL consent (`consent: true`).
- [ ] `grantSchoolLicence` and `revokeSchoolLicence` Cloud Functions manage seat allocations safely.

### Verification Criteria
- [ ] `npm run typecheck` completes with 0 TypeScript compilation errors.
- [ ] `npx vitest run` passes 100% of unit tests.
- [ ] `npm run build` succeeds with clean production bundle output.
