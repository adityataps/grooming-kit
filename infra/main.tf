terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Auth via CLOUDFLARE_API_TOKEN env var (a scoped "Zone:DNS:Edit" + "Zone:Cache Purge:Edit"
# token) — never store it in tfvars or state.
provider "cloudflare" {}

locals {
  ui_domain  = "${var.subdomain}.${var.domain_root}"
  api_domain = "api.${var.subdomain}.${var.domain_root}"
}
