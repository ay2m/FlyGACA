---
description: Add a flight-calculator tool end to end — registry, pure math, page, i18n, route
argument-hint: <tool-id> [category]
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

Add the tool `$1` to the catalog, following the repo's established path. All 55
catalog tools are live, so the registry's `status` union is currently just
`'live'` — only re-widen it to `'soon' | 'live'` if this tool genuinely ships
staged.

Work in this order, and do not skip a step because it looks cosmetic:

1. **Register it** in `src/lib/tools.ts` — the typed catalog registry and single
   source of truth. It holds **structure only**: route, category, status,
   keywords. Names, blurbs and category labels resolve from i18n by id.
2. **Lift the math** into `src/calc/$1.ts` — pure, DOM-free, i18n-free, flat at
   the `src/calc/` root (aviation tool math never goes in a subfolder). Use the
   shared guards `fin` · `ok` · `norm360` from `@/calc/guards`; never write a
   local copy. Add a Vitest spec next to the suite in `tests/`.
3. **Build the page** under `src/pages/tools/<category>/` — the folder must
   match the registry's `category` (only `ToolsIndex` stays at the `tools/`
   root). Use `CalcShell` plus `useNumericInputs` (or `useUrlState` for a
   string-only tool), and `FieldGrid` / `OutputGrid` / `ResultStat` for layout.
   Read `src/pages/tools/**/Crosswind*` first — crosswind is the reference
   implementation, and its diagram-beside-inputs layout is the *one* sanctioned
   exception to `FieldGrid`.
4. **Both i18n bundles** — `src/i18n/en.json` and `src/i18n/ar.json`, same keys.
   English-only fails `tests/i18n-parity.test.ts`.
5. **Register the route** in `src/router.tsx`. Remember the tree is re-mounted
   under `/ar`, so this gives you two URLs.
6. **Verify**: `npm run verify`, then `npm run check:jsonld` — a content route
   with no managed JSON-LD node fails the gate.

Non-negotiables while you work: tokens only, logical properties only, the
`<Disclaimer />` component verbatim, and inputs in the URL so `CalcShell`'s
copy-link button hands out a real link.
