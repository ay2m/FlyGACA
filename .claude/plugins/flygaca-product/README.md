# `flygaca-product` — Fly GACA product-engineering plugin

A Claude Code plugin that packages the engineering knowledge of `ay2m/FlyGACA`
into agents and commands, so a session in this repo — or any session that
installs it — starts with the invariants already loaded.

It is distributed through the family marketplace in
[`ay2m/Office`](https://github.com/ay2m/Office), which points at this
directory with a `git-subdir` source.

## Install

```
/plugin marketplace add ay2m/Office
/plugin install flygaca-product@flygaca-family
```

## What's in it

**Agents** (delegate with the Agent tool, or let Claude pick them):

| Agent | Owns |
| --- | --- |
| `react-surface` | `src/` — routes, pages, calculators, bento home, i18n/RTL, tokens, bundle budgets |
| `express-api` | `server/src` — routers, the pure `*-core` policy modules, sessions, billing, quota |
| `corpus-pipeline` | `public/data`, `content/regulations`, `scripts/` — the corpus and everything that builds it |
| `sql-schema` | `server/migrations`, `store.ts`, `db.ts`, the pgvector schema |
| `rag-grounding` | The Captain Adel flow — retrieval, the model client, grounding verdicts, the chat contract |

**Commands** (namespaced `/flygaca-product:<name>` once installed):

| Command | Does |
| --- | --- |
| `/verify` | Runs the real gates in order — web, server, and the boundary checks — and reports what actually ran |
| `/server-gate` | The `server/` package gate on its own, because root `verify` does not cover it |
| `/new-tool` | Adds a catalog tool end to end: registry → pure math → page → both i18n bundles → route |
| `/family-contract` | Changes `contracts/flygaca-family.json` the only way that passes all three repos' gates |

## What it deliberately does not duplicate

`.claude/skills/run-flygaca/` stays a **project skill** in this repo — it is
loaded automatically for sessions here and does not need packaging. The plugin
carries the knowledge that a session outside this checkout would otherwise
lack.

## Editing it

Agent and command files are plain Markdown with YAML front-matter. Keep the
`name` matching the filename, keep `description` written in task language ("use
proactively when…"), and omit `model` so each agent inherits the session's.
Bump `version` in `.claude-plugin/plugin.json` when you change behaviour.

Ground every claim in `CLAUDE.md` at the repo root — it is the authority on how
the system works today, and several older docs in `docs/` describe the
pre-Cloud-Run stack.
