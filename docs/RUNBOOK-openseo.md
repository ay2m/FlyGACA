# RUNBOOK — OpenSEO (keyword/rank/audit tooling for flygaca.com)

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

[OpenSEO](https://github.com/every-app/open-seo) (MIT) is a self-hostable SEO analytics app —
keyword research, rank tracking, competitor insights, backlinks, site audits and AI-visibility —
that ships an **MCP server** so an AI agent (Claude Code) can read its data and turn findings into
changes in this repo.

It is **not a library** — nothing is added to the Fly GACA bundle. OpenSEO runs as its **own
Cloudflare Worker**, points at **flygaca.com**, and we wire its MCP server into this repo. It is the
"content + keyword" growth lever that `docs/seo/technical-audit.md` identifies now that the technical
SEO is essentially complete.

> **Why this exists separately from `RUNBOOK-deploy.md`:** that runbook deploys the Fly GACA SPA to
> **Firebase Hosting**, the single serving front (the Vercel / Cloudflare / Netlify mirrors were
> removed in 2026-08). OpenSEO is an unrelated third-party app on its **own** Cloudflare Worker, in
> your own Cloudflare account — keep it out of this repo's `firebase.json` and `deploy.yml`, and do
> not let it become a reason to reintroduce a second build-and-serve front here.

## Cost & prerequisites

| Thing | Cost | Notes |
| --- | --- | --- |
| OpenSEO app | $0 | MIT, self-hosted on the Cloudflare Workers **free** plan |
| `DATAFORSEO_API_KEY` | **paid** | OpenSEO fetches all live data via [DataForSEO](https://dataforseo.com) — $1 free credit, $50 min top-up. **Deferred** (see Phase 4). |
| Cloudflare account | $0 | Needed only to host OpenSEO itself; this repo no longer deploys anything to Cloudflare |

**Secrets never enter this repo.** The DataForSEO key and the OpenSEO MCP auth token live only in the
Cloudflare Worker env and in local/session Claude settings — exactly like the `VITE_*` build secrets
in `RUNBOOK-deploy.md`. `.mcp.json` references the token by env var, never a literal.

---

## Phase 1 — Deploy OpenSEO to Cloudflare Workers _(owner action; free)_

1. From the [OpenSEO repo](https://github.com/every-app/open-seo), follow
   `docs/SELF_HOSTING_CLOUDFLARE.md` (the one-click **Deploy to Cloudflare** button works on the free
   plan). This creates a **new Worker** in your Cloudflare account, separate from `flygaca-app`.
2. **Leave `DATAFORSEO_API_KEY` unset for now.** The app runs and the UI loads; data-fetching tools
   stay idle until the key is added (Phase 4).
3. In the running app, open **"AI & Agents"** in the header and copy the **MCP endpoint URL** and the
   **auth token** it shows. Hand both back so Phase 2 can wire them in.

> Docker is the alternative (`cp .env.example .env` → set the key → `docker compose up -d` →
> `http://localhost:3001`), but it's **local-only with no auth**, so its MCP server is not reachable
> from a remote/web Claude Code session. Cloudflare is the chosen host for that reason.

## Phase 2 — Wire the OpenSEO MCP into Claude Code _(in-repo)_

Add an `open-seo` server next to the existing `context7` entry in **`.mcp.json`**. Use the remote
HTTP transport and pull the token from an env var (Claude Code expands `${VAR}`), so no secret is
committed:

```json
{
  "mcpServers": {
    "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp"] },
    "open-seo": {
      "type": "http",
      "url": "https://<openseo-worker-subdomain>.workers.dev/mcp",
      "headers": { "Authorization": "Bearer ${OPENSEO_MCP_TOKEN}" }
    }
  }
}
```

- Replace `<openseo-worker-subdomain>` (and the `/mcp` path if it differs) with the URL from the
  "AI & Agents" page.
- Provide `OPENSEO_MCP_TOKEN` via the environment / local Claude settings — **do not** paste the
  literal token into `.mcp.json`.
- This edit is intentionally **held until the deployed URL + token exist**, so the shared `.mcp.json`
  never ships a server that fails to connect.

_Optional:_ install OpenSEO's agent skills into `.claude/skills/` (per
<https://openseo.so/docs/skills/setup>) so the workflows are reproducible across sessions:
`seo-project-setup`, `seo-coach`, `keyword-research`, `keyword-clustering`, `competitive-landscape`,
`competitor-analysis`, `link-prospecting`. Commit **skill files only** — never keys.

**Verify:** the `open-seo` server appears in the agent's tool list and its tools resolve against the
Cloudflare URL. Without a DataForSEO key they return empty/error — that is the **expected** Phase-2
state, not a misconfiguration.

## Phase 3 — Free validation of flygaca.com _(no DataForSEO key required)_

Re-confirm the technical SEO shipped in PR #171 is live and correct. None of this needs OpenSEO data,
so it can run before the key is added — but it **does need network egress to `flygaca.com`**, so run
it from a machine/session that can reach the site (a locked-down agent egress policy will 403 these
fetches; that is a network-policy limit, not a site problem).

Checklist (record results in `docs/seo/technical-audit.md` under a dated heading):

```bash
# Sitemap reachable and complete (~529 URLs after #171: +121 aerodromes, +6 packs)
curl -s https://flygaca.com/sitemap.xml | grep -c '<loc>'
curl -s https://flygaca.com/sitemap.xml | grep -c '/tools/aerodromes/'   # expect 121
curl -s https://flygaca.com/sitemap.xml | grep -c '/study/packs/'        # expect 6
curl -s https://flygaca.com/robots.txt                                   # Allow: / + Sitemap line
```

- **Per-route head:** on a library doc, a guide, a tool and an aerodrome page confirm a unique
  `<title>`, meta description, `rel=canonical`, the `en`/`ar`/`x-default` hreflang set, and
  `og:type=article` on docs/guides.
- **Structured data:** run Google's [Rich Results Test](https://search.google.com/test/rich-results)
  on a library doc (`TechArticle` + `dateModified`), a study page (`Course`), an aerodrome
  (`Airport`), and the Library/Packs hubs (`ItemList`).
- **noindex:** confirm the 404 and the account routes (`/account`, `/dashboard`, `/currency`,
  `/logbook`, `/records`, `/settings`) emit `<meta name="robots" content="noindex, follow">` and are
  **absent** from the sitemap.
- **Core Web Vitals:** read them from the already-integrated Vercel Speed Insights, or PageSpeed
  Insights.

OpenSEO's own **site audit** (Phase 4 tooling) can later automate much of this, but the checks above
are the free baseline. File any concrete defect as a small follow-up fix and re-run `npm run verify`.

## Phase 4 — Keyword / competitor / rank research _(unlocks when the DataForSEO key is added)_

1. Add `DATAFORSEO_API_KEY` to the OpenSEO Cloudflare Worker (Workers → Settings → Variables).
2. Create the **SEO project for flygaca.com** (`seo-project-setup`).
3. Run, via the MCP tools / skills:
   - `keyword-research` + `keyword-clustering` for the GACAR / Saudi-aviation niche (licensing,
     medical, airspace, GACAR Parts, aerodromes, ground school).
   - `competitor-analysis` / `competitive-landscape`.
   - **Rank tracking** + **AI-visibility** monitoring for the target clusters.
4. Write findings into `docs/seo/keyword-research.md` and `docs/seo/strategy.md`, then translate the
   top clusters into app changes:
   - Refined target-keyword titles/descriptions through the existing `usePageMeta(...)` calls
     (`src/hooks/usePageMeta.ts`; copy lives in `src/i18n/{en,ar}.json` under `meta.*` / `metaDesc.*`).
   - New **bilingual** content guides via the repo's existing flow (`docs/GUIDE_AUTHORING.md` +
     `scripts/new-guide.mjs`), interlinking the library Parts and tools.
   - Keep `npm run verify` green and i18n parity intact (`tests/integrity/i18n-parity.test.ts`).

---

## Division of labor

| Owner action (outside the repo) | Agent action (in the repo) |
| --- | --- |
| Deploy the OpenSEO Cloudflare Worker (Phase 1) | Wire `.mcp.json` once the URL + token are returned (Phase 2) |
| Later: add `DATAFORSEO_API_KEY` (Phase 4) | Write/maintain this runbook; optionally add skills |
| Hand back the MCP URL + token | Run Phase-3 validation (from a network-enabled session); log findings |
| | Turn Phase-4 research into `usePageMeta` / new-guide changes |

## Guardrails (recap)

- Secrets only in Cloudflare env / local Claude settings — `.mcp.json` uses `${OPENSEO_MCP_TOKEN}`.
- OpenSEO is a separate Worker in your own Cloudflare account; never entangle it with this repo's
  Firebase-only deploy path (`firebase.json`, `.github/workflows/deploy.yml`).
- Don't ship a placeholder `open-seo` entry in `.mcp.json` — add it only with the real URL + token.
