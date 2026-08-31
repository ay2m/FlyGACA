---
name: verification-before-completion
description: Use before claiming FlyGACA work is complete, fixed, or passing — before committing or opening a PR. Requires running the repo's actual verification commands and reading their output, not assuming success.
---

# Verification Before Completion

**Core principle:** evidence before claims, always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the command in this session and read its output, you cannot claim it passes.

## The gate function

```
BEFORE claiming any status ("tests pass", "build works", "fixed"):

1. IDENTIFY which FlyGACA command actually proves the claim (table below)
2. RUN the full command — not a subset, not a partial rerun
3. READ the full output: exit code, failure count, the actual assertion
4. Does the output confirm the claim?
   - NO  → state the real status, with the evidence
   - YES → state the claim WITH the evidence
```

## What proves what, in this repo

| Claim | Command | Not sufficient |
|---|---|---|
| Client unit tests pass | `npm test` (213 files / ~1488 tests) | "should pass now" |
| Server unit tests pass | `npm run server:test` (24 files / 245 tests) | client tests passing |
| Types are sound | `npm run typecheck` | editor showing no red squiggles |
| Lint is clean | `npm run lint` | typecheck passing |
| Formatting is clean | `npm run format:check` | "I ran prettier once" |
| Production build succeeds | `npm run build` (sitemap → tsc -b → vite build → prerender → JSON-LD checks) | dev server running fine |
| Bundle stays in budget | `npm run check:bundle` (189 kB gz total / 140 kB per chunk) | build succeeding alone |
| Perf budget holds | `npm run check:perf` | — |
| Everything above, in one gate | `npm run verify` | any subset of the above |
| A UI flow actually works | `run-flygaca` skill's driver / smoke checks, or `npm run test:e2e` | reading the component and reasoning it should work |
| A bug is actually fixed | Reproduce the original symptom, then show it's gone | "the code change looks right" |
| An agent's delegated work is done | Check the actual VCS diff | trusting the agent's own summary |

`npm run verify` is the full gate (typecheck + lint + format:check + test + build + bundle + perf budgets) — run it, not a hand-picked subset, before claiming a change is ready to commit or before opening a PR.

## Red flags — stop

- Words like "should", "probably", "seems to work"
- Satisfaction ("Great!", "Done!", "That fixes it!") before the command has actually run in this turn
- About to commit, push, or open a PR without having run `npm run verify` (or the relevant slice of it) fresh
- Trusting a subagent's own "success" report instead of checking its diff
- "The linter passed" standing in for "the build passes" — they check different things

## Regression tests: red-green, not just green

When adding a regression test for a bug: write the test, confirm it fails against the buggy code, apply the fix, confirm it now passes. A test that has only ever been run once (green) proves nothing about whether it actually exercises the bug.

## When to apply

Always, before: any completion claim, any commit, any PR, moving to the next task, or reporting a delegated agent's work as done.

---
Adapted from [obra/superpowers](https://github.com/obra/superpowers) (`skills/verification-before-completion`), MIT License, © 2025 Jesse Vincent. The generic command table was replaced with FlyGACA's actual `npm run` scripts (`verify`, `test`, `server:test`, `check:bundle`, `check:perf`, the `run-flygaca` driver) so the gate points at commands that exist in this repo.
