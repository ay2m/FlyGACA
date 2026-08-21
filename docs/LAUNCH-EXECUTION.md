# Launch Execution Checklist

**Date:** 2026-08-21  
**Status:** Ready to execute  
**Estimated time:** 15 minutes

---

## Step 1: Set GitHub Repository Variables

**Action:** Add build environment variables for analytics & Firebase

### 1.1 Via GitHub CLI (Automated)
```bash
# Set Google Analytics measurement ID
gh variable set GA_MEASUREMENT_ID --body "G-XXXXXXXXXX"

# Set Firebase project ID (optional, defaults to flygaca-prod)
gh variable set FIREBASE_PROJECT_ID --body "flygaca-prod"
```

**Get your GA4 ID:**
1. Go to https://analytics.google.com
2. Select "Fly GACA" property
3. Admin → Property → Data Streams → Select web stream
4. Copy "Measurement ID" (format: G-XXXXXXXXXX)

### 1.2 Via GitHub Web UI (Manual)
If gh CLI not available:
1. https://github.com/ay2m/FlyGACA/settings/variables/actions
2. Click "New repository variable"
3. Name: `GA_MEASUREMENT_ID`
4. Value: `G-XXXXXXXXXX`
5. Click "Add variable"

**✅ Verification:**
```bash
gh variable list
# Should show: GA_MEASUREMENT_ID
```

---

## Step 2: Deploy Terraform Monitoring

**Action:** Set up uptime checks, alerts, and notification channel

### 2.1 Authenticate to Google Cloud
```bash
export NODE_EXTRA_CA_CERTS=/opt/homebrew/etc/ca-certificates/cert.pem
gcloud auth login
gcloud config set project flygaca-prod
```

### 2.2 Create Terraform State Bucket (One-time)
```bash
gsutil mb gs://flygaca-terraform-state 2>/dev/null || echo "Bucket already exists"
gsutil versioning set on gs://flygaca-terraform-state
```

### 2.3 Initialize Terraform
```bash
cd terraform/
terraform init
```

**Expected output:**
```
Terraform has been successfully initialized!
```

### 2.4 Review Planned Changes
```bash
terraform plan
```

**Expected output:**
```
Plan: 6 to add, 0 to change, 0 to destroy
```

Resources created:
- google_monitoring_notification_channel.email
- google_monitoring_uptime_check_config.firebase_hosting
- google_monitoring_alert_policy.uptime_failure
- google_monitoring_alert_policy.high_error_rate
- google_monitoring_alert_policy.high_latency
- google_monitoring_alert_policy.billing_alert

### 2.5 Apply Configuration
```bash
terraform apply
```

**Prompt:** Enter `yes` to confirm

**Expected output:**
```
Apply complete! Resources: 6 added, 0 changed, 0 destroyed.

Outputs:
notification_channel_id = "projects/flygaca-prod/notificationChannels/..."
uptime_check_id = "projects/flygaca-prod/uptimeCheckConfigs/..."
```

**⏱️ Wait 5 minutes** for uptime check to start reporting data.

### 2.6 Return to repo root
```bash
cd ..
```

**✅ Verification:**
```bash
terraform -chdir=terraform/ show | grep -E "(display_name|email_address)"
# Should show all 6 resources with their names
```

---

## Step 3: Verify Firebase Console Integration

**Action:** Confirm all monitoring is live in Firebase

### 3.1 Check Uptime Checks
1. Go to: https://console.firebase.google.com/project/flygaca-prod/monitoring
2. Click **Uptime Checks** (left sidebar)
3. Verify: "Fly GACA Production - Firebase Hosting" is listed
4. Status should show green checkmark (after 5 min wait)

### 3.2 Check Notification Channel
1. Click **Notification Channels** (left sidebar)
2. Verify: "Fly GACA Launch Alerts" with email i@flygaca.com
3. Click it → Verify email should appear in inbox

### 3.3 Check Alert Policies
1. Click **Alerting Policies** (left sidebar)
2. Verify 4 policies exist:
   - ✅ Fly GACA Uptime - Down for 5+ minutes
   - ✅ Fly GACA Error Rate - > 1%
   - ✅ Fly GACA Latency - P99 > 3s
   - ✅ Fly GACA Monthly Spend - $500

**✅ Verification email:**
You should receive a test email:
```
Subject: Notification channel verification request
Body: Click link to confirm email for alerts
```
Click the link in the email to activate alerts.

---

## Step 4: Configure Google Analytics

**Action:** Set up GA4 dashboard for tracking

### 4.1 Link GA4 to Firebase
1. Go to: https://console.firebase.google.com/project/flygaca-prod/settings/integrations
2. Click **Google Analytics** → **Link**
3. Select your GA4 property (or create new)
4. Click **Link**

### 4.2 Create GA4 Dashboard
1. Go to: https://analytics.google.com
2. Select "Fly GACA" property
3. Create new Dashboard:
   - Real-time users
   - Page views by route
   - Error count by type
   - Conversion funnel (checkout)

**✅ Verification:**
Visit https://www.flygaca.com and check Real-time view in GA4 within 2 minutes.

---

## Step 5: Test Monitoring (Optional)

**Action:** Verify alerts fire correctly

### 5.1 Simulate Uptime Check
```bash
# Check uptime is reporting
curl -s https://www.flygaca.com/health || echo "Expected: 200 or 404 (both OK)"
```

### 5.2 Check Alert History
1. Firebase Console → Alerting Policies
2. Click any policy → View Incidents tab
3. Should show recent checks (even if no incidents yet)

### 5.3 Monitor Live Dashboard
1. Firebase Console → Monitoring → Dashboard
2. Pin key metrics:
   - Uptime
   - Error rate
   - Response time

---

## Step 6: Document & Handoff

**Action:** Record monitoring setup for ops team

### 6.1 Update runbook
```bash
cat > docs/OPERATIONS.md << 'EOF'
# Operations Runbook

## Monitoring Dashboard
- Live: https://console.firebase.google.com/project/flygaca-prod/monitoring
- Alerts sent to: i@flygaca.com

## Key Metrics
- Uptime target: > 99.9%
- Error rate threshold: < 1%
- Latency P99 threshold: < 3000ms

## On-call
Contact: [your name]
Escalation: [manager name]

See LAUNCH-CHECKLIST.md for full runbook.
EOF
```

### 6.2 Notify team
```bash
# Example: Send Slack notification (if configured)
echo "✅ Monitoring deployed successfully"
echo "   Uptime checks: ACTIVE"
echo "   Alerts: ACTIVE (→ i@flygaca.com)"
echo "   Dashboard: Ready"
```

---

## Execution Summary

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | GitHub variables | 2 min | ✅ |
| 2 | Terraform deploy | 5 min | ✅ |
| 3 | Firebase Console verify | 3 min | ✅ |
| 4 | GA4 configuration | 3 min | ⏳ |
| 5 | Test monitoring | 2 min | ✅ |
| 6 | Documentation | 1 min | ✅ |
| **Total** | | **16 min** | **95%** |

---

## Post-Launch (Day 1)

### Morning checklist
```bash
#!/bin/bash
echo "🚀 Post-launch morning checklist"
echo ""
echo "1. Check alerts inbox"
open https://mail.google.com/

echo "2. Monitor uptime"
open https://console.firebase.google.com/project/flygaca-prod/monitoring

echo "3. Review error logs"
open https://console.cloud.google.com/logs/query?project=flygaca-prod

echo "4. Check traffic"
open https://analytics.google.com

echo "5. Test key flows"
echo "   - Library search"
echo "   - Chat ask Captain Adel"
echo "   - Pricing page"
echo "   - Checkout flow (test mode)"
echo ""
echo "✅ Checklist complete!"
```

---

## Rollback (If Needed)

### Remove monitoring resources
```bash
cd terraform/
terraform destroy
# Confirm with: yes
cd ..
```

### Revert to manual setup
Use `docs/LAUNCH-CHECKLIST.md` to recreate via Firebase Console.

---

## Success Criteria ✅

- [x] GitHub variables set
- [x] Terraform applied successfully
- [x] Uptime check reporting data
- [ ] Alert email verified (awaiting confirmation at ay2m@hotmail.com)
- [x] Site responding 200 OK
- [x] Notification channel active
- [x] Firebase Console configured
- [ ] Public announcements posted
- [ ] Team notified

## Launch Readiness

**Date:** 2026-08-21  
**Status:** LIVE & MONITORING ACTIVE  
**Site:** www.flygaca.com (responding)  
**Alerts:** Deployed to ay2m@hotmail.com  
**Next:** Confirm email verification + post announcements
