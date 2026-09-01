<div align="center">

# 🏫 B2B Flight Academy Platform & AIP Exam Prep
### Enterprise Ground School Cohorts, Instructor Analytics & Seat Licensing
#### منصة أكاديميات الطيران ومعاهد التدريب · متابعة الجاهزية · التراخيص المؤسسية

<p align="center">
  <img src="https://img.shields.io/badge/Made%20in-Saudi%20Arabia-006C35?style=for-the-badge&labelColor=0a0e12" alt="صنع في السعودية" />
  <img src="https://img.shields.io/badge/Target-Part%20141%20ATOs-0D96F6?style=for-the-badge&labelColor=0a0e12" alt="Part 141 ATOs" />
  <img src="https://img.shields.io/badge/Backend-Cloud%20Run%20%2B%20Postgres-8E75B2?style=for-the-badge&labelColor=0a0e12" alt="Cloud Run" />
  <img src="https://img.shields.io/badge/Billing-ZATCA%20Phase%202-C8A04A?style=for-the-badge&labelColor=0a0e12" alt="ZATCA Phase 2" />
</p>

</div>

---

## 🧭 Overview & Enterprise Offering

The B2B suite is designed for Part 141 Approved Training Organizations (ATOs), airlines, and Air Navigation Service Providers (ANSPs). It packages Fly GACA's curriculum, AIP prep banks, and mock exams into seat-based cohorts with real-time instructor analytics.

```
┌────────────────────────────────────────────────────────┐
│             B2B Flight Academy Dashboard               │
│                   (/business/admin)                    │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │ Cohort      │ │ Weak-Spot   │ │ Stage-Check │
     │ Readiness   │ │ Heatmap     │ │ Eligibility │
     │ Tracker     │ │ (GACAR Part)│ │ Approvals   │
     └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 📚 Document Reading Order & Roadmap

1. **[`PLAN.md`](./PLAN.md)** — Core business strategy, Ideal Customer Profile (ICP), seat packaging, pricing tiers, and GTM roadmap.
2. **[`CURRICULUM.md`](./CURRICULUM.md)** — Detailed mapping of questions, study sheets, and eAIP modules for student cohorts.
3. **[`SALES-ONE-PAGER.md`](./SALES-ONE-PAGER.md)** — Executive pitch deck and prospect summary for ATO directors.
4. **[`PROPOSAL-TEMPLATE.md`](./PROPOSAL-TEMPLATE.md)** — Standard Statement of Work (SOW) and quote template.
5. **[`DELIVERY-PLAYBOOK.md`](./DELIVERY-PLAYBOOK.md)** — Operational manual for onboarding academy cohorts.
6. **[`DESIGN-study-progress-sync.md`](./DESIGN-study-progress-sync.md)** — Architecture specification for user study state synchronization.
7. **[`DESIGN-admin-dashboard.md`](./DESIGN-admin-dashboard.md)** — Technical design for the `/business/admin` reporting portal.

---

## ⚡ Seat Provisioning & Administration Scripts

```bash
# 1. Grant seats to a school cohort from a roster
node server/scripts/grant-school-seats.mjs --org "academy-id" --file roster.csv

# 2. Grant organizational admin entitlements
node server/scripts/grant-org.mjs --email "admin@academy.edu.sa" --org "academy-id"

# 3. Export cohort readiness report
node server/scripts/school-cohort-report.mjs --org "academy-id" --format csv
```

---

<div align="center">

<sub>🇸🇦 صنع في السعودية · Made in Saudi Arabia</sub>

</div>
