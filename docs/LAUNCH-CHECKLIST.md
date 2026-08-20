# Launch Checklist — Firebase Hosting

**Date:** 2026-08-21  
**Status:** 🚀 Ready for production

---

## Pre-launch ✅

- [x] Site built and deployed to Firebase Hosting
- [x] Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- [x] CI/CD pipeline automated (GitHub Actions → Firebase auto-deploy)
- [x] Full prerender enabled (643/646 URLs, 99.5% coverage)
- [x] SEO configured (hreflang, sitemap, canonicals, JSON-LD)
- [x] GitHub security vulnerabilities fixed (uuid override)
- [x] Google Analytics 4 enabled (via gtag)
- [x] Firebase Crash Reporting enabled (client error tracking)

---

## Post-launch (do after going live)

### 1. Set up Uptime Monitoring
**Firebase Console → Monitoring → Uptime Checks**

Create an uptime check for production:
```
Name: Fly GACA Production
Resource type: URL
Protocol: HTTPS
Host: www.flygaca.com
Path: /
Check interval: 60 seconds (or preferred interval)
Timeout: 10 seconds
Regions: Select 3+ regions for redundancy
```

Add a notification channel:
```
Type: Email
Display name: Fly GACA Alerts
Email: i@flygaca.com
```

Link the check to the notification channel for instant alerts on downtime.

### 2. Create Alerting Policy
**Firebase Console → Monitoring → Alerting Policies**

Alert on:
- Uptime check failure (5+ consecutive failed checks)
- High error rate (errorRate > 5% over 5 minutes)
- Elevated latency (p99 latency > 3000ms)

Notification channels:
- Email to i@flygaca.com
- (Optional) Slack integration if available

### 3. Monitor Traffic & Errors
**Firebase Console → Analytics**

Real-time dashboards:
- User count (real-time)
- Page views by route
- Conversion funnel (checkout)
- Exception rate by error type

**Cloud Logging** (if using Cloud Run for API):
- Log queries: `severity >= ERROR`
- Dashboard: request rate, latency, error distribution

### 4. Performance Monitoring
**Firebase Console → Performance**

Track:
- Page load time by route
- Core Web Vitals (LCP, INP, CLS)
- Custom events (purchase, feature usage)

### 5. Set Up Email Notifications
Add billing alert in Firebase Console:
```
Billing → Budgets and alerts
Budget: $500/month (adjust as needed)
Alert threshold: 50%, 90%, 100%
Email: i@flygaca.com
```

---

## Key Metrics to Watch (Launch Week)

| Metric | Healthy | Investigate |
|--------|---------|------------|
| **Uptime** | > 99.9% | < 99.9% |
| **Error rate** | < 0.1% | > 1% |
| **P50 latency** | < 500ms | > 1000ms |
| **Core Web Vitals (LCP)** | < 2.5s | > 4s |
| **Daily active users** | Target TBD | 0 or declining |

---

## Deployment Verification

Test post-launch:
```bash
# Verify site is live
curl -I https://www.flygaca.com/
# Expected: HTTP/2 200

# Verify security headers
curl -I https://www.flygaca.com/ | grep -E "(CSP|HSTS|X-Frame)"
# Expected: All headers present

# Verify sitemap
curl https://www.flygaca.com/sitemap.xml | head -20
# Expected: 704 URLs listed

# Verify analytics firing (check browser console)
# Expected: gtag sending events to Google Analytics
```

---

## Rollback Plan

If critical issues arise:

1. **Immediate:** Revert last commit
   ```bash
   git revert HEAD
   npm run build
   npm run deploy:firebase
   ```

2. **API issues:** Redeploy to Cloud Run (if using)
   ```bash
   npm run deploy:api
   ```

3. **Database:** Check Cloud SQL backups in GCP Console

4. **Communication:** Update status page / notify users on social

---

## Post-Launch Activities

**Day 1:**
- Monitor error logs and analytics dashboards every hour
- Verify all key user flows work end-to-end
- Check mobile PWA installation

**Week 1:**
- Analyze traffic patterns and top pages
- Review exception logs for patterns
- Optimize high-latency routes if needed
- Gather user feedback from support

**Month 1:**
- Review Core Web Vitals trends
- Analyze conversion funnel drop-off
- Plan next feature batch based on usage data

---

## Emergency Contacts

- **On-call:** @you (set up GitHub team if multi-person)
- **Support email:** i@flygaca.com
- **Incident channel:** (set up Slack if desired)

---

## Launch Sign-off

- [ ] All pre-launch items verified
- [ ] Uptime monitoring configured
- [ ] Alerting policy active
- [ ] Team notified of launch
- [ ] Public announcement scheduled

**Prepared by:** Claude (AI)  
**Review by:** [Your name]  
**Launch date:** 2026-08-21
