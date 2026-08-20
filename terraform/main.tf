terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "flygaca-terraform-state"
    prefix = "firebase-monitoring"
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
    "EUROPE",
    "ASIA_PAC"
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

      trigger_percent = 0.5
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert policy for high error rate
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "Fly GACA Error Rate - > 1%"
  combiner     = "OR"

  conditions {
    display_name = "High error rate detected"

    condition_threshold {
      filter          = "resource.type = \"gae_app\" AND metric.type = \"appengine.googleapis.com/http/server_errors\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01

      aggregations {
        alignment_period  = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert policy for high latency
resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "Fly GACA Latency - P99 > 3s"
  combiner     = "OR"

  conditions {
    display_name = "High latency (p99 > 3000ms)"

    condition_threshold {
      filter          = "resource.type = \"gae_app\" AND metric.type = \"appengine.googleapis.com/http/server_response_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 3000

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_99"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert policy for billing
resource "google_monitoring_alert_policy" "billing_alert" {
  display_name = "Fly GACA Monthly Spend - $500"
  combiner     = "OR"

  conditions {
    display_name = "Spend exceeds budget"

    condition_threshold {
      filter          = "resource.type = \"global\" AND metric.type = \"compute.googleapis.com/billing/spend\""
      duration        = "0s"
      comparison      = "COMPARISON_GT"
      threshold_value = 500

      aggregations {
        alignment_period  = "2592000s"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
  alert_strategy {
    auto_close = "86400s"
  }
}

output "notification_channel_id" {
  description = "Notification channel ID for alerts"
  value       = google_monitoring_notification_channel.email.id
}

output "uptime_check_id" {
  description = "Uptime check ID"
  value       = google_monitoring_uptime_check_config.firebase_hosting.uptime_check_id
}
