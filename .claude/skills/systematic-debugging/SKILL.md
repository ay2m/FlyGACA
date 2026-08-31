---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior in FlyGACA — client (src/), server (server/), calc modules, or the corpus/RAG pipeline — before proposing fixes.
---

# Systematic Debugging

**Core principle:** find the root cause before attempting a fix. Symptom fixes are failure — especially in a codebase with mirrored logic between `src/calc/` and `server/src/*-core.ts`, where a "fix" applied to only one side reintroduces the bug as drift.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

## When to use

Any bug, failing test, unexpected UI behavior, build failure, or a `verify`/CI failure. Use it *especially* under time pressure — guessing is what produces the second bug on top of the first.

## The four phases

### Phase 1 — Root cause investigation

1. **Read the error completely.** Stack trace, file path, line number — FlyGACA's server routes return generic errors to the client by design (see `CLAUDE.md` — no stack traces, SQL errors, or file paths to the client), so the real error is almost always only in the server log, not the response body.
2. **Reproduce consistently.** Exact repro steps — via `npm run test`, `npm run server:test`, or the `run-flygaca` skill's driver (`node .claude/skills/run-flygaca/driver.mjs`) for anything UI-shaped. If it won't reproduce, gather more evidence before guessing.
3. **Check recent changes** — `git diff`, recent commits, new dependencies.
4. **Check for client/server mirror-drift first** if the bug involves a calculator or policy value: compare `src/calc/<x>.ts` against `server/src/<x>-core.ts` (or the reverse). A large share of "the API and the UI disagree" bugs in this repo are exactly this — one side updated, the other not. Also check bilingual drift: does `en.json` behave differently than `ar.json` for the same key, or does an RTL layout diverge only under `dir="rtl"`?
5. **Trace data flow** for anything deep in a call stack — find where the bad value originates, not just where it surfaces.

### Phase 2 — Pattern analysis

Find a working example of the same pattern elsewhere in the repo (there are 25 domain agents in `.claude/agents/` describing where each pattern lives — e.g. `flygaca-calc-engineer` for calculator modules, `flygaca-backend` for `*-core.ts`). Read it completely, then list every difference between it and the broken code.

### Phase 3 — Hypothesis and testing

State one hypothesis ("I think X is the root cause because Y"), make the smallest possible change to test it, and verify before continuing. Don't stack a second fix on top of an unconfirmed first one.

### Phase 4 — Implementation

1. Write a failing test first (vitest for client/calc/server logic, Playwright in `e2e/` for user flows) — see the `flygaca-test-writer` agent.
2. Implement the single, minimal fix for the root cause. No bundled refactoring.
3. Verify with the `verification-before-completion` skill before claiming the bug is fixed.
4. **If a fix doesn't work, don't try a fourth variation blind.** After 2 failed attempts, stop and reconsider whether the architecture (not the code) is wrong — for example, whether client/server duplication of a policy value should instead be a shared source of truth.

## Red flags — stop and return to Phase 1

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- Proposing a fix before reproducing the issue
- Each attempted fix reveals a new problem somewhere else (this means the *architecture* is the bug, not the code)

## Quick reference

| Phase | Key activity | Success criteria |
|---|---|---|
| 1. Root cause | Read errors, reproduce, check mirror-drift (client/server, EN/AR) | Understand WHAT and WHY |
| 2. Pattern | Find a working example in the repo, diff against it | Every difference identified |
| 3. Hypothesis | One theory, smallest possible test | Confirmed or replaced |
| 4. Implementation | Failing test → minimal fix → verify | Bug resolved, `npm run verify` clean |

---
Adapted from [obra/superpowers](https://github.com/obra/superpowers) (`skills/systematic-debugging`), MIT License, © 2025 Jesse Vincent. Trimmed to FlyGACA's client/server mirror architecture and testing tools; the original's multi-layer CI/signing example and standalone reference files were dropped as not applicable here.
