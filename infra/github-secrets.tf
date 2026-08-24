# Populates most of the GitHub Actions secrets documented in ../README.md directly from this
# config's own resources/outputs, via the `integrations/github` provider (see the `github`
# provider block + `local.github_owner`/`local.github_repo_name` in main.tf).
#
# Deliberately NOT managed here: CLOUDFLARE_API_TOKEN. Every value below is a resource
# identifier (service account email, WIF provider name, bucket name, project ID, region, zone
# ID, GCS bucket name...) — none of them grant access on their own (WIF trust is scoped by the
# GitHub OIDC assertion's repo+branch, not by knowing these strings), so having them pass through
# Terraform state is no different a risk than the underlying resources already being in state.
# CLOUDFLARE_API_TOKEN is a live, directly-usable credential — mirroring it into this state file
# would be a real secret-sprawl regression for no benefit, and bootstrapping the `github`
# provider's own auth (a secrets-write-scoped GITHUB_TOKEN) is already a chicken-and-egg problem
# without adding a second one. That one secret stays a manual `gh secret set CLOUDFLARE_API_TOKEN`
# (see ../README.md).

resource "github_actions_secret" "wif_provider" {
  repository  = local.github_repo_name
  secret_name = "WIF_PROVIDER"
  value       = google_iam_workload_identity_pool_provider.github.name
}

resource "github_actions_secret" "wif_pr_provider" {
  repository  = local.github_repo_name
  secret_name = "WIF_PR_PROVIDER"
  value       = google_iam_workload_identity_pool_provider.github_pr.name
}

resource "github_actions_secret" "frontend_deployer_sa" {
  repository  = local.github_repo_name
  secret_name = "FRONTEND_DEPLOYER_SA"
  value       = google_service_account.frontend_deployer.email
}

resource "github_actions_secret" "backend_deployer_sa" {
  repository  = local.github_repo_name
  secret_name = "BACKEND_DEPLOYER_SA"
  value       = google_service_account.backend_deployer.email
}

resource "github_actions_secret" "terraform_plan_sa" {
  repository  = local.github_repo_name
  secret_name = "TERRAFORM_PLAN_SA"
  value       = google_service_account.terraform_plan.email
}

resource "github_actions_secret" "frontend_bucket" {
  repository  = local.github_repo_name
  secret_name = "FRONTEND_BUCKET"
  value       = google_storage_bucket.spa.name
}

resource "github_actions_secret" "artifact_registry_repo" {
  repository  = local.github_repo_name
  secret_name = "ARTIFACT_REGISTRY_REPO"
  value       = google_artifact_registry_repository.backend.repository_id
}

resource "github_actions_secret" "api_url" {
  repository  = local.github_repo_name
  secret_name = "API_URL"
  value       = "https://${local.api_domain}"
}

resource "github_actions_secret" "gcp_project_id" {
  repository  = local.github_repo_name
  secret_name = "GCP_PROJECT_ID"
  value       = var.project_id
}

resource "github_actions_secret" "gcp_region" {
  repository  = local.github_repo_name
  secret_name = "GCP_REGION"
  value       = var.region
}

resource "github_actions_secret" "tf_state_bucket" {
  repository  = local.github_repo_name
  secret_name = "TF_STATE_BUCKET"
  value       = var.tf_state_bucket
}

resource "github_actions_secret" "cloudflare_zone_id" {
  repository  = local.github_repo_name
  secret_name = "CLOUDFLARE_ZONE_ID"
  value       = var.cloudflare_zone_id
}
