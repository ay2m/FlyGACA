<div align="center">

# ☁️ Infrastructure-as-Code & Cloud Monitoring (Terraform)
### Multi-Region Uptime Checks, Error Rate Alarms & Cloud SLO Monitoring
#### البنية التحتية البرمجية · مراقبة الأداء اللحظي · التنبيهات المتقدمة

<p align="center">
  <img src="https://img.shields.io/badge/Made%20in-Saudi%20Arabia-006C35?style=for-the-badge&labelColor=0a0e12" alt="صنع في السعودية" />
  <img src="https://img.shields.io/badge/Terraform-%3E%3D%201.0-844FBA?style=for-the-badge&logo=terraform&logoColor=white&labelColor=0a0e12" alt="Terraform" />
  <img src="https://img.shields.io/badge/Provider-Google%20Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white&labelColor=0a0e12" alt="GCP" />
  <img src="https://img.shields.io/badge/SLO-99.9%25%20Uptime-006C35?style=for-the-badge&labelColor=0a0e12" alt="SLO" />
</p>

</div>

---

## 🧭 Overview & Monitored Resources

This directory contains Terraform definitions for monitoring and alerting infrastructure on Google Cloud Platform (GCP) for Fly GACA production services.

### Key Monitored SLOs & Policies
- **Multi-Region Uptime Checks:** Global probes checking `flygaca.com` every 60 seconds from Europe, North America, and Middle East regions.
- **Latency Alarms:** Alerts when 99th percentile response latency exceeds 3,000 ms.
- **Error Rate Alarms:** Alerts when 5xx HTTP response rates exceed 1.0% over a 5-minute rolling window.
- **Budget Thresholds:** Automatic incident notifications if monthly compute spend exceeds forecast boundaries.

---

## ⚡ Deployment & Workflow

### 1. Prerequisites & GCP Authentication
```bash
# Ensure Terraform is installed
terraform version # >= 1.0

# Authenticate with Google Cloud
gcloud auth login
gcloud config set project flygaca-prod
```

### 2. Initialize Remote State
```bash
cd terraform
terraform init
```

### 3. Review Plan & Apply
```bash
terraform plan
terraform apply
```

---

## 📋 Configuration Variables (`terraform.tfvars`)

| Variable | Default Value | Description |
|:---|:---|:---|
| `gcp_project_id` | `flygaca-prod` | Target GCP project identifier. |
| `firebase_domain` | `flygaca.com` | Monitored primary domain name. |
| `alert_email` | `i@flygaca.com` | Primary incident recipient email. |

---

<div align="center">

<sub>🇸🇦 صنع في السعودية · Made in Saudi Arabia</sub>

</div>
