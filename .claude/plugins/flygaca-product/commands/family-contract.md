---
description: Change contracts/flygaca-family.json correctly — three repos, one revision
argument-hint: [what changed]
allowed-tools:
  - Read
  - Edit
  - Bash
  - Glob
  - Grep
---

`contracts/flygaca-family.json` is committed **byte-identically** to
`ay2m/FlyGACA`, `ay2m/Captain-Adel` and `ay2m/Office`. It exists because the
family's cross-repo claims used to live only in prose and drifted without
anything failing.

## Who owns what

| Block | Owner | Source of truth |
| --- | --- | --- |
| `chat` | **this repo** | `server/src/contract.ts` |
| `entity` | `ay2m/Office` | `01-governance/company-facts.md` |
| `repos` | `ay2m/Office` | its `CLAUDE.md` repo table |

We are a **consumer** of `entity`: the legal name, CR and VAT number must keep
appearing verbatim in `src/lib/seo/jsonld.ts` and in `footer.legalEntity` +
`legal.*` in **both** i18n bundles. Do not edit the `entity` or `repos` blocks
here — fix them in `ay2m/Office` and mirror.

## The sequence (all of it, or none)

1. Edit the **owning** repo's copy.
2. Bump `version`.
3. Re-stamp the self-hash with Office's
   `node tools/contracts/stamp-manifest.mjs contracts/flygaca-family.json`.
   Editing without re-stamping fails every repo's gate immediately.
4. Copy the file **verbatim** into the other two repos.
5. Open all three PRs together.

## Gates

- Here: `tests/family-contract.test.ts` (inside `npm test`, so inside
  `npm run verify` and CI) — asserts both directions and the self-hash.
- `ay2m/Captain-Adel`: `test/family-contract.test.js`.
- `ay2m/Office`: `node tools/print/check-facts.mjs`, which also asserts the IBAN
  and account number are **absent** from the manifest, since it travels to both
  product repos.

Known limitation: nothing offline proves the three copies are the same revision.
`version` and `sha` reduce that to a visible one-line diff — which is why the
three PRs go up together, not one now and two later.

Context for this change: `$ARGUMENTS`
