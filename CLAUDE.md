# CLAUDE.md — ay2m/FlyGACA

Guidance for Claude Code in the FlyGACA product repo (React 19 web app + Express backend).

## Repository Context

**ay2m/FlyGACA** is the Fly GACA product codebase:
- **Frontend:** React 19 + Vite, bilingual (EN/AR), RTL-aware, TypeScript strict, CSS Modules with design tokens
- **Backend:** Express 5, Cloud Run (me-central2 Dammam), PostgreSQL, forward-only migrations, HttpOnly JWT
- **Content:** Regulatory corpus (GACAR), learner data pipeline, flight-hour tracking, PDPL-compliant audit trail

Governance, strategy, financial, legal, and HR material live in the separate `ay2m/Office` repo — not here.

## Shared Agents (from ay2m/Office)

All agents below are defined in `ay2m/Office/.claude/agents/` and available to this repo via the family contract
(`contracts/flygaca-family.json`, byte-identical across ay2m/Office, ay2m/FlyGACA, ay2m/Captain-Adel).

### Product Engineering Agents

| Agent | Use it for | Tools |
| --- | --- | --- |
| `react-19-architect` | React 19, Vite, TypeScript strict, RTL/i18n, component design, performance optimization | Read, Grep, Bash |
| `express-backend-pro` | Express 5 API design, Cloud Run deployment, security (parameterized queries, HttpOnly JWT, me-central2 data residency) | Read, Grep, Bash |
| `regulatory-corpus-keeper` | GACAR indexing, corpus policy (3 tiers), AIRAC freshness (28d + 7d buffer), citation verification | Read, Grep, Bash |
| `sql-migrator` | PostgreSQL schema design, forward-only migrations, index optimization, immutable audit trail | Read, Grep, Bash |
| `genkit-rag-specialist` | Gemini integration, RAG pipeline, Captain Adel grounding, inference safety (US/EU risk documented) | Read, Grep, Bash |

### Cross-Repo Coordination Agents

| Agent | Use it for | Tools |
| --- | --- | --- |
| `operations-orchestrator` | Routes full-sync, feature-ship, compliance-audit, security-hardening, performance-sprint workflows | Read, Edit, Glob, Grep, Bash |
| `cross-repo-sync` | Verifies `contracts/flygaca-family.json` parity across three repos, synchronizes PRs | Read, Edit, Bash |
| `entity-facts-guardian` | Company facts consistency, IBAN/account protection in family contract | Read, Glob, Grep, Bash |

### Governance & Compliance Agents

| Agent | Use it for | Tools |
| --- | --- | --- |
| `ksa-compliance` | PDPL, ZATCA, data residency, breach procedures — for regulatory review before shipping | Read, Write, Edit, Glob, Grep, Bash |
| `family-warden` | Family contract byte-identity, repo roster, drift sweeps across three repos | Read, Edit, Glob, Grep, Bash |

## Workflows (from ay2m/Office/.claude/skills/operations/)

Triggered via slash commands from any repo; coordinate across all three:

| Workflow | Trigger | Participants | Purpose |
| --- | --- | --- | --- |
| `full-sync` | `/full-sync` (or weekly Sunday 18:00 UTC) | entity-facts-guardian, cross-repo-sync, governance-auditor | Verify Office ↔ FlyGACA ↔ Captain-Adel parity (entity facts, contract SHA, decision log) |
| `feature-ship` | `/feature-ship <name>` | react-19-architect, express-backend-pro, ksa-compliance, cross-repo-sync | Coordinate feature across all three repos — React, API, curriculum, docs, merge |
| `compliance-audit` | `/compliance-audit` (or quarterly) | ksa-compliance, flight-data-pipeline-engineer | PDPL check, ZATCA readiness, learner data audit, breach procedure |
| `security-hardening` | `/security-hardening` | react-19-architect, express-backend-pro, ksa-compliance | React XSS, API injection, data residency, PDPL boundaries |
| `performance-sprint` | `/perf-sprint` | react-19-architect, express-backend-pro, sql-migrator | Bundle size, API latency, database queries — optimization roadmap |

## Conventions & Constraints

### Data Residency & PDPL
- **Data residency:** `me-central2` Dammam only — never `me-central1` (Doha, not PDPL-safe)
- **Learner data:** Name, email, progress only. No passport, address, biometrics
- **Audit trail:** Immutable, encrypted at rest, includes who/what/when/why for all mutations
- **Gemini inference:** Outside Kingdom (US/EU) — **open risk**, documented in RAG spec, not hidden
- **Right to be forgotten:** Deletion procedure exists and tested

### Regulatory Corpus
- **GACAR alignment:** Every question cites GACAR section; never fabricate regulations
- **Corpus tiers:**
  - **HOST_SAFE_CORE:** Can appear on learning interface and exam (vetted, approved)
  - **HOST_ORIGINAL:** Can appear in study materials but not public (proprietary content)
  - **DO_NOT_HOST:** Cite only (external links, reference books, instructor notes)
- **AIRAC freshness:** Effective date + 28 days for content staleness; 7-day buffer for updates (35-day threshold)
- **Curriculum review:** Draft → SME review → Publish (three-step gate)

### API Security
- **Parameterized queries:** Always — no SQL concatenation
- **HttpOnly JWT:** Tokens never in localStorage or URLs, never bearer tokens in frontend
- **Server-owned entitlements:** Backend verifies access; frontend never trusts roles
- **Error responses:** Generic to client — no stack traces, SQL errors, file paths
- **CORS whitelist:** Specific domains, never `*`
- **Rate limiting:** Brute-force protection on auth endpoints

### React & Frontend
- **TypeScript strict:** No `any` types
- **RTL properties:** `margin-inline`, `padding-inline`, not `margin-left/right`
- **i18n hooks:** All user-facing strings via i18n, never hardcoded text
- **CSS Modules:** No inline styles; design tokens via CSS custom properties
- **Sensitive data:** Never in localStorage (tokens, credentials, PII)
- **No `dangerouslySetInnerHTML`:** All user input sanitized

### Family Contract & Cross-Repo Sync
- **Entity block** (Office owns): Legal name, founder, tax ID, domain, HQ region
- **Chat contract** (FlyGACA owns): API response shape both brains must honor
- **Repos block** (Office owns): Actual roster (supersedes any prose)
- **Byte-identical:** Same SHA256 committed to all three repos; `family-warden` enforces parity
- **IBAN/account rule:** **Never** in the manifest, only in Office's `company-facts.md` (checked by CI gate)

## When to Use Each Agent

- **Building a React component?** → `react-19-architect` for strict TS, RTL, i18n patterns
- **Adding an API endpoint?** → `express-backend-pro` for parameterized queries, security, me-central2 compliance
- **Indexing GACAR content?** → `regulatory-corpus-keeper` for citation verification, tier enforcement, AIRAC staleness
- **Database migration or query?** → `sql-migrator` for schema safety, forward-only migrations
- **Gemini/RAG integration?** → `genkit-rag-specialist` for grounding, inference safety, Captain Adel consistency
- **Cross-repo feature?** → `cross-repo-sync` + `operations-orchestrator` for three-way coordination
- **Regulatory compliance review?** → `ksa-compliance` before shipping sensitive changes
- **Family contract / entity facts parity?** → `family-warden` for drift sweeps
- **Automated workflows?** → `/full-sync`, `/feature-ship`, `/compliance-audit`, `/security-hardening`, `/perf-sprint`

## Repo Structure & CI

### Files in Scope
- `src/` — React components (Vite entry), TypeScript strict
- `server/` — Express backend (index.ts, routes, middleware)
- `corpus/` — Regulatory content (GACAR indexing, learner data pipeline)
- `migrations/` — PostgreSQL schemas (forward-only)
- Tests, linting, type-checking via `npm run`

### Files Out of Scope
- Governance, strategy, financial, legal, HR material → see `ay2m/Office`
- Captain Adel AI instructor → see `ay2m/Captain-Adel`

### CI Gates
- Linting & TypeScript strict mode (`npm run lint`, `npm run type-check`)
- Unit tests (`npm test`)
- Family contract parity (`tests/family-contract.test.ts`)

## See Also

- **Family context & strategy:** [`ay2m/Office/00-strategy/the-book-of-fly-gaca.html`](https://github.com/ay2m/Office/blob/main/00-strategy/the-book-of-fly-gaca.html)
- **Regulatory corpus & GACAR spec:** [`ay2m/Office/10-academy-curriculum/`](https://github.com/ay2m/Office/blob/main/10-academy-curriculum/)
- **Compliance & PDPL:** [`ay2m/Office/04-compliance-ksa/`](https://github.com/ay2m/Office/blob/main/04-compliance-ksa/)
- **Agent workforce plan:** [`ay2m/Office/06-operations-it/agent-workforce-plan.md`](https://github.com/ay2m/Office/blob/main/06-operations-it/agent-workforce-plan.md)
- **Family contract:** [`ay2m/Office/contracts/flygaca-family.json`](https://github.com/ay2m/Office/blob/main/contracts/flygaca-family.json)
