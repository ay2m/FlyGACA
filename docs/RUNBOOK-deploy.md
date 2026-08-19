# Deploy runbook — provisioning Fly GACA on a fresh Google Cloud project

This repository has **no Firebase**. Auth, the datastore, the API and hosting are all first-party
or plain GCP:

| Concern | What runs it |
| --- | --- |
| SPA (`dist/`) | Cloud Storage bucket behind an HTTPS load balancer |
| API (`server/`) | Cloud Run service, region `me-central2` |
| Datastore | Cloud SQL for PostgreSQL, same region |
| Sessions | HS256 JWT in an HttpOnly cookie, signed by the API (`SESSION_SECRET`) |
| Sign-in | Email + password (scrypt), and Google via server-side OAuth |
| Email | Any Resend-compatible endpoint (`MAIL_ENDPOINT` / `MAIL_API_KEY`) |
| Payments | Moyasar (hosted widget + server-to-server confirm) |
| Renewals | Cloud Scheduler → `POST /api/billing/renew` |
| AI | ALLaM over an OpenAI-compatible endpoint (`MODEL_BASE_URL`) |

`me-central2` (Dammam) keeps user data in-Kingdom for PDPL. Use whatever region you prefer, but keep
Cloud Run and Cloud SQL in the **same** one — the unix-socket connection below requires it.

---

## 1. One-time project setup

```bash
export PROJECT_ID=flygaca              # your new project
export REGION=me-central2
export INSTANCE=flygaca-db
export BUCKET=flygaca-web              # must be globally unique

gcloud projects create "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"
# Billing must be enabled before the APIs below will turn on.

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com
```

## 1b. Artifact Registry

`cloudbuild.yaml` pushes the API image to `$REGION-docker.pkg.dev/$PROJECT_ID/flygaca/…`, so the
repository has to exist before the first build:

```bash
gcloud artifacts repositories create flygaca \
  --repository-format=docker --location="$REGION"
```

## 2. Cloud SQL (Postgres)

```bash
gcloud sql instances create "$INSTANCE" \
  --database-version=POSTGRES_16 --region="$REGION" \
  --tier=db-g1-small --storage-auto-increase

gcloud sql databases create flygaca --instance="$INSTANCE"
gcloud sql users set-password postgres --instance="$INSTANCE" --password='<choose-one>'
```

The connection name is `PROJECT_ID:REGION:INSTANCE`. Cloud Run reaches it over a unix socket, so
there is no IP allowlist and no proxy sidecar:

```
DATABASE_URL=postgresql://postgres:<password>@/flygaca?host=/cloudsql/PROJECT_ID:REGION:INSTANCE
```

Apply the schema (from a machine that can reach the instance — `cloud-sql-proxy` locally, or Cloud
Shell):

```bash
npm run db:migrate           # runs server/scripts/migrate.mjs against DATABASE_URL
```

The runner is forward-only and records applied files in `schema_migrations`; re-running is a no-op.
`server/migrations/0001_init.sql` creates every table and documents which old Firestore collection
each one replaces.

## 3. Google OAuth client

APIs & Services → Credentials → **Create OAuth client ID** → *Web application*.

- Authorized redirect URI: `https://<api-host>/api/auth/google/callback` — this must match
  `API_ORIGIN` exactly, or the callback fails with `redirect_uri_mismatch`.
- Keep the client secret out of the repo; it goes in Secret Manager below.

## 4. Secrets

```bash
printf '%s' "$(openssl rand -base64 48)" | gcloud secrets create session-secret --data-file=-
printf '%s' '<db url>'      | gcloud secrets create database-url        --data-file=-
printf '%s' '<oauth secret>'| gcloud secrets create google-oauth-secret --data-file=-
printf '%s' '<model key>'   | gcloud secrets create model-api-key       --data-file=-
printf '%s' '<sk_live_…>'   | gcloud secrets create moyasar-secret-key  --data-file=-
printf '%s' '<webhook>'     | gcloud secrets create moyasar-webhook     --data-file=-
printf '%s' '<mail key>'    | gcloud secrets create mail-api-key        --data-file=-
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets create cron-secret --data-file=-
```

Grant the Cloud Run service account `roles/secretmanager.secretAccessor` and
`roles/cloudsql.client`.

## 5. Deploy the API

Two steps, and **not** `gcloud run deploy --source`. Cloud Run's source builds only honour a
Dockerfile at the root of the source directory; ours is `server/Dockerfile`, because it copies
`public/data/rag-chunks.json` in so the BM25 index needs no cold-start fetch. `--source .` finds no
Dockerfile and falls back to buildpacks on the *frontend* `package.json` (which has no `start`
script), and `--source server/` puts the corpus outside the build context so the `COPY` fails.
Either way you get a build failure, or an image with nothing listening on `$PORT`.

`cloudbuild.yaml` does the build the repo's own `.dockerignore` already assumes:

```bash
gcloud builds submit --config cloudbuild.yaml --region="$REGION" \
  --substitutions="_REGION=$REGION,_TAG=$(git rev-parse --short HEAD)" .
```

Then create the service against that image. This first deploy is the one that sets env and secrets;
later rollouts are just `npm run deploy:api`, which reuses whatever the previous revision had.

```bash
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/flygaca/flygaca-api:$(git rev-parse --short HEAD)"

gcloud run deploy flygaca-api \
  --image="$IMAGE" --region="$REGION" \
  --add-cloudsql-instances="$PROJECT_ID:$REGION:$INSTANCE" \
  --allow-unauthenticated \
  --memory=1Gi --timeout=300 --max-instances=10 \
  --set-env-vars="NODE_ENV=production,APP_ORIGIN=https://flygaca.com,API_ORIGIN=https://api.flygaca.com,GOOGLE_OAUTH_CLIENT_ID=<client-id>,MAIL_FROM=Fly GACA <no-reply@flygaca.com>,MODEL_BASE_URL=<in-kingdom model endpoint>" \
  --set-env-vars="PRICE_PRO_MONTHLY=79,PRICE_PRO_ANNUAL=649,PRICE_PASS=299,PRICE_CREDITS=39,PRICE_PREP_PACK=249,PRICE_PREP_PACK_ESSENTIAL=249,PRICE_PREP_PACK_STANDARD=399,PRICE_PREP_PACK_COMPLETE=499,PRICE_BUNDLE=1499,PRICE_COHORT=12000" \
  --set-secrets="DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest,GOOGLE_OAUTH_CLIENT_SECRET=google-oauth-secret:latest,MODEL_API_KEY=model-api-key:latest,MOYASAR_SECRET_KEY=moyasar-secret-key:latest,MOYASAR_WEBHOOK_SECRET=moyasar-webhook:latest,MAIL_API_KEY=mail-api-key:latest,CRON_SECRET=cron-secret:latest"
```

`assertRequiredConfig()` runs before the listener binds, so a revision missing `DATABASE_URL` or a
too-short `SESSION_SECRET` fails its health check instead of 500-ing later. `GET /healthz` returns
503 until the database answers.

A **price left unset is not a silent SAR 0** — `sarToHalalas` throws, so that checkout kind fails
loudly. Set every price you intend to sell.

## 6. Publish the SPA

```bash
# Point the build at the API. If the load balancer serves both from one origin,
# use VITE_API_SAME_ORIGIN=1 instead of a base URL.
echo 'VITE_API_BASE_URL=https://api.flygaca.com' >> .env.local
echo 'VITE_MOYASAR_PUBLISHABLE_KEY=pk_live_…'    >> .env.local

npm run build
gcloud storage buckets create "gs://$BUCKET" --location="$REGION"
gcloud storage rsync -r -d dist "gs://$BUCKET"
gcloud storage buckets update "gs://$BUCKET" --web-main-page-suffix=index.html --web-error-page=index.html
```

Then put an HTTPS load balancer in front with two backends: the bucket for `/*`, and a serverless
NEG for the Cloud Run service on `/api/*`. Routing both through one origin is the simplest option —
it keeps the session cookie same-site and lets the CSP stay `connect-src 'self'`.

If instead the API lives on its own hostname, leave `SESSION_COOKIE_DOMAIN` unset (the cookie then
uses `SameSite=None; Secure`) and make sure the SPA origin is in the CORS allowlist —
`server/src/gateway-core.ts` covers `flygaca.com`, `*.flygaca.com` and `*.a.run.app`; anything else
goes in `EXTRA_ALLOWED_ORIGINS`.

## 7. Renewal job

Moyasar has no hosted billing portal, so renewals are ours to drive:

```bash
gcloud scheduler jobs create http flygaca-renewals \
  --location="$REGION" --schedule="0 3 * * *" --time-zone="Asia/Riyadh" \
  --uri="https://api.flygaca.com/api/billing/renew" --http-method=POST \
  --headers="X-Cron-Secret=<cron-secret>"
```

The route charges every subscription whose lead window has opened (`RENEWAL_LEAD_DAYS`, 3), extends
the entitlement from its own expiry rather than from the charge date, and on failure retries daily
until `MAX_RENEWAL_ATTEMPTS`, then switches auto-renew off so the plan simply lapses.

## 8. Moyasar webhook

Dashboard → Webhooks → add `https://api.flygaca.com/api/billing/webhook/moyasar` and copy the shared
secret into `MOYASAR_WEBHOOK_SECRET`.

Prefer the **`api.` origin** over `https://flygaca.com/api/...`. Both resolve — the Netlify/Vercel/
Worker fronts rewrite `/api/*` to this same service — but the direct origin skips a proxy hop, and
one of the two accepted auth schemes is an HMAC over the *raw request bytes*, which only stays valid
if every hop forwards the body untouched.

`verifyMoyasarWebhook` accepts either scheme, constant-time: a `secret_token` field in the JSON body
holding the shared secret (what Moyasar's own webhook docs describe), or an `x-moyasar-signature`
header carrying an HMAC-SHA256 hex digest over the raw body (what its newer SDKs send). An unset
`MOYASAR_WEBHOOK_SECRET` fails closed. Subscribing to all event types is safe — `payout_*` and
`balance_transferred` deliveries are acked and dropped, since their ids are not payment ids.

The old Firebase path `/api/moyasar-webhook` is **dead** — it was a `firebase.json` rewrite, and a
webhook still pointed at it 404s silently on every delivery.

The webhook is **defence in depth**, not the primary path: the browser's return leg calls
`POST /api/billing/confirm`, which fetches the payment server-to-server by id. Both funnel into the
same idempotent `fulfil()`, guarded by the `status = 'pending'` update on `checkout_intents`, so a
double delivery cannot double-grant.

---

## Operational scripts

Run from `server/` with `DATABASE_URL` set (`node --env-file=../.env scripts/<name>.mjs`):

| Script | What it does |
| --- | --- |
| `migrate.mjs` | Apply pending SQL migrations |
| `grant-staff-access.mjs` | Sweep existing accounts and grant the staff entitlement to allowlisted verified emails |
| `grant-org.mjs` | Create/update a B2B org and set its owner + seat limit |
| `grant-school-seats.mjs` | Provision (or `--revoke`) school seats from a roster CSV |
| `school-cohort-report.mjs` | Seat + readiness report for a roster (`--csv=out.csv`); needs `npm run build` first |
| `mint-api-key.mjs` | Mint a licensed `/v1/ask` API key (shown once) |

All of them accept `--dry-run` where a write is involved.

## Local development

```bash
docker run -d --name flygaca-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
createdb -h localhost -U postgres flygaca      # or: psql -c 'CREATE DATABASE flygaca'

cp .env.example .env                            # fill DATABASE_URL + SESSION_SECRET
npm run db:migrate
npm run server:dev                              # API on :8080
npm run dev                                     # SPA on :5173
```

With no `MAIL_API_KEY`, verification and reset emails are **logged to the server console** rather
than sent — the link is copy-pasteable, so sign-up works end to end offline.

With no `VITE_API_BASE_URL`, the SPA ignores the API entirely and runs local-first: the corpus,
tools, study and logbook all work, and accounts/sync/billing stay dark. That is the default for CI
and the preview build.
