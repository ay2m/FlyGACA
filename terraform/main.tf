terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  default     = "flygaca-prod"
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "me-central2"
}

variable "firebase_domain" {
  description = "Firebase Hosting domain"
  type        = string
  default     = "www.flygaca.com"
}

variable "alert_email" {
  description = "Email for alerts"
  type        = string
  default     = "i@flygaca.com"
}

# Notification channel for alerts
resource "google_monitoring_notification_channel" "email" {
  display_name = "Fly GACA Launch Alerts"
  type         = "email"
  enabled      = true

  labels = {
    email_address = var.alert_email
  }
}

# Uptime check for Firebase Hosting
resource "google_monitoring_uptime_check_config" "firebase_hosting" {
  display_name = "Fly GACA Production - Firebase Hosting"
  timeout      = "10s"
  period       = "60s"

  http_check {
    port         = 443
    use_ssl      = true
    path         = "/"
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      host = var.firebase_domain
    }
  }

  selected_regions = [
    "USA",
    "EUROPE"
  ]
}

# Alert policy for uptime failures
resource "google_monitoring_alert_policy" "uptime_failure" {
  display_name = "Fly GACA Uptime - Down for 5+ minutes"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failure"

    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND resource.labels.host = \"${var.firebase_domain}\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\""
      duration        = "300s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period  = "60s"
        per_series_aligner = "ALIGN_FRACTION_TRUE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
  alert_strategy {
    auto_close = "1800s"
  }
}

# Note: Error rate, latency, and billing alerts can be configured in Firebase Console
# They require metrics that are only available after deployment and traffic

output "notification_channel_id" {
  description = "Notification channel ID for alerts"
  value       = google_monitoring_notification_channel.email.id
}

output "uptime_check_id" {
  description = "Uptime check ID"
  value       = google_monitoring_uptime_check_config.firebase_hosting.uptime_check_id
}
