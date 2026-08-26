# Project subagents

Claude Code loads every `*.md` here as a project-scoped subagent (see
[the subagent docs](https://code.claude.com/docs/en/sub-agents)). They are
checked in so every session works from the same rules — the ones that keep an
assistant which *refuses rather than guesses* actually behaving that way.

| Agent | Use it for |
| --- | --- |
| `schools-product-champion` | Schools-channel product excellence — instructor dashboard, cohort readiness metrics, pilot onboarding UX, seat provisioning, bilingual readiness. |
| `defensible-differentiation` | Consumer positioning, cited answers, AIRAC freshness, RTL parity, competitive wedges. |

What these encode that a generic agent cannot know: that pilot onboarding
friction kills deals (targeting <2 min per gate); that cohort readiness
(diagnostic → benchmark delta, >15pp uplift) is the retention metric that
closes the deal; that every exam question must cite GACAR by property or
it's a regression; that the instructor dashboard is Schools-only infrastructure
competitors cannot replicate quickly; that NTSB↔GACAR cross-links and
bilingual RTL parity are 6–12 month barriers; that mock exam performance
is both a consumer engagement metric and a Schools ROI signal; and that
pricing credibility depends on maintaining the product claims that justify it.

## Conventions

- `name` matches the filename; lowercase and hyphens only.
- `description` says **when to delegate**, in task language.
- `model` is omitted so each agent inherits the session's model.
- Every agent's closing instruction is to state which gate it ran and which it
  skipped, and to run `npm test` to confirm no regressions in Schools or 
  consumer features.
