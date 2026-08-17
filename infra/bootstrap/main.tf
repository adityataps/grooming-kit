terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "project_id" {
  type        = string
  description = "GCP project ID that will host the grooming-kit infrastructure."
}

variable "region" {
  type        = string
  default     = "us-east1"
  description = "GCP region for the state bucket (must match infra/variables.tf's region for consistency, though not strictly required)."
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# The bucket Terraform's own remote state (for the root ../infra module) lives in. This can't be
# created by the same config that references it as a backend, hence this standalone bootstrap
# config — applied once, by hand, with local state.
resource "google_storage_bucket" "tf_state" {
  name                        = "${var.project_id}-grooming-kit-tfstate"
  location                    = "US"
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }
}

output "tf_state_bucket" {
  value       = google_storage_bucket.tf_state.name
  description = "Pass this to `terraform init -backend-config=\"bucket=<value>\"` in ../"
}
