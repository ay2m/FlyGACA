# Launch Checklist — Google Cloud (me-central2)

**Rewritten:** 2026-08-31
**Status:** deploy path repaired; launch status unverified — see [Before you trust this](#before-you-trust-this)
**Authoritative runbooks:** [`RUNBOOK-deploy.md`](./RUNBOOK-deploy.md) (provision a project) →
[`RUNBOOK-golive.md`](./RUNBOOK-golive.md) (headers, corpus, pipeline, readiness). This file is the
short operational checklist that sits on top of them; where they disagree with this, they win.

---

## Before you trust this

This document previously described a **Firebase Hosting** deploy: a `deploy:firebase` script, a
`deploy-firebase.yml` workflow, and monitoring set up in the Firebase Console. None of that is the
production architecture, and the workflow it referred to no longer exists in the repo.

Production is **one GCP project in `me-central2` (Dammam) and nothing else** — the API on Cloud Run,
the SPA in a Cloud Storage bucket behind a global HTTPS load balancer, the corpus in its own bucket,
Cloud SQL for Postgres in the same region. Cloudflare, Netlify and Vercel configs remain in the repo
as **dormant mirrors**; nothing is deployed to them. In-Kingdom residency is the reason.

It also carried a "🚀 Ready for production" banner and pre-launch items ticked off against that
Firebase path. Those ticks are not evidence of anything about the current stack, so they are gone
rather than re-checked — nobody has verified them against GCP here. Confirm each one yourself before
relying on it.

---

## Pre-launch — verify, don't assume

- [ ] `main` is green in CI (`ci.yml`: frontend, server, e2e + a11y + perf)
- [ ] Project provisioned per `RUNBOOK-deploy.md` — APIs, Cloud SQL, OAuth client, Secret Manager,
      Cloud Run service, renewal job
- [ ] Security headers applied **per backend** on the load balancer (`RUNBOOK-golive.md` §2) —
      both the SPA backend bucket and the API backend service
- [ ] SPA built with `VITE_API_SAME_ORIGIN=1` (not `VITE_API_BASE_URL`) so the session cookie stays
      same-site and the CSP stays `connect-src 'self'`
- [ ] Full prerender ran with `PRERENDER_MAX=0` and `check:prerender:coverage` passed against the
      sitemap
- [ ] `api.flygaca.com` resolves to the same load balancer as a second host rule — the Moyasar
      webhook must hit it directly, since its HMAC is over raw request bytes and dies if a hop
      rewrites the body
- [ ] Repo vars set for the deploy workflow: `GCP_PROJECT_ID`, `WIF_PROVIDER`,
      `DEPLOY_SERVICE_ACCOUNT`, `WEB_BUCKET`, `DATA_BUCKET`, `URL_MAP`, `DATA_BASE_URL`,
      `MOYASAR_PUBLISHABLE_KEY`

Deploys are **manual**: `deploy.yml` has its `push` trigger commented out and runs on
`workflow_dispatch` only.

---

## Deploy

```bash
# API → Cloud Run (cloudbuild.yaml builds server/Dockerfile, then a new revision)
PROJECT_ID=… TAG=$(git rev-parse HEAD) npm run deploy:api

# SPA + corpus → Cloud Storage, Cache-Control stamped from config/headers.json
WEB_BUCKET=… DATA_BUCKET=… URL_MAP=… npm run deploy:web
```

Both accept `--dry-run`, which prints every `gcloud` command without running one. Use it first.

`deploy:api` defaults `REGION` to `me-central2`. It picks the Artifact Registry host, the Cloud Build
region and the Cloud Run region together, so overriding it moves learner data out of the Kingdom —
don't, outside a scratch project.

Security headers are **not** set by either script. Google applies them per backend:

```bash
HEADERS="$(npm run -s headers:gcloud)"
```

then feed `$HEADERS` to `--custom-response-headers` on each backend per `RUNBOOK-golive.md` §2.
`helmet()` in the API covers API responses only — miss this and the SPA ships with no CSP and no HSTS.

---

## Post-launch monitoring — GCP, not Firebase

Set these up in **Cloud Monitoring / Cloud Logging** in the production project.

**Uptime check** — `https://www.flygaca.com/`, 60s interval, 10s timeout, 3+ regions, wired to an
email notification channel.

**Alerting policy** — uptime failure (5+ consecutive), error rate > 5% over 5 min, p99 latency
> 3000 ms.

**Logs** — Cloud Logging on the `flygaca-api` Cloud Run service; start from `severity >= ERROR`.
Build a dashboard for request rate, latency and error distribution.

**Client analytics** — GA4 via `gtag` (`VITE_GA_MEASUREMENT_ID`). Firebase telemetry is inert
unless `VITE_FIREBASE_APP_ID` is set, by design (`src/lib/firebase-monitoring.ts`).

**Billing** — a budget with alerts at 50% / 90% / 100% on the GCP project.

---

## Key metrics (launch week)

| Metric | Healthy | Investigate |
|--------|---------|------------|
| Uptime | > 99.9% | < 99.9% |
| Error rate | < 0.1% | > 1% |
| P50 latency | < 500 ms | > 1000 ms |
| Core Web Vitals (LCP) | < 2.5 s | > 4 s |
| Daily active users | target TBD | 0 or declining |

---

## Deployment verification

```bash
curl -I https://www.flygaca.com/            # expect HTTP/2 200
curl -sI https://www.flygaca.com/ | grep -iE 'content-security-policy|strict-transport-security|x-frame-options'
curl -s  https://api.flygaca.com/api/healthz # the API host rule, same load balancer
curl -s  https://www.flygaca.com/sitemap.xml | head -20
```

The header check is the one that actually catches a missed go-live step — compare what comes back
against `npm run -s headers:gcloud`. The sitemap should list what `npm run build:sitemap` emits;
`check:prerender:coverage` is what enforces that in the pipeline.

---

## Rollback

1. **Revert and redeploy** — `git revert <sha>`, then `npm run build` and `npm run deploy:web`.
2. **API** — roll Cloud Run back to the previous revision. That is faster and safer than a rebuild,
   because env vars and secrets carry forward from the prior revision and `deploy:api` deliberately
   does not re-specify them.
3. **Database** — Cloud SQL backups in the GCP console. Migrations are forward-only; a rollback of
   code does not roll back a schema change.
4. **Communication** — notify users; update any status page.

---

## Post-launch cadence

**Day 1** — watch error logs and analytics hourly; walk the key user flows end to end; check PWA
install on mobile.
**Week 1** — traffic patterns and top pages; exception-log patterns; high-latency routes; support
feedback.
**Month 1** — Core Web Vitals trends; conversion funnel drop-off; next feature batch from usage data.

---

## Contacts

- **Support:** i@flygaca.com
- **On-call / incident channel:** not set up

---

## Sign-off

- [ ] Every pre-launch item above verified against the production project
- [ ] Uptime check + alerting policy active in Cloud Monitoring
- [ ] Security headers confirmed on **both** backends
- [ ] Rollback path rehearsed at least once
