# Runbook — load balancer, DNS and the CI identity

`RUNBOOK-deploy.md` provisions *services*: Cloud SQL, Secret Manager, Artifact Registry, the
Cloud Run revision, the buckets. `RUNBOOK-golive.md` assumes a front already exists — its
first step applies response headers to a **backend bucket** and a **backend service** by name.

Nothing created those. This file is the missing middle: it puts the services on
`flygaca.com`, and it gives GitHub Actions an identity to deploy with.

Run it once, between `RUNBOOK-deploy.md` §6 and `RUNBOOK-golive.md` §2.

```bash
export PROJECT_ID=...            # e.g. flygaca-prod
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export REGION=me-central2        # Dammam — in-Kingdom, PDPL
export WEB_BUCKET=...            # the SPA bucket from RUNBOOK-deploy §6
export GITHUB_REPO=ay2m/FlyGACA
gcloud config set project "$PROJECT_ID"
```

The names below are **load-bearing**. `flygaca-web`, `flygaca-api` and `flygaca-lb` are
referenced by `RUNBOOK-golive.md` §2 and by the `URL_MAP` repo variable in
`.github/workflows/deploy.yml`. Change them here and you must change them there.

---

## 1. Enable the APIs

`RUNBOOK-deploy.md` §1 enables the service APIs. These are the ones this file needs and that
list does not have — the three STS/IAM ones are what Workload Identity Federation runs on,
and a missing one surfaces as an opaque `403` halfway through §4.

```bash
gcloud services enable \
  compute.googleapis.com \
  certificatemanager.googleapis.com \
  dns.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  storage.googleapis.com
```

---

## 2. A dedicated runtime service account

By default a Cloud Run service runs as the **Compute Engine default service account**, which
holds `roles/editor` on the whole project. That means the service taking payments and holding
every user record can also delete your database. It is also why the "grant the Cloud Run
service account secretAccessor" line in `RUNBOOK-deploy.md` is a no-op — Editor already
covers it.

```bash
gcloud iam service-accounts create flygaca-run \
  --display-name="Fly GACA API runtime"
export RUNTIME_SA="flygaca-run@$PROJECT_ID.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA" --role=roles/cloudsql.client

# Per-secret, not a project-wide secretAccessor: this account should be able to read
# the eight secrets it needs and nothing anyone adds later.
for S in database-url session-secret google-oauth-secret model-api-key \
         moyasar-secret-key moyasar-webhook mail-api-key cron-secret; do
  gcloud secrets add-iam-policy-binding "$S" \
    --member="serviceAccount:$RUNTIME_SA" --role=roles/secretmanager.secretAccessor
done
```

Then re-deploy the service with `--service-account="$RUNTIME_SA"` (add it to the `gcloud run
deploy` in `RUNBOOK-deploy.md` §5). `scripts/deploy-api.mjs` carries it forward from then on.

---

## 3. The deploy service account

This is the identity `.github/workflows/deploy.yml` assumes under the `DEPLOY_SERVICE_ACCOUNT`
repo variable. Each role below maps to a step that fails without it, and the failure is
always a green build followed by a red deploy step.

```bash
gcloud iam service-accounts create flygaca-deploy \
  --display-name="Fly GACA CI deployer"
export DEPLOY_SA="flygaca-deploy@$PROJECT_ID.iam.gserviceaccount.com"

for ROLE in \
  roles/run.admin `                      # roll out a new revision` \
  roles/cloudbuild.builds.editor `       # gcloud builds submit` \
  roles/artifactregistry.writer `        # push the image` \
  roles/storage.admin `                  # bucket rsync + object metadata + build staging` \
  roles/compute.loadBalancerAdmin `      # url-maps invalidate-cdn-cache in deploy-web.mjs` \
  ; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$DEPLOY_SA" --role="$ROLE"
done

# Deploying a service that RUNS AS the runtime account requires impersonation rights
# on that account specifically. Without this, "Deploy API" fails with a permission
# error naming an account the operator did not expect to be involved.
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/iam.serviceAccountUser
```

**Cloud Build's own account.** `gcloud builds submit` runs as the Compute Engine default
service account on a new project, and `cloudbuild.yaml` sets `logging: CLOUD_LOGGING_ONLY`,
which makes `logWriter` mandatory rather than optional. The symptom without it is a build
that dies immediately, before any Docker step runs:

```bash
CB_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" --role=roles/logging.logWriter
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" --role=roles/artifactregistry.writer
```

---

## 4. Workload Identity Federation

`deploy.yml` authenticates with WIF rather than a service-account JSON key, because a
long-lived key in a repo secret is a standing credential to the project holding every user
account and payment record, and it never expires on its own.

```bash
gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == '$GITHUB_REPO'"
```

> **The `--attribute-condition` is not optional.** Without it the provider trusts *any*
> GitHub Actions token from *any* repository on GitHub, and the binding below then lets
> anyone who knows your project number mint credentials for the deploy account. This is the
> single most dangerous line to omit in this document.

Bind the pool to the deploy account, scoped to this repository:

```bash
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$GITHUB_REPO"

# The value for the WIF_PROVIDER repo variable:
gcloud iam workload-identity-pools providers describe github \
  --location=global --workload-identity-pool=github --format='value(name)'
```

---

## 5. The load balancer

```bash
gcloud compute addresses create flygaca-ip --global
export LB_IP="$(gcloud compute addresses describe flygaca-ip --global --format='value(address)')"
echo "$LB_IP"   # you need this for DNS in §6

# The API backend: a serverless NEG pointing at the Cloud Run service.
gcloud compute network-endpoint-groups create flygaca-neg \
  --region="$REGION" --network-endpoint-type=serverless \
  --cloud-run-service=flygaca-api

gcloud compute backend-services create flygaca-api \
  --global --load-balancing-scheme=EXTERNAL_MANAGED
gcloud compute backend-services add-backend flygaca-api \
  --global --network-endpoint-group=flygaca-neg --network-endpoint-group-region="$REGION"

# The SPA backend: the bucket, fronted by Cloud CDN.
gcloud compute backend-buckets create flygaca-web \
  --gcs-bucket-name="$WEB_BUCKET" --enable-cdn
```

### The url-map

Import it from a file rather than assembling it with `add-path-matcher` flags — it carries
three things the flag form expresses badly: the SPA 404 fallback, the `www` redirect, and the
legacy-route redirects.

```bash
cat > /tmp/flygaca-lb.yaml <<YAML
name: flygaca-lb
defaultService: projects/$PROJECT_ID/global/backendBuckets/flygaca-web
hostRules:
  - hosts: ['flygaca.com']
    pathMatcher: web
  - hosts: ['www.flygaca.com']
    pathMatcher: www-redirect
  - hosts: ['api.flygaca.com']
    pathMatcher: api-host
pathMatchers:
  - name: web
    defaultService: projects/$PROJECT_ID/global/backendBuckets/flygaca-web
    # SPA deep links. The prerender writes dist/<route>/index.html so prerendered
    # routes resolve as objects, but routes deliberately NOT prerendered have no
    # object at all — /account, /settings, /dashboard, and /checkout/return, where
    # Moyasar returns a customer whose card has just been charged. The bucket's own
    # --web-error-page does NOT apply behind a backend bucket; this does.
    defaultCustomErrorResponsePolicy:
      errorService: projects/$PROJECT_ID/global/backendBuckets/flygaca-web
      errorResponseRules:
        - matchResponseCodes: ['404']
          path: /index.html
          overrideResponseCode: 200
    pathRules:
      - paths: ['/api/*', '/v1/*']
        service: projects/$PROJECT_ID/global/backendServices/flygaca-api
        # An API 404 must stay a 404. Without an explicit empty policy here the
        # matcher default above would hand API clients an HTML page with status 200.
        customErrorResponsePolicy:
          errorResponseRules: []
      # Retired routes that exist only as client-side <Navigate> elements, so the
      # bucket has no object for them and they 404 to crawlers. /guides and /study
      # are the FORMER hubs — the URLs with existing backlinks and index entries.
      - paths: ['/guides']
        urlRedirect: { pathRedirect: '/learn', redirectResponseCode: MOVED_PERMANENTLY_DEFAULT }
      - paths: ['/study']
        urlRedirect: { pathRedirect: '/learn?tab=practice', redirectResponseCode: MOVED_PERMANENTLY_DEFAULT }
      - paths: ['/signin', '/signup']
        urlRedirect: { pathRedirect: '/account', redirectResponseCode: MOVED_PERMANENTLY_DEFAULT }
      - paths: ['/hud']
        urlRedirect: { pathRedirect: '/tools', redirectResponseCode: MOVED_PERMANENTLY_DEFAULT }
  - name: www-redirect
    # Without this, www serves a byte-identical copy of the site at 200, whose
    # canonical, og:url and hreflang all name the apex. Duplicate host, split link
    # equity, wasted crawl budget.
    defaultUrlRedirect:
      hostRedirect: flygaca.com
      redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
      stripQuery: false
  - name: api-host
    # /healthz is at the ROOT, so this host needs the NEG as its default service,
    # not merely an /api/* path rule.
    defaultService: projects/$PROJECT_ID/global/backendServices/flygaca-api
YAML

gcloud compute url-maps import flygaca-lb --global --source=/tmp/flygaca-lb.yaml
```

> Field names under `defaultCustomErrorResponsePolicy` have moved across gcloud releases.
> If the import is rejected, run `gcloud compute url-maps export flygaca-lb --global` after a
> minimal create and match the schema your CLI reports, rather than guessing.

### Certificate and forwarding rules

```bash
gcloud compute ssl-certificates create flygaca-cert \
  --global --domains=flygaca.com,www.flygaca.com,api.flygaca.com

gcloud compute target-https-proxies create flygaca-https \
  --url-map=flygaca-lb --ssl-certificates=flygaca-cert
gcloud compute forwarding-rules create flygaca-https-fr \
  --global --target-https-proxy=flygaca-https \
  --address=flygaca-ip --ports=443

# Plain :80 must redirect, not serve. HSTS only protects a browser that has already
# been to the site once over HTTPS; the first visit is this one.
gcloud compute url-maps import flygaca-redirect --global --source=<(cat <<YAML
name: flygaca-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
YAML
)
gcloud compute target-http-proxies create flygaca-http --url-map=flygaca-redirect
gcloud compute forwarding-rules create flygaca-http-fr \
  --global --target-http-proxy=flygaca-http --address=flygaca-ip --ports=80
```

---

## 6. DNS

```bash
gcloud dns managed-zones create flygaca --dns-name=flygaca.com. \
  --description="Fly GACA production"

for NAME in flygaca.com. www.flygaca.com. api.flygaca.com.; do
  gcloud dns record-sets create "$NAME" --zone=flygaca --type=A --ttl=300 \
    --rrdatas="$LB_IP"
done

# Point the registrar at these before expecting the certificate to issue:
gcloud dns managed-zones describe flygaca --format='value(nameServers)'
```

> **This is where launches stall.** A Google-managed certificate stays `PROVISIONING` until
> the domain resolves publicly to the load balancer, and that can take 15–60 minutes after
> nameservers propagate. It is not broken; it is waiting. Watch it:
>
> ```bash
> gcloud compute ssl-certificates describe flygaca-cert --global \
>   --format='value(managed.status, managed.domainStatus)'
> ```
>
> Do not start debugging the url-map until this reports `ACTIVE`.

---

## 7. Verify before handing over to go-live

```bash
curl -sI https://flygaca.com/            | head -1   # 200
curl -sI https://flygaca.com/library     | head -1   # 200 — a prerendered deep link
curl -sI https://flygaca.com/checkout/return | head -1   # 200 — the SPA fallback (§5)
curl -s  https://flygaca.com/healthz                 # {"ok":true,...} — /api routing works
curl -sI http://flygaca.com/             | head -1   # 301 to https
curl -sI https://www.flygaca.com/        | head -1   # 301 to the apex
curl -sI https://flygaca.com/guides      | head -1   # 301 to /learn

# Security headers are applied per BACKEND and are NOT set by anything above.
# RUNBOOK-golive.md §2 is what applies them, and it can only run now that
# flygaca-web and flygaca-api exist.
curl -sI https://flygaca.com/ | grep -i 'strict-transport-security\|content-security-policy'
```

An empty result from that last line means go-live §2 has not been run yet — the canonical
front is serving no CSP and no HSTS.

---

## 8. Close the side door

Cloud Run is deployed `--allow-unauthenticated` so the load balancer can reach it, which also
leaves the raw `*.run.app` URL as a live alternate front door to the payments API — no CDN,
no WAF, and none of the response headers from `config/headers.json`. Once the NEG is serving,
shut it:

```bash
gcloud run services update flygaca-api --region="$REGION" \
  --ingress=internal-and-cloud-load-balancing
```

From then on the health check is `https://api.flygaca.com/healthz`, not the run.app URL.

---

## 9. A budget alert

`RUNBOOK-golive.md` checks for one; nothing creates it. The corpus bucket serves ~65 MB of
JSON and egress is the line that surprises people.

```bash
gcloud billing budgets create \
  --billing-account="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)' | sed 's|.*/||')" \
  --display-name="Fly GACA production" \
  --budget-amount=500SAR \
  --threshold-rule=percent=50 --threshold-rule=percent=90 --threshold-rule=percent=100
```

---

## Repo variables this produces

Set these under **Settings → Secrets and variables → Actions → Variables**, as
`RUNBOOK-golive.md` §4 lists them:

| Variable | Value from |
| --- | --- |
| `GCP_PROJECT_ID` | `$PROJECT_ID` |
| `WIF_PROVIDER` | the `providers describe` output in §4 |
| `DEPLOY_SERVICE_ACCOUNT` | `$DEPLOY_SA` |
| `WEB_BUCKET` | `gs://$WEB_BUCKET` |
| `DATA_BUCKET` | `gs://flygaca-data` |
| `URL_MAP` | `flygaca-lb` |
| `DATA_BASE_URL` | `https://storage.googleapis.com/flygaca-data/data` |

> `DATA_BUCKET` and `DATA_BASE_URL` must be set **together**. They are independent variables
> feeding two different steps — one decides where the corpus is uploaded, the other is
> compiled into the bundle — and an unset Actions variable expands to an empty string with no
> error. Setting only one silently ships an app that fetches the corpus from somewhere nothing
> uploaded to, or uploads it somewhere nothing fetches from.
