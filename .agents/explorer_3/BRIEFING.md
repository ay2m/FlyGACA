# BRIEFING — 2026-08-16T20:44:00Z

## Mission
Explore the Fly GACA codebase and design the complete mathematical specifications, pure calculation modules, backend aggregation engine, and test suites for the 5-Factor Customer Health Score (H) and Cadet Mock Exam Pass Probability (P) engine.

## 🔒 My Identity
- Archetype: Explorer 3 / Spec Miner
- Roles: Cohort Analytics & Mathematical Engine Specialist
- Working directory: /Users/ad/Documents/GitHub/FlyGACA-app/.agents/explorer_3
- Original parent: c70fb6dd-6c91-44fe-b0c1-e1c82a7bfeda
- Milestone: ATO Admin & Cohort Analytics Engine Design (R3)

## 🔒 Key Constraints
- Pure calculation modules in `src/calc/` must be 100% DOM-free, UI-free, and I/O-free for universal testability.
- Cloud Functions core logic in `functions/src/` must follow repo convention ("every business rule lives in a pure `*-core.ts`").
- Eliminate N+1 Firestore read bottlenecks by designing pre-aggregated cohort summaries under `schools/{schoolId}/analytics/summary`.
- Strictly adhere to GACA aviation regulatory standards (75% pass threshold, AIP/GACAR banks).
- Comply with KSA PDPL data residency and consent isolation (`me-central2` region, consent-aware masking).

## Current Parent
- Conversation ID: c70fb6dd-6c91-44fe-b0c1-e1c82a7bfeda
- Updated: 2026-08-16T20:44:00Z

## Task Summary
- **What to build/design**: 5-Factor Customer Health Score ($H$) and Cadet Mock Exam Pass Probability ($P$) engine with pre-aggregated cohort summary generator.
- **Success criteria**: Complete mathematical formulations, explicit equations, parameter weights, TypeScript interface contracts, edge case definitions, and unit test specifications.
- **Artifact Index**:
  - `.agents/explorer_3/handoff.md` — Comprehensive mathematical specification & engine architecture report.
  - `.agents/explorer_3/progress.md` — Liveness & progress tracking.
