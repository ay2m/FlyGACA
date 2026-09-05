# Contributing to Fly GACA

Thanks for helping modernize Saudi general aviation. 🛫 This guide covers how to
get set up, the conventions the CI gate enforces, and how to land a change.

> [!IMPORTANT]
> **Fly GACA is not affiliated with GACA.** The product helps you *find and study*
> regulation — it never replaces it. Every user-facing surface stays independent,
> cites the exact GACAR Part/section, and reminds readers to verify against the
> latest official GACA publication. Keep that true in anything you contribute, and
> never fabricate a citation.

## Where things live

`CLAUDE.md` is the fullest map of the codebase (architecture, routing, i18n,
calculators, the `functions/` backend, deploy). Skim it before a non-trivial
change. Also useful: [`README.md`](README.md) (getting started),
[`ROADMAP.md`](ROADMAP.md) (what's planned), [`GUIDE_AUTHORING.md`](GUIDE_AUTHORING.md)
(learn content), and [`FIGMA_DESIGN_SYSTEM.md`](FIGMA_DESIGN_SYSTEM.md) (design tokens).

## Prerequisites

- **Node.js** `20` (matches CI)
- **npm** `>= 10`

## Getting started

```bash
git clone https://github.com/ay2m/FlyGACA.git
cd FlyGACA
npm install
cp .env.example .env.local   # optional — the app runs local-first without an API
npm run dev                  # http://localhost:5173
```

Without `VITE_API_BASE_URL` set, the app runs **local-first**: the corpus, tools,
and ground school all work offline; only backend features (Captain Adel AI, sync,
billing) stay dark.

## The one gate: `npm run verify`

Run this before every commit — it chains the same steps CI runs:

```bash
npm run verify
# typecheck → lint → format:check → test → build → check:bundle → check:perf
```

A green local `verify` means a green CI. `check:bundle` fails if the initial
gzipped JS exceeds its budget; `check:perf` gates every emitted chunk. If you add
formatting-worthy files, `npm run format` fixes them.

> [!NOTE]
> **`functions/` is its own npm package with its own CI gate** — root `verify`
> does not cover it. If you touch `functions/`, also run
> `npm run lint && npm test && npm run build` **inside** `functions/`.

## Conventions the build enforces

These are checked mechanically — a PR that breaks one fails CI:

1. **Bilingual + RTL is first-class.** New copy → a key in **both**
   `src/i18n/en.json` **and** `src/i18n/ar.json`. `npm run test` fails on any key
   present in one language but not the other (`tests/i18n-parity.test.ts`). Arrays
   must be element-for-element parallel across locales.
2. **The disclaimer never drifts.** Use the `<Disclaimer />` component; do not
   inline or reword the not-affiliated / verify-against-GACA text.
3. **Tokens only / logical properties only.** No hard-coded colours; no physical
   `left`/`right` — use design tokens (`src/styles/tokens.css`) and CSS logical
   properties so RTL mirrors automatically.
4. **Never commit build output.** `dist/`, `public/sitemap.xml`, and
   `public/robots.txt` are generated and git-ignored — keep them that way.

Beyond the mechanical checks: keep pure logic in `src/calc/*` (DOM-free, i18n-free)
and add a Vitest spec for it, and match the surrounding code's style.

## Adding a tool or a guide

- **A flight tool:** register it in `src/lib/tools.ts` (the single source of truth),
  lift its math into `src/calc/<tool>.ts` with a Vitest spec, build the page under
  `src/pages/tools/<category>/` using `CalcShell`, add strings to both i18n bundles,
  and register the route in `src/router.tsx`. Crosswind is the reference
  implementation. See the "Adding a new tool" section of `CLAUDE.md`.
- **A guide:** run `npm run new:guide` and follow
  [`GUIDE_AUTHORING.md`](GUIDE_AUTHORING.md).

## Branch, commit, PR

1. **Branch** off `main` — `git checkout -b feature/short-description`.
2. **Commit** with a semantic message — `feat: …`, `fix: …`, `chore: …`,
   `content: …`, `docs: …`.
3. **Verify** — `npm run verify` (plus the `functions/` gate if relevant).
4. **Open a Pull Request.** The PR template mirrors the *What & why · Changes ·
   Verification* structure — fill it in, including the verification checklist.

Keep PRs focused — one roadmap item / concern per PR is easiest to review. Keep
your branch synced with `main`; see [`docs/MERGE-CONFLICTS.md`](docs/MERGE-CONFLICTS.md)
for resolving lockfile / i18n conflicts.

## Reporting bugs & requesting features

Open an issue using the **Bug report** or **Feature request** template. For wrong
or outdated regulatory content, name the Part/section and where the app shows it —
and remember GACA is always the authority.

## Security

**Do not open a public issue for a vulnerability.** Report it privately per
[`SECURITY.md`](SECURITY.md) (email `i@flygaca.com`, subject starting `[SECURITY]`).

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
