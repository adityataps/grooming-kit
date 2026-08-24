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
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
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

# Auth via GITHUB_TOKEN env var (a PAT — classic "repo" scope, or fine-grained with
# "Secrets: write" — never store it in tfvars or state). Only used to manage the
# github_actions_secret resources in github-secrets.tf; see that file for what's deliberately
# NOT managed this way (i.e. CLOUDFLARE_API_TOKEN itself).
provider "github" {
  owner = local.github_owner
}

locals {
  ui_domain  = "${var.subdomain}.${var.domain_root}"
  api_domain = "api.${var.subdomain}.${var.domain_root}"

  # var.github_repo is "owner/repo" — split once here rather than repeating the split() call
  # at every github_actions_secret resource in github-secrets.tf.
  github_repo_parts = split("/", var.github_repo)
  github_owner      = local.github_repo_parts[0]
  github_repo_name  = local.github_repo_parts[1]

  # GCP labels (its equivalent of AWS-style tags) applied to every resource type that supports
  # them below — for cost attribution and quick identification in the console. Values must be
  # lowercase and match [a-z0-9_-]{1,63}, hence "grooming-kit" not "Grooming Kit".
  labels = {
    app        = "grooming-kit"
    managed_by = "terraform"
    env        = "production"
  }
}
