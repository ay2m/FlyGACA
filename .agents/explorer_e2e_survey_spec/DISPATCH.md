## 2026-08-16T20:44:15Z
You are the Feature & Spec Investigator (Explorer 1) for the E2E Testing Track of the Fly GACA ATO Admin & Cohort Onboarding Dashboard.

Your working directory: /Users/ad/Documents/GitHub/FlyGACA-app/.agents/explorer_e2e_survey_spec
Parent workspace: /Users/ad/Documents/GitHub/FlyGACA-app
Parent conversation ID: 55035e0e-6390-4ded-9195-83481b43ac19

TASKS:
1. Read `/Users/ad/Documents/GitHub/FlyGACA-app/ORIGINAL_REQUEST.md` and explore all ATO Admin Dashboard features in the codebase:
   - UI: `instructor.html`, `src/instructor/` or relevant UI components, roster table, seat utilization counters, Leitner SRS retention tracking, mock exam readiness pass probability, CSV export triggers, PDPL consent banner/flags.
   - Backend: `functions/src/org.ts`, `grantSchoolLicence`, `revokeSchoolLicence`, `schools/{schoolId}/roster/{cadetUid}`, `schools/{schoolId}/analytics/summary`, health score $H$ calculation.
   - Security: `firestore.rules` rules for `schools/{schoolId}/...` and verification that instructors cannot access private user logbooks (`users/{userId}/...`).
2. Catalog all features, interfaces, types, functions, schemas, and security boundaries.
3. Write a comprehensive survey report to `/Users/ad/Documents/GitHub/FlyGACA-app/.agents/explorer_e2e_survey_spec/survey_spec_report.md` and a handoff to `/Users/ad/Documents/GitHub/FlyGACA-app/.agents/explorer_e2e_survey_spec/handoff.md`.
4. Send a message to your parent (ID: 55035e0e-6390-4ded-9195-83481b43ac19) reporting completion.
