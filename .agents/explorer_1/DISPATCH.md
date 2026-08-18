## 2026-08-16T20:42:38Z

Task:
1. Examine the project structure at `/Users/ad/Documents/GitHub/FlyGACA-app`, including `package.json`, `functions/package.json`, `tsconfig.json`, directory tree, and test setups (Vitest/Jest).
2. Check existing implementations of Cloud Functions in `functions/src/` (especially `org.ts`, `school.ts`, `index.ts`, `analytics-core.ts` if they exist).
3. Check existing frontend / shared calculation files in `src/calc/` or `src/calc/analytics/`.
4. Identify existing test files, test commands, dependencies, build commands for both root and `functions/`.
5. Write a comprehensive report detailing what exists, what is missing, dependencies, and precise file paths for implementing:
   - Multi-Tenant Roster & Entitlement Management in Cloud Functions
   - Firestore security rules
   - 5-factor Health score ($H$) and Pass Probability ($P$) math functions
   - Pre-aggregated summary exports
   - Test suites in `functions/tests/` and `tests/`
