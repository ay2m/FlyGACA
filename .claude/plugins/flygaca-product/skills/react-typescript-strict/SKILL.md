---
name: react-typescript-strict
description: The procedure for adding or changing a React surface in src/ so it passes typecheck, i18n parity, RTL, token and bundle gates first time. Use when writing a component, page or calculator, and when npm run verify fails on typecheck, lint, i18n-parity or check:bundle.
---

# Adding a React surface that passes the gates

Role context — how `src/` is laid out and why — belongs to the `react-surface`
agent. This is the checklist for getting a change through the gates.

## What "strict" actually means here

`config/tsconfig.app.json` (which the root `tsconfig.app.json` only extends)
turns on `strict`, **plus** four flags that reject code TypeScript would
otherwise accept:

| Flag | What it rejects |
| --- | --- |
| `noUnusedLocals` / `noUnusedParameters` | An unused import or a signature parameter you kept "for symmetry" |
| `noFallthroughCasesInSwitch` | A `case` without `break`/`return` |
| `verbatimModuleSyntax` | A type-only import written as a value import — use `import type { … }` |
| `noUncheckedSideEffectImports` | A bare `import './x'` that resolves to nothing |

Path alias is `@/*` → `./src/*`. `noEmit` is on: `npm run typecheck` is
`tsc -b --noEmit` and is the only thing that typechecks — Vite does not.

## The order that saves a rebuild

1. **Write the key in both bundles first.** `src/i18n/en.json` *and*
   `src/i18n/ar.json`. `tests/i18n-parity.test.ts` fails on a key present in
   one bundle only, so English-now-Arabic-later is a red build, not a follow-up.
2. **Take colours from `src/styles/tokens.css`.** Never a literal hex.
3. **Write logical properties only** — `margin-inline`, `padding-inline`,
   `inset-inline-start`. A physical `left`/`right` is what breaks the `/ar`
   tree, and every route has an `/ar/…` twin.
4. **Put input state in the URL.** Any page with numeric inputs uses
   `useNumericInputs`; string-only pages use raw `useUrlState`. `CalcShell`
   renders a copy-link button unconditionally, so inputs held in `useState`
   hand out blank links — this is a correctness bug, not a style preference.
5. **Reuse the frame.** `CalcShell`, then `FieldGrid` / `OutputGrid` /
   `ResultStat` and the `NumberField` / `SelectField` / `TextField` primitives
   from `src/components/calc/`. Whole-number output goes through `fmtInt`.
   Crosswind is the reference implementation; its bespoke layout is the one
   sanctioned exception.
6. **Use `<Disclaimer />`.** Never inline or reword the not-affiliated text.
7. **Mirror motion tokens.** `framer-motion` values must match
   `src/components/bento/motion.ts` — `tests/bento-motion-parity.test.ts`
   fails the build on drift. Respect `usePrefersReducedMotion`.

## Gate order and what each one catches

```
npm run verify
# typecheck → lint → format:check → test → build → check:bundle → check:perf
```

- `check:bundle` — initial gzipped JS budget.
- `check:perf` — per-chunk and total footprint; this is the one that catches a
  lazy route chunk ballooning, and `check:bundle` passing does not imply it.

Run the whole chain. If a gate could not run, name it and say why — never imply
a gate passed that you skipped.

## Two things that are not yours to grant

`entitlement` is read **only to gate UI**. `features.ts`
(`FEATURE_PLAN` / `useFeature`) decides which plan unlocks what; packs go
through `packEntitlements.ts`. Enforcement is the gateway's job — the app never
grants.

Never commit `public/sitemap.xml` or `public/robots.txt`; both are generated and
git-ignored.
