# Firebase Monitoring Terraform

Infrastructure-as-code for Firebase Hosting monitoring, alerting, and dashboards.

> [!WARNING]
> **Read this before applying.** Two things do not line up with the rest of the repo:
>
> - It targets project **`flygaca-prod`** (`main.tf`, `gcp_project_id` default). That project id
>   appears nowhere else in the family — `CLAUDE.md` documents `flygaca-sa`, `flygaca-app` and
>   `flygaca-dev`. Confirm the project before running `terraform apply`.
> - The uptime check monitors **`flygaca.com`**, currently served by Vercel edge infrastructure
>   with automated deployments from `main`.
>
> Whether this configuration has ever been applied is not recorded here. Run
> `terraform plan` first and read the diff.

## What's included

- **Uptime checks** — Monitors www.flygaca.com from 3 global regions every 60 seconds
- **Notification channel** — Email alerts to i@flygaca.com
- **Alert policies**:
  - Uptime failure (down for 5+ minutes)
  - High error rate (> 1%)
  - High latency (p99 > 3000ms)
  - Billing spend (> $500/month)

## Prerequisites

1. **Terraform** (>= 1.0)
   ```bash
   terraform version  # should be >= 1.0
   ```

2. **Google Cloud SDK**
   ```bash
   gcloud auth login
   gcloud config set project flygaca-prod
   ```

3. **GCS bucket for state** (one-time setup)
   ```bash
   gsutil mb gs://flygaca-terraform-state
   gsutil versioning set on gs://flygaca-terraform-state
   ```

4. **Permissions** — Your GCP account needs:
   - Monitoring Admin (`roles/monitoring.admin`)
   - Compute Admin (`roles/compute.admin`)

## Deployment

### 1. Initialize Terraform
```bash
cd terraform/
terraform init
```

### 2. Review planned changes
```bash
terraform plan
```

Expected output: 6 resources to create
- 1 notification channel (email)
- 1 uptime check
- 4 alert policies

### 3. Apply configuration
```bash
terraform apply
```

Confirm by typing `yes`.

### 4. Verify in Firebase Console
After apply completes, check:
- **Firebase Console → Monitoring → Uptime Checks** — Should show "Fly GACA Production"
- **Monitoring → Alerting Policies** — Should show 4 new policies
- Confirm email delivery to i@flygaca.com

## Configuration

Edit `terraform.tfvars` to customize:

| Variable | Default | Purpose |
|----------|---------|---------|
| `gcp_project_id` | `flygaca-prod` | GCP project ID |
| `firebase_domain` | `www.flygaca.com` | Monitored domain |
| `alert_email` | `i@flygaca.com` | Alert recipient |

After editing, run:
```bash
terraform plan
terraform apply
```

## Monitoring Dashboard

Real-time monitoring is available at:
- **Firebase Console:** https://console.firebase.google.com/project/flygaca-prod/monitoring
- **Google Cloud Monitoring:** https://console.cloud.google.com/monitoring?project=flygaca-prod

### Key metrics to watch

**Uptime**
```
Path: Monitoring → Uptime Checks
Shows: % uptime by region, outage timeline
```

**Errors**
```
Path: Monitoring → Metrics → appengine.googleapis.com/http/server_errors
Shows: Error rate over time by status code
```

**Latency**
```
Path: Monitoring → Metrics → appengine.googleapis.com/http/server_response_latencies
Shows: P50, P95, P99 latency
```

**Billing**
```
Path: Billing → Reports
Shows: Daily and monthly spend trends
```

## Alerts

When monitoring thresholds are breached, you'll receive emails like:

```
Subject: ALERT Fly GACA Uptime - Down for 5+ minutes

Policy: Fly GACA Uptime - Down for 5+ minutes
Resource: www.flygaca.com
Condition: Uptime check failure
Time: 2026-08-21 15:30:00 UTC
Duration: 5+ minutes

[View in Console] [Acknowledge]
```

## Updating Alerts

To change thresholds or add new alerts:

1. Edit `main.tf` in the relevant resource block
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to deploy

Example: Lowering latency alert threshold to 2s:
```hcl
condition_threshold {
  threshold_value = 2000  # Changed from 3000
  ...
}
```

Then:
```bash
terraform plan
terraform apply
```

## Cleanup

To remove all monitoring resources:
```bash
terraform destroy
```

Confirm by typing `yes`.

## Troubleshooting

### Terraform state is locked
```bash
terraform force-unlock <LOCK_ID>
```

### Notification channel not receiving emails
1. Check spam folder
2. Verify email in `terraform.tfvars`
3. Confirm in Firebase Console: Monitoring → Notification Channels
4. Re-run: `terraform apply`

### Uptime check shows "No data"
Uptime checks take 5-10 minutes to report initial data. Wait and refresh the console.

### Error: "Permission denied"
Ensure your GCP account has `roles/monitoring.admin`:
```bash
gcloud projects get-iam-policy flygaca-prod \
  --flatten="bindings[].members" \
  --filter="bindings.role:monitoring.admin"
```

If missing, ask an owner to grant the role.

## References

- [Terraform Google Provider Docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Firebase Monitoring Guide](https://firebase.google.com/docs/projects/manage-installations#monitor)
- [Google Cloud Uptime Checks](https://cloud.google.com/monitoring/uptime-checks)
