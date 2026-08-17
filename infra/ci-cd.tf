# Workload Identity Federation (GitHub OIDC) — no stored GCP service-account keys anywhere.
# See docs/infra.md §4.3.
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    # Literal constant (not derived from the assertion) — see the note on github_pr below for
    # why this matters: it's what actually keeps the two providers' trust isolated within the
    # same pool, not the ref/repository conditions alone.
    "attribute.provider" = "'main-deploy'"
  }

  # Restrict to this repo AND the main branch — deploys only run from merges to main.
  attribute_condition = "assertion.repository == '${var.github_repo}' && assertion.ref == 'refs/heads/main'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "frontend_deployer" {
  account_id   = "frontend-deployer"
  display_name = "grooming-kit frontend deployer (GitHub Actions)"
}

resource "google_service_account" "backend_deployer" {
  account_id   = "backend-deployer"
  display_name = "grooming-kit backend deployer (GitHub Actions)"
}

# Least privilege: frontend deployer can only write to the SPA bucket.
resource "google_storage_bucket_iam_member" "frontend_deployer_write" {
  bucket = google_storage_bucket.spa.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.frontend_deployer.email}"
}

# Least privilege: backend deployer can push images + deploy the one Cloud Run service.
resource "google_artifact_registry_repository_iam_member" "backend_deployer_push" {
  repository = google_artifact_registry_repository.backend.name
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.backend_deployer.email}"
}

resource "google_cloud_run_v2_service_iam_member" "backend_deployer_deploy" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.backend_deployer.email}"
}

# Bind each SA to the WIF pool, scoped by the `main-deploy` provider attribute set above — NOT
# just `attribute.repository`, which alone would let ANY provider in this pool (including
# github-provider-pr below, which accepts non-main refs) impersonate these SAs, since IAM
# bindings on a service account are pool-scoped, not provider-scoped. Keying the trust boundary
# off a literal per-provider attribute is what actually keeps `github-provider-pr` from being
# able to mint tokens that can impersonate these write-capable deploy SAs.
resource "google_service_account_iam_member" "frontend_wif_binding" {
  service_account_id = google_service_account.frontend_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.provider/main-deploy"
}

resource "google_service_account_iam_member" "backend_wif_binding" {
  service_account_id = google_service_account.backend_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.provider/main-deploy"
}

# --- Optional: read-only `terraform plan` on PRs (docs/infra.md §5.3) ---
#
# PR-triggered workflows present a different OIDC `ref` claim (the PR's merge ref, not
# `refs/heads/main`), so they can't use the provider above (deliberately restricted to
# main-branch pushes only, for the two deploy SAs). This is a second, separate provider scoped to
# this repo only (any ref) bound to a single read-only service account — never anything
# IAM-modifying, per the "apply stays manual" decision in docs/infra.md §5.3.
resource "google_iam_workload_identity_pool_provider" "github_pr" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider-pr"
  display_name                       = "GitHub OIDC (pull requests)"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    # Distinct literal from github-provider's "main-deploy" — see the comment on the deploy SA
    # bindings above for why this (not the repository condition) is the real trust boundary.
    "attribute.provider" = "'pr-plan'"
  }

  attribute_condition = "assertion.repository == '${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "terraform_plan" {
  account_id   = "terraform-plan"
  display_name = "grooming-kit terraform plan, read-only (GitHub Actions PRs)"
}

# Project-level read access is required for `terraform plan` to inspect every resource type in
# this config (Cloud Run, GCS, Artifact Registry, IAM) — but roles/viewer grants no write/modify
# permissions of any kind.
resource "google_project_iam_member" "terraform_plan_viewer" {
  project = var.project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.terraform_plan.email}"
}

resource "google_service_account_iam_member" "terraform_plan_wif_binding" {
  service_account_id = google_service_account.terraform_plan.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.provider/pr-plan"
}
