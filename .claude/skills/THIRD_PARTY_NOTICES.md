# Third-Party Notices — vendored Claude Code skills

This directory contains skills vendored from third-party, community-maintained sources. They are
developer tooling for Claude Code only; they are not part of any shipped product and are never
served to end users.

## Vendored Skills

### Context7 (Upstash)

- **Project:** Context7 — live documentation and API lookup for 1000+ libraries
- **Author:** Upstash
- **Source:** https://github.com/upstash/context7
- **License:** MIT (upstream `LICENSE` retained)
- **Pinned upstream commit:** Latest (no pin — uses `npx ctx7@latest`)
- **Skill:** `find-docs` — retrieve current documentation, API references, and code examples for any developer technology

### Superpowers (Jesse Vincent)

- **Project:** Superpowers — AI-native workflow orchestration for Claude Code
- **Author:** Jesse Vincent (@obra)
- **Source:** https://github.com/obra/superpowers
- **License:** MIT (upstream `LICENSE` retained)
- **Pinned upstream commit:** Latest
- **Skills vendored:**
  - `dispatching-parallel-agents` — coordinate multiple independent subagent tasks
  - (Captain-Adel also vendors: `executing-plans` — execute composed multi-step plans)
  - (Office also vendors: `writing-plans` — structure proposals and strategy docs)

### Claude-Mem (Mark Thibault)

- **Project:** Claude-Mem — persistent memory and context management for Claude Code sessions
- **Author:** Mark Thibault (@thedotmack)
- **Source:** https://github.com/thedotmack/claude-mem
- **License:** Apache License 2.0 (upstream `LICENSE` retained)
- **Pinned upstream commit:** Latest
- **Skills vendored:**
  - `mem-search` — search memory index for context and prior work
  - (Office also vendors: `mem-setup` — configure cloud sync credentials)

## What was intentionally omitted

For each vendored skill, only `SKILL.md`, `references/**`, and the upstream `LICENSE` were copied.
Bundled `scripts/`, `assets/`, and plugin manifests were omitted to avoid introducing unreviewed
third-party executables. If a skill workflow refers to a helper script, consult the upstream
repository.

## Registration as marketplaces

Additionally, this repo's `.claude/settings.json` registers the following sources as **known
marketplaces**, allowing on-demand installation of the full skill set:

- `upstash/context7` — 4 skills (library docs lookup)
- `obra/superpowers` — 12+ workflow and agent skills
- `thedotmack/claude-mem` — memory, learning, and context management skills

## License compliance

All vendored skills and their upstream sources are permissively licensed (MIT or Apache 2.0),
permitting commercial use, modification, and redistribution with attribution. This repo retains
the upstream `LICENSE` file in each skill directory.
