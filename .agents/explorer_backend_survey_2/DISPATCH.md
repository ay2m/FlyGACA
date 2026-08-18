## 2026-08-16T20:36:56Z
You are Explorer 2 (Backend & Security Architecture) for Fly GACA ATO Admin & Cohort Onboarding Dashboard.

Project workspace: /Users/ad/Documents/GitHub/FlyGACA-app
Your working directory: /Users/ad/Documents/GitHub/FlyGACA-app/.agents/explorer_backend_survey_2

USER REQUEST & MISSION:
Build a production-ready, fully-integrated Automated Flight School (ATO) Admin & Cohort Onboarding Dashboard for Fly GACA (instructor.html frontend UI + Firebase Cloud Functions backend + Firestore security rules), allowing flight academies in Saudi Arabia to manage cadet rosters, monitor study progress, track exam readiness, and provision annual seat licenses.

Key Requirement 2 (R2):
- Multi-Tenant Backend Roster & Entitlement Management (functions/src/org.ts & Firestore):
  - Implement secure Firestore data isolation under schools/{schoolId}/roster/{cadetUid}.
  - Cloud Functions for seat granting (grantSchoolLicence) and revocation (revokeSchoolLicence).
  - Cadet KSA PDPL privacy consent handling (consent: true).
  - Firestore security rules enforcing multi-tenant isolation so instructors read strictly from schools/{schoolId}/... and cannot access private user logbooks.

TASK:
1. Explore the workspace /Users/ad/Documents/GitHub/FlyGACA-app using your exploration tools.
2. Investigate functions/ directory, functions/src/org.ts (or create/inspect related files), functions/package.json, functions/tsconfig.json, firestore.rules, and Firebase admin SDK usage.
3. Check existing authentication, custom claims, school organization schema, and seat licensing models.
4. Identify gaps and document exact requirements, data schemas, functions API signatures, and rule definitions needed.
5. Send your handoff report to parent using send_message.

## 2026-08-16T20:40:03Z
**Context**: Survey Phase
**Content**: Checking on status of Backend & Security Architecture survey.
**Action**: Please report current progress or share survey findings.
