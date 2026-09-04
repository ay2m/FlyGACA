# Troubleshooting Auth Errors in Fly GACA

This guide covers common errors you'll see during development, testing, and deployment of the new Express backend.

---

## Server Startup Errors

### Error: `Missing required environment variable: DATABASE_URL`

**Cause:** The `DATABASE_URL` environment variable is not set.

**Fix:**
```bash
# Local development (with local Postgres)
export DATABASE_URL="postgresql://postgres:password@localhost/flygaca"

# Cloud Run (with Cloud SQL unix socket)
export DATABASE_URL="postgresql://postgres:password@/flygaca?host=/cloudsql/PROJECT:REGION:INSTANCE"

# Verify
npm run dev
```

---

### Error: `SESSION_SECRET must be at least 32 characters`

**Cause:** The `SESSION_SECRET` is missing or too short.

**Fix:**
```bash
# Generate a 32-character secret
export SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Verify it's long enough (should be 64 characters when hex-encoded)
echo $SESSION_SECRET | wc -c

# Set it in Cloud Run Secret Manager
echo $SESSION_SECRET | gcloud secrets create SESSION_SECRET --data-file=-

# Or in .env.local for local dev
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.local
```

---

### Error: `connect ECONNREFUSED 127.0.0.1:5432` (or similar database connection error)

**Cause:** The database is not running or the connection string is wrong.

**Fix for local development:**
```bash
# Make sure Postgres is running
brew services start postgresql  # macOS
systemctl start postgresql      # Linux

# Test connection manually
psql "postgresql://postgres:password@localhost/flygaca"

# If that fails, verify Postgres is listening
netstat -an | grep 5432
```

**Fix for Cloud Run:**
```bash
# Test Cloud SQL connection from Cloud Shell
gcloud sql connect flygaca-db --instance=flygaca-db --user=postgres

# Or use cloud-sql-proxy locally
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432

# Then point DATABASE_URL to localhost:5432
export DATABASE_URL="postgresql://postgres:password@localhost/flygaca"
```

---

### Error: `FATAL: no password supplied`

**Cause:** The postgres password in the DATABASE_URL is wrong or missing.

**Fix:**
```bash
# Reset the postgres password
gcloud sql users set-password postgres --instance=flygaca-db

# Update DATABASE_URL with the new password
export DATABASE_URL="postgresql://postgres:NEW_PASSWORD@localhost/flygaca"
```

---

### Error: `relation "users" does not exist`

**Cause:** Database migrations have not been applied.

**Fix:**
```bash
# Run migrations
npm run db:migrate

# Verify tables were created
psql "$DATABASE_URL" -c "\dt"  # List all tables
psql "$DATABASE_URL" -c "\d users"  # Describe users table
```

---

## Authentication Errors

### Error: `Invalid credentials` when signing in

**Cause:** Multiple possibilities:
1. User doesn't exist in the database
2. Password hash is corrupted
3. Database query failed

**Debug:**
```bash
# Check if the user exists
psql "$DATABASE_URL" -c "SELECT id, email, email_verified FROM users WHERE email='test@example.com';"

# Check if password_hash was stored
psql "$DATABASE_URL" -c "SELECT id, email, password_hash IS NOT NULL FROM users WHERE email='test@example.com';"

# Try registering a new user and checking the log
NODE_ENV=development npm run dev
# Watch the console for "Email/password sign-up" messages
```

**How password verification works:**
```javascript
// server/src/session.ts
// 1. User provides password: "Test1234!@"
// 2. Stored hash format: "scrypt$<salt_hex>$<hash_hex>"
// 3. Verification: scrypt(password, salt, keylen) == stored_hash
// 4. If any step fails, returns false (never throws)
```

**If verification always fails:**
```bash
# Check the password meets policy requirements
# 8+ chars, mixed case, digit, special character
# test: Test1234!@  ✓ Valid

# Test the scrypt implementation directly
node -e "
const { scrypt, timingSafeEqual } = require('crypto');
const password = 'Test1234!@';
const salt = Buffer.from('abcd1234', 'hex');
scrypt(password, salt, 64, (err, key) => {
  if (err) throw err;
  console.log('Generated key:', key.toString('hex'));
});
"
```

---

### Error: `Session cookie not set` or `Cannot read session`

**Cause:**
1. `SESSION_SECRET` is invalid or not set
2. JWT signing failed
3. Cookie domain doesn't match the frontend domain

**Debug:**
```bash
# Verify SESSION_SECRET is set and long enough
echo ${SESSION_SECRET} | wc -c  # Should print 65 (64 chars + newline)

# Check the application/set-cookie header in the response
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234!@"}'

# Look for: Set-Cookie: fg_session=...

# If no cookie is set, check Cloud Logging for JWT signing errors
gcloud functions logs read auth --region=me-central1 --limit=50

# For Cloud Run:
gcloud run logs read flygaca-api --region=me-central2
```

**Fix:**
```bash
# Regenerate SESSION_SECRET
export SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# For Cloud Run, update the secret
echo "$SESSION_SECRET" | gcloud secrets create SESSION_SECRET --replication-policy=automatic
```

---

### Error: `CORS blocked` when testing from browser

**Cause:** The frontend origin is not in the CORS allowlist.

**Fix:**
```bash
# Local development (localhost:5173 should be allowed by default)
# If blocked, set EXTRA_ALLOWED_ORIGINS
export EXTRA_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# Production (flygaca.com should be allowed by default)
# If you added a new domain, add it:
gcloud run services update flygaca-api \
  --region=me-central2 \
  --set-env-vars "EXTRA_ALLOWED_ORIGINS=https://new-domain.com"
```

---

## OAuth Errors

### Error: `Invalid Google OAuth client ID` or `Client authentication failed`

**Cause:** OAuth client ID or secret is wrong, or not configured in the Google Cloud Console.

**Fix:**
```bash
# 1. Get the correct client ID and secret
# Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

# 2. Set environment variables
export GOOGLE_OAUTH_CLIENT_ID="your-id.apps.googleusercontent.com"
export GOOGLE_OAUTH_CLIENT_SECRET="your-secret"

# 3. Verify the redirect URI is registered
# OAuth consent screen → Authorized redirect URIs
# Must include: http://localhost:8080/api/auth/google/callback (dev)
#               https://api.flygaca.com/api/auth/google/callback (prod)

# 4. Test the OAuth flow
# Start the server and visit:
# http://localhost:5173  (frontend)
# Click "Sign in with Google"
# Should redirect to Google login, then back to frontend
```

---

### Error: `No authorization code received` or `Authorization code expired`

**Cause:** OAuth callback failed or took too long.

**Debug:**
```bash
# Check if the auth endpoint is receiving the code
gcloud functions logs read auth --region=me-central1 --limit=50 | grep "google"

# For Cloud Run:
gcloud run logs read flygaca-api --region=me-central2 | grep "google"

# Verify the redirect URL matches exactly (scheme, domain, path)
# Common mistakes:
# - http vs https
# - localhost vs 127.0.0.1
# - trailing slash in URL
```

---

## Payment/Billing Errors

### Error: `Moyasar webhook signature invalid` or `Payment confirmation failed`

**Cause:**
1. `MOYASAR_WEBHOOK_SECRET` is wrong
2. Webhook is not reaching the API
3. Request body was modified in transit

**Fix:**
```bash
# 1. Verify webhook secret in Moyasar dashboard
# Moyasar Dashboard → API Keys → Webhook Secret

# 2. Update in Cloud Run Secret Manager
echo "<actual-webhook-secret>" | gcloud secrets create MOYASAR_WEBHOOK_SECRET --replication-policy=automatic

# 3. Update Cloud Run
gcloud run services update flygaca-api \
  --region=me-central2 \
  --set-secrets MOYASAR_WEBHOOK_SECRET=MOYASAR_WEBHOOK_SECRET:latest

# 4. Test webhook locally
# https://docs.moyasar.com/payments/webhooks

# 5. Verify Cloud Run is receiving webhooks
gcloud run logs read flygaca-api --region=me-central2 | grep "moyasar"
```

---

### Error: `Payment tier not found` or `Invalid plan`

**Cause:** The plan ID in the checkout request doesn't match server-side pricing.

**Fix:**
```bash
# Check server pricing (server/src/routes/billing.ts)
# Ensure the client is sending the same plan ID
# Example: plan "ppl" for Private Pilot License

# Verify in database that the plan exists
psql "$DATABASE_URL" -c "SELECT * FROM pricing;"  # or similar table
```

---

## Database Errors

### Error: `permission denied for schema public`

**Cause:** The postgres user doesn't have permission to create tables.

**Fix:**
```bash
# Check current permissions
psql "$DATABASE_URL" -c "GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;"

# Re-run migrations
npm run db:migrate
```

---

### Error: `could not serialize access due to concurrent update`

**Cause:** Two transactions are trying to update the same row (e.g., creating an account while another process updates it).

**This is expected in production.** The code uses `SELECT ... FOR UPDATE` to lock rows during transactions.

**Fix:** Retry the operation (client should already do this).

---

### Error: `FATAL: remaining connection slots are reserved for non-replication superuser connections`

**Cause:** The database pool is exhausted (all connections taken).

**Fix:**
```bash
# Increase the pool size (carefully — Cloud Run should use small pools)
export DATABASE_POOL_MAX=10

# Or limit concurrent Cloud Run instances
gcloud run services update flygaca-api --region=me-central2 --max-instances=5
```

---

## Deployment Errors

### Error: `LOCATION_POLICY_VIOLATED` when deploying to me-central2

**Cause:** The GCP account doesn't have access to the Dammam region.

**Fix:** See DEPLOYMENT_DIAGNOSTIC.md — this requires a region grant from CNTXT (Google's KSA reseller).

**Workaround:** Deploy to `europe-west8` (Milan) temporarily:
```bash
REGION=europe-west8 node scripts/deploy-api.mjs
```

**Important:** Update privacy policy to state data residency is in the EU, not KSA.

---

### Error: `Cloud Build failed` or `Image push failed`

**Cause:**
1. Artifact Registry doesn't exist
2. Service account lacks permissions
3. Docker build failed

**Fix:**
```bash
# Create Artifact Registry
gcloud artifacts repositories create flygaca --repository-format=docker --location=me-central2

# Grant permissions to Cloud Build
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" | grep "cloudbuilder"

# Re-trigger the build
node scripts/deploy-api.mjs

# Watch logs
gcloud builds log --stream
```

---

## Observability

### Check recent error logs

**Cloud Functions (old):**
```bash
gcloud functions logs read auth --region=me-central1 --limit=100
gcloud functions logs read auth --region=me-central1 | grep -i error
```

**Cloud Run (new Express):**
```bash
gcloud run logs read flygaca-api --region=me-central2 --limit=100
gcloud run logs read flygaca-api --region=me-central2 | grep -i error

# Filter by severity
gcloud run logs read flygaca-api --region=me-central2 --filter="severity >= ERROR"
```

### Monitor performance

```bash
# Response latency
gcloud run metrics describe flygaca-api \
  --region=me-central2 \
  --metrics-names="run.googleapis.com/request_latencies"

# Errors per request
gcloud run logs read flygaca-api --region=me-central2 \
  --filter="response_code >= 400" \
  | tail -50
```

---

## When All Else Fails

1. **Start fresh with a new Cloud Run revision:**
   ```bash
   gcloud run deploy flygaca-api --region=me-central2 --source .
   ```

2. **Check Cloud Logging directly:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=flygaca-api" \
     --limit=100 \
     --region=me-central2
   ```

3. **Open a support case with Google Cloud:**
   - Include full DATABASE_URL (redact password)
   - Full error message and stack trace from logs
   - Recent git commits and deploy timestamps
   - Cloud Run revision hash and environment variables (redacted)

