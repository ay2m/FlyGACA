# Go-live runbook — taking Fly GACA to production

`docs/RUNBOOK-deploy.md` provisions a fresh Google Cloud project: APIs, Cloud SQL, the OAuth
client, Secret Manager, the Cloud Run service, the renewal job. **Do that first.** This document
covers only what it does not: the load balancer's response headers, the corpus offload, the
deploy pipeline, and the checks that decide whether you are actually ready to take money.

Production is **one GCP project in `me-central2` (Dammam)** and nothing else. Cloudflare, Netlify
and Vercel configs remain in the repo as dormant mirrors; nothing is deployed to them. In-Kingdom
residency is the reason — see [Data residency](#data-residency).

---

## 1. Topology

| Layer | Resource |
| --- | --- |
| SPA (`dist/`) | Cloud Storage bucket + backend bucket, Cloud CDN on |
| Corpus (`/data`) | Second Cloud Storage bucket, public read |
| API (`/api/*`, `/v1/*`) | Cloud Run `flygaca-api`, serverless NEG on the same load balancer |
| Datastore | Cloud SQL for PostgreSQL, same region |
| Front door | One global external HTTPS load balancer, Google-managed certificate |
| DNS | Cloud DNS — apex, `www`, `api` all to the load balancer IP |

Both the SPA and `/api` are served from **one origin**. That is what keeps the session cookie
same-site and the CSP at `connect-src 'self'`. `api.flygaca.com` is a second host rule on the same
load balancer pointing at the same NEG — the Moyasar webhook must target it directly, because one
of its two accepted auth schemes is an HMAC over the raw request bytes and that only survives if no
hop rewrites the body.

Build the SPA with `VITE_API_SAME_ORIGIN=1`, not `VITE_API_BASE_URL`.

---

## 2. Security headers on the load balancer

**This is the step most likely to be skipped, and skipping it ships a payments site with no CSP and
no HSTS.** Those headers live in `config/headers.json`. `helmet()` in the API covers API responses
only — nothing sets them for the static SPA unless you do it here.

Google applies custom response headers **per backend**, so both backends need them:

```bash
HEADERS="$(npm run -s headers:gcloud)"

gcloud compute backend-buckets update flygaca-web \
  --custom-response-headers="$HEADERS"
gcloud compute backend-services update flygaca-api \
  --global --custom-response-headers="$HEADERS"
```

> **Keep the leading `^~^`.** `npm run -s headers:gcloud` emits it deliberately: it redefines
> gcloud's list separator for that one argument. `Permissions-Policy` contains commas and gcloud
> splits this flag on commas by default, so passing the headers without the escape shreds that
> header into fragments — and gcloud accepts the result rather than erroring.

Verify after applying:

```bash
curl -sI https://flygaca.com | grep -iE 'content-security-policy|strict-transport|x-frame|x-content-type'
```

Changing a header means editing `config/headers.json` and re-running the two updates.
`tests/headers-parity.test.ts` keeps the dormant Vercel/Netlify mirrors in step; it cannot see the
live load balancer, so a green test does **not** mean production is serving them.

---

## 3. Corpus offload

The corpus is ~64 MB in `public/data`. Serving it from its own bucket keeps a web deploy ~12 MB.
Full detail in [`DATA-HOSTING.md`](DATA-HOSTING.md); the short version:

```bash
gcloud storage buckets create gs://flygaca-data --location=me-central2
gcloud storage buckets add-iam-policy-binding gs://flygaca-data \
  --member=allUsers --role=roles/storage.objectViewer
```

Then build with `VITE_DATA_BASE_URL=https://storage.googleapis.com/flygaca-data/data`. The trailing
`/data` matters — `dataUrl()` in `src/lib/content.ts` swaps `/data` for that base, and
`scripts/deploy-web.mjs` uploads under the same prefix.

The bucket host is already in the CSP's `connect-src` and `img-src`.

---

## 4. Deploy

```bash
npm run deploy:api    # cloudbuild.yaml → docker build -f server/Dockerfile . → new Cloud Run revision

WEB_BUCKET=gs://flygaca-web \
DATA_BUCKET=gs://flygaca-data \
URL_MAP=flygaca-lb \
  npm run deploy:web  # upload dist/ + corpus, stamp Cache-Control, invalidate CDN
```

Both accept `--dry-run`, which prints the exact `gcloud` commands and runs nothing.

Two things that are easy to get wrong and produce a silent bad deploy:

- **`gcloud run deploy --source` cannot build this service.** Cloud Run only honours a Dockerfile at
  the source root; ours is `server/Dockerfile` because it copies `public/data/rag-chunks.json` into
  the image. `cloudbuild.yaml` exists for exactly this.
- **`gcloud storage rsync` sets no `Cache-Control`.** Uploading by hand leaves `index.html` and
  `sw.js` cacheable, and users stay on the previous build with no error anywhere.
  `scripts/deploy-web.mjs` stamps them from `config/headers.json`.

`deploy:api` deliberately passes no `--set-env-vars` or `--set-secrets`; Cloud Run carries those
forward from the previous revision. Price and secret changes stay a `RUNBOOK-deploy.md` §5
operation, so an omission here can never become a live config change.

### CI/CD

`.github/workflows/ci.yml` gates every PR (frontend · server · e2e). `.github/workflows/deploy.yml`
deploys `main`. It authenticates with **Workload Identity Federation**, not a service-account JSON
key — a long-lived key in a repo secret is a standing credential to the project holding every user
account and payment record.

Repository **variables**: `GCP_PROJECT_ID`, `WIF_PROVIDER`, `DEPLOY_SERVICE_ACCOUNT`, `WEB_BUCKET`,
`DATA_BUCKET`, `URL_MAP`, `DATA_BASE_URL`, `MOYASAR_PUBLISHABLE_KEY`, `GA_MEASUREMENT_ID`.
Repository **secret**: `INDEXNOW_KEY` (optional; the ping is dark without it).

The deploy runs the full body prerender with `PRERENDER_MAX=0`. The default cap is 560 and
`build:sitemap` emits ~708 URLs, so the default would leave ~150 sitemap URLs head-only —
`check:prerender:coverage` then fails the deploy, which is the point of it.

---

## 5. Data residency

Cloud Run, Cloud SQL and both buckets sit in `me-central2`. The load balancer terminates TLS at
Google's edge, but storage and processing stay in-region and never leave Google's own network.

**One exception, and you should know about it:** Captain Adel calls the Gemini API, which is not
in-Kingdom. Reading `server/src/captain-adel.ts`, the request carries the system prompt (retrieved
corpus text), the chat history and the user's question — **no identity, email or profile is
attached**. What leaves the Kingdom is unattributed user-typed text; the database never moves.

Disclose Gemini as a sub-processor in the privacy policy. If a school contract later demands strict
residency for prompt content as well, the migration path is Vertex AI — check Gemini model
availability in `me-central2` before committing to that in writing.

---

## 6. Launch checklist

**Service**
- [ ] `GET https://api.flygaca.com/healthz` → 200 (it returns 503 until Postgres answers)
- [ ] `SESSION_SECRET` ≥ 32 chars; `SESSION_COOKIE_DOMAIN=.flygaca.com`
- [ ] OAuth redirect URI is exactly `${API_ORIGIN}/api/auth/google/callback`
- [ ] Cloud SQL automated backups **and** point-in-time recovery enabled
- [ ] Budget alert set on the billing account

**Headers and caching**
- [ ] `curl -I https://flygaca.com` shows CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`
- [ ] `curl -I https://flygaca.com/assets/<hashed>.js` → `immutable`
- [ ] `curl -I https://flygaca.com/sw.js` → `no-cache`
- [ ] `curl -I https://flygaca.com/` → `no-cache` on the HTML

**Money**
- [ ] Moyasar live keys in Secret Manager; `pk_live_…` in the build
- [ ] Webhook registered at `https://api.flygaca.com/api/billing/webhook/moyasar`, secret set
      (**an unset `MOYASAR_WEBHOOK_SECRET` fails closed**)
- [ ] Every `PRICE_*` set on the live revision and matching what the site advertises —
      `tests/pricing-server-parity.test.ts` guards only the repo half
- [ ] One real SAR charge end to end → the `entitlements` row is written
- [ ] Cloud Scheduler renewal job created and firing

**Product**
- [ ] Sign-up → verification email → sign-in → logbook write → sync, on the live origin
- [ ] `/ar` and a sampled `/ar/...` route return the right `hreflang` and canonical
- [ ] `curl -s https://flygaca.com/library | grep -c '<footer'` → non-zero (body prerender landed)

**Search**
- [ ] Search Console and Bing Webmaster verified, sitemap submitted
- [ ] `INDEXNOW_KEY` set and hosted at `https://flygaca.com/<key>.txt` (optional)

---

## 7. Troubleshooting

### "The user-provided container failed to start and listen on the port defined by PORT=8080"

Two independent causes produce this identical message. Check both — fixing one still leaves the
other.

**a) The image has no server in it.** This is what the Cloud Run console's *"Deploy from
repository"* wizard produces. It looks for a Dockerfile at the repo root, finds none (ours is
`server/Dockerfile`), and falls back to buildpacks on the root `package.json` — which is the **Vite
frontend** and has no `start` script. The build fails, and nothing binds `$PORT`.

Do not use that wizard. Build with `cloudbuild.yaml` (`npm run deploy:api`, or `RUNBOOK-deploy.md`
§5 for a first deploy). If the wizard already ran, it also created a **Cloud Build trigger** that
will re-run the same broken build on every push — delete it:

```bash
gcloud builds triggers list --region="$REGION"
gcloud builds triggers delete TRIGGER_NAME --region="$REGION"
```

**b) The config check rejected the revision.** `server/src/index.ts` calls
`assertRequiredConfig()` *before* `app.listen()`, deliberately, so a misconfigured revision dies at
boot instead of 500-ing on live traffic. It throws when `DATABASE_URL` is missing or
`SESSION_SECRET` is shorter than 32 characters — and a service created by the console wizard has
neither. Confirm in the logs:

```bash
gcloud run services logs read flygaca-api --region="$REGION" --limit=50
```

A line reading `Missing required environment variable: DATABASE_URL` is this case, not a port
problem. Fix it with the `--set-env-vars` / `--set-secrets` from `RUNBOOK-deploy.md` §5.

Related: `GET /healthz` returns **503 until the database answers**, so a revision that starts but
cannot reach Cloud SQL will also fail its health check. Check that
`--add-cloudsql-instances` is set and `DATABASE_URL` uses the unix socket form
(`...@/flygaca?host=/cloudsql/PROJECT:REGION:INSTANCE`).

### The build succeeds but the image is enormous, or the build uploads for minutes

`.gcloudignore` is missing or was edited. Without it gcloud falls back to `.gitignore`, which does
not exclude `public/` — so all 64 MB of corpus is uploaded to reach the one 14 MB file the image
needs.

## 8. Rollback

```bash
gcloud run revisions list --service flygaca-api --region me-central2
gcloud run services update-traffic flygaca-api --region me-central2 --to-revisions REVISION=100
```

The SPA has no revision history — `deploy:web` overwrites the bucket. To roll it back, check out the
previous commit and re-run the deploy. A database migration is forward-only
(`server/scripts/migrate.mjs`); rolling the API back past a migration needs a restore from the Cloud
SQL backup, which is why point-in-time recovery is on the checklist.
