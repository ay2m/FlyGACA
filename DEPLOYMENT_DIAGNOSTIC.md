# Fly GACA Auth Error Diagnostic & Deployment Guide

## Current State

**Problem:** Serverless Function crashes (`FUNCTION_INVOCATION_FAILED`) + sign-in failures ("Check your details and try again")

**Root Cause:** The new Express backend (`server/src/`) has **never been deployed**. Production is still running the old Firebase Functions stack in `me-central1` (Doha, Qatar).

**Evidence:**
- `docs/RUNBOOK-deploy.md` explicitly states: "This runbook has never been executed"
- No Cloud Run service `flygaca-api` exists in any project
- Production uses 14 Cloud Run services in project `flygaca-sa` from the Firebase Functions era
- Cloud SQL is in `us-east4` (Northern Virginia) with Firebase scaffolding, never initialized
- No user data exists to migrate

---

## Phase 1: Verify Current Production State

Before any fixes, document the existing setup:

```bash
# List current Cloud Run services
gcloud run services list --project=flygaca-sa --region=me-central1

# Check the old auth function's recent logs
gcloud functions describe auth --project=flygaca-sa --region=me-central1
gcloud functions logs read auth --project=flygaca-sa --region=me-central1 --limit=50

# Check Firestore state
gcloud firestore databases list --project=flygaca-sa
gcloud firestore documents list collections --project=flygaca-sa

# Verify Cloud SQL instances
gcloud sql instances list --project=flygaca-sa
```

**What you'll likely see:**
- The auth Cloud Function in `me-central1` is still configured
- Recent invocation errors with stack traces indicating deprecated Firebase libraries or missing environment variables
- Empty Firestore collections
- An instance in `us-east4` from Firebase Data Connect setup

---

## Phase 2: Fix Immediate Auth Issues (Without Re-deploying)

While planning the migration to Express, stop the bleeding on the existing Functions:

### 2.1 Verify the old auth function has required secrets

```bash
# List secrets stored in Secret Manager for the old functions
gcloud secrets list --project=flygaca-sa

# If AUTH_SECRET or similar is missing, create them:
echo "<32-char secret>" | gcloud secrets create AUTH_SECRET --data-file=- \
  --project=flygaca-sa --replication-policy="automatic"

# Grant the Cloud Functions service account access
gcloud secrets add-iam-policy-binding AUTH_SECRET \
  --member=serviceAccount:flygaca-sa@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=flygaca-sa
```

### 2.2 Check function configuration

```bash
# Inspect the old auth function's environment
gcloud functions describe auth --project=flygaca-sa --region=me-central1

# Look for:
# - Environment variables set (_FUNCTION_MEMORY, etc.)
# - Service account assigned
# - Available secrets mounted
```

### 2.3 Re-deploy the old function to pick up config changes

```bash
# This does NOT change code; it re-applies configuration from Secret Manager
gcloud functions deploy auth \
  --project=flygaca-sa \
  --region=me-central1 \
  --trigger-http \
  --allow-unauthenticated
```

---

## Phase 3: Plan the Migration to Express (me-central2)

This is the **long-term fix**. The new architecture is ready in code; it just needs infrastructure.

### 3.1 Get me-central2 Region Access

This is the **blocker**. The Dammam region is sold only through CNTXT (Google's KSA reseller).

**Requirements:**
- Registered business in KSA (Company Registration + VAT)
- Apply at https://cloud.cntxt.com
- Migrate GCP billing to CNTXT (invoiced billing, not self-serve)
- Estimated timeline: 2–4 weeks for approval

**Current status:** This account has `LOCATION_POLICY_VIOLATED` for all projects (personal Gmail, self-serve billing).

**Workaround:** Deploy to the **fastest available region** (pre-grant):
- `europe-west8` (Milan): **83 ms RTT** from Riyadh (1.7× better than me-central1)
- `me-central1` (Doha): 158 ms RTT (current prod, acceptable temporary fallback)

**Important:** No fallback region is in-Kingdom. You cannot claim PDPL compliance with any region except me-central2. Update the privacy policy and all compliance docs if you deploy outside the Kingdom.

### 3.2 Project Setup (Once Region Access Is Approved)

```bash
export PROJECT_ID=flygaca              # or your new project
export REGION=me-central2              # or europe-west8 as fallback
export INSTANCE=flygaca-db
export BUCKET=flygaca-web              # globally unique

# Create project (skip if using existing)
gcloud projects create "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Create Artifact Registry for Docker images
gcloud artifacts repositories create flygaca \
  --repository-format=docker \
  --location="$REGION"
```

### 3.3 Cloud SQL Setup

```bash
# Create the database instance
gcloud sql instances create "$INSTANCE" \
  --database-version=POSTGRES_16 \
  --region="$REGION" \
  --tier=db-g1-small \
  --storage-auto-increase \
  --availability-type=REGIONAL \
  --backup-start-time=23:00 \
  --retained-backups-count=14 \
  --enable-point-in-time-recovery \
  --deletion-protection \
  --no-assign-ip \
  --ssl-mode=ENCRYPTED_ONLY \
  --maintenance-window-day=FRI \
  --maintenance-window-hour=1

# Create the database
gcloud sql databases create flygaca --instance="$INSTANCE"

# Set password for postgres user (save it securely)
gcloud sql users set-password postgres --instance="$INSTANCE" --password='<choose-one>'

# Store in Secret Manager for Cloud Run
echo '<password>' | gcloud secrets create postgres-password --data-file=-
gcloud secrets add-iam-policy-binding postgres-password \
  --member=serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### 3.4 Apply Database Migrations

Once Cloud SQL is ready:

```bash
# From a machine that can reach the DB (Cloud Shell or local with proxy)
export DATABASE_URL="postgresql://postgres:<password>@/flygaca?host=/cloudsql/${PROJECT_ID}:${REGION}:${INSTANCE}"

# Run migrations
npm run db:migrate
```

This creates the schema required for the Express server:
- `users` table (email, password_hash, google_sub, apple_sub, etc.)
- `profiles` table (display_name, avatar, etc.)
- Additional tables for sessions, grants, billing, etc.

---

## Phase 4: Environment Variables & Secrets

Create all required secrets in Secret Manager:

```bash
# Session authentication
echo '<32+ char random string>' | gcloud secrets create SESSION_SECRET --data-file=-

# OAuth providers
echo '<google-client-id>' | gcloud secrets create GOOGLE_OAUTH_CLIENT_ID --data-file=-
echo '<google-client-secret>' | gcloud secrets create GOOGLE_OAUTH_CLIENT_SECRET --data-file=-
echo '<apple-client-id>' | gcloud secrets create APPLE_OAUTH_CLIENT_ID --data-file=-
echo '<apple-client-secret>' | gcloud secrets create APPLE_OAUTH_CLIENT_SECRET --data-file=-

# Payment provider
echo '<moyasar-secret-key>' | gcloud secrets create MOYASAR_SECRET_KEY --data-file=-
echo '<moyasar-webhook-secret>' | gcloud secrets create MOYASAR_WEBHOOK_SECRET --data-file=-

# Email service (optional, but required for verification flows)
echo '<resend-api-key>' | gcloud secrets create MAIL_API_KEY --data-file=-

# Model provider (Captain Adel)
echo '<gemini-api-key>' | gcloud secrets create MODEL_API_KEY --data-file=-

# Renewal job (Cloud Scheduler to POST /api/billing/renew)
echo '<32+ char cron secret>' | gcloud secrets create CRON_SECRET --data-file=-

# Grant access to Cloud Run service account
for secret in SESSION_SECRET GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET \
              APPLE_OAUTH_CLIENT_ID APPLE_OAUTH_CLIENT_SECRET \
              MOYASAR_SECRET_KEY MOYASAR_WEBHOOK_SECRET \
              MAIL_API_KEY MODEL_API_KEY CRON_SECRET postgres-password; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member=serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com \
    --role=roles/secretmanager.secretAccessor
done
```

---

## Phase 5: Deploy the Express Backend

```bash
# Build and deploy
PROJECT_ID=flygaca REGION=me-central2 TAG=$(git rev-parse HEAD) node scripts/deploy-api.mjs

# Cloud Run needs environment variables pointing to these secrets
gcloud run services update flygaca-api \
  --region=me-central2 \
  --set-secrets SESSION_SECRET=SESSION_SECRET:latest \
  --set-secrets GOOGLE_OAUTH_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID:latest \
  --set-secrets GOOGLE_OAUTH_CLIENT_SECRET=GOOGLE_OAUTH_CLIENT_SECRET:latest \
  --set-secrets APPLE_OAUTH_CLIENT_ID=APPLE_OAUTH_CLIENT_ID:latest \
  --set-secrets APPLE_OAUTH_CLIENT_SECRET=APPLE_OAUTH_CLIENT_SECRET:latest \
  --set-secrets MOYASAR_SECRET_KEY=MOYASAR_SECRET_KEY:latest \
  --set-secrets MOYASAR_WEBHOOK_SECRET=MOYASAR_WEBHOOK_SECRET:latest \
  --set-secrets MAIL_API_KEY=MAIL_API_KEY:latest \
  --set-secrets MODEL_API_KEY=MODEL_API_KEY:latest \
  --set-secrets CRON_SECRET=CRON_SECRET:latest \
  --set-env-vars "DATABASE_URL=postgresql://postgres:$(gcloud secrets versions access latest --secret=postgres-password)@/flygaca?host=/cloudsql/${PROJECT_ID}:${REGION}:flygaca-db" \
  --set-env-vars "APP_ORIGIN=https://flygaca.com" \
  --set-env-vars "API_ORIGIN=https://api.flygaca.com" \
  --set-env-vars "SESSION_COOKIE_DOMAIN=.flygaca.com" \
  --set-env-vars "MODEL_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/" \
  --set-env-vars "MAIL_ENDPOINT=https://api.resend.com/emails"
```

---

## Phase 6: Test End-to-End Auth Flow

Once deployed, test the complete sign-up → payment flow:

```bash
# 1. Health check
curl https://api.flygaca.com/healthz

# 2. Register new user
curl -X POST https://api.flygaca.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!@",
    "displayName": "Test User"
  }'

# 3. Verify session cookie was set
curl -v https://api.flygaca.com/api/auth/me -b "fg_session=..."

# 4. Login
curl -X POST https://api.flygaca.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!@"
  }'

# 5. Payment checkout (Moyasar)
curl -X POST https://api.flygaca.com/api/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: fg_session=..." \
  -d '{"plan": "ppl", "source": "app"}'

# 6. Confirm payment
curl -X POST https://api.flygaca.com/api/billing/confirm \
  -H "Content-Type: application/json" \
  -H "Cookie: fg_session=..." \
  -d '{"paymentId": "..."}'
```

---

## Immediate Actions (This Week)

1. **Verify current production state** — run Phase 1 diagnostics
2. **Apply emergency fixes** — Phase 2 (stabilize old Functions while planning migration)
3. **Request me-central2 access** — apply at CNTXT if you have a KSA entity; otherwise use europe-west8
4. **Prepare environment variable list** — Phase 4 (secrets are the fastest part to provision)
5. **Document compliance posture** — if not using me-central2, update privacy policy immediately

---

## Files to Update After Deployment

Once the new backend is live:

- **Privacy Policy** — update data residency claims (currently says Dammam, incorrect if deployed elsewhere)
- **Terms of Service** — reference the new Cloud Run service instead of Functions
- **RUNBOOK-deploy.md** — update with actual deployment steps (this runbook will be proven by execution)
- **GitHub Actions workflows** — if CI/CD exists, point it to the new Cloud Run service and database
- **DNS records** — point `api.flygaca.com` to Cloud Run (HTTPS load balancer)

---

## Rollback Plan

If the new backend has critical issues:

1. Keep the old Cloud Functions running during the transition
2. Update DNS/reverse proxy to route traffic back to Functions
3. Do not delete the old service until 30 days of new-backend stability

---

## Links

- **Region access:** https://docs.cloud.google.com/docs/dammam-region-access
- **CNTXT (KSA reseller):** https://cloud.cntxt.com
- **Google Cloud SQL:** https://cloud.google.com/sql/docs
- **Cloud Run deploy:** https://cloud.google.com/run/docs/deploying-source-code
- **Secret Manager:** https://cloud.google.com/secret-manager/docs

