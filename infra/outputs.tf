output "ui_domain" {
  value       = local.ui_domain
  description = "SPA hostname (Cloudflare CNAME target: the frontend_bucket output)."
}

output "api_domain" {
  value       = local.api_domain
  description = "Backend API hostname."
}

output "frontend_bucket" {
  value       = google_storage_bucket.spa.name
  description = "GCS bucket name serving the SPA — pass to google-github-actions/upload-cloud-storage's `destination`."
}

output "cloud_run_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Cloud Run's native run.app URL (the domain mapping in api_domain fronts this)."
}

output "artifact_registry_repo" {
  value       = google_artifact_registry_repository.backend.repository_id
  description = "Artifact Registry repository ID — used to build the backend image tag in CI."
}

output "wif_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Full WIF provider resource name (main-branch deploys only) — set as the WIF_PROVIDER GitHub secret."
}

output "wif_pr_provider" {
  value       = google_iam_workload_identity_pool_provider.github_pr.name
  description = "Full WIF provider resource name (any ref, read-only plan SA only) — set as the WIF_PR_PROVIDER GitHub secret."
}

output "terraform_plan_sa" {
  value       = google_service_account.terraform_plan.email
  description = "Set as the TERRAFORM_PLAN_SA GitHub secret."
}

output "frontend_deployer_sa" {
  value       = google_service_account.frontend_deployer.email
  description = "Set as the FRONTEND_DEPLOYER_SA GitHub secret."
}

output "backend_deployer_sa" {
  value       = google_service_account.backend_deployer.email
  description = "Set as the BACKEND_DEPLOYER_SA GitHub secret."
}
