# Infrastructure — Terraform

Implements the design in [`../docs/infra.md`](../docs/infra.md). Single production environment,
GCP + Cloudflare, no environments/staging (see that doc for the full rationale, cost analysis,
and architecture diagram).

## One-time setup

1. **Bootstrap the state bucket** (see `bootstrap/README.md`):
   ```bash
   cd bootstrap
   terraform init
   terraform apply -var="project_id=<your-gcp-project-id>"
   # note the tf_state_bucket output
   ```

2. **Configure Cloudflare auth** for local `terraform` runs — a scoped API token via env var
   (never stored in tfvars or state):
   ```bash
   export CLOUDFLARE_API_TOKEN="<token with Zone:DNS:Edit + Zone:Cache Purge:Edit>"
   ```

3. **Authenticate to GCP** for local runs:
   ```bash
   gcloud auth application-default login
   ```

4. **Configure variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars   # gitignored — fill in real values
   ```

5. **Init with the bootstrap bucket and apply**:
   ```bash
   terraform init -backend-config="bucket=<tf_state_bucket output from step 1>"
   terraform plan
   terraform apply
   ```

6. After the first `apply`, set the CI secrets below from `terraform output`, and manually set
   the Cloudflare SSL modes noted in `dns.tf` (not exposed via the Terraform provider).

## Required GitHub Actions secrets

| Secret | Source | Used by |
|---|---|---|
| `WIF_PROVIDER` | `terraform output wif_provider` | deploy-frontend, deploy-backend |
| `WIF_PR_PROVIDER` | `terraform output wif_pr_provider` | terraform-plan |
| `FRONTEND_DEPLOYER_SA` | `terraform output frontend_deployer_sa` | deploy-frontend |
| `BACKEND_DEPLOYER_SA` | `terraform output backend_deployer_sa` | deploy-backend |
| `TERRAFORM_PLAN_SA` | `terraform output terraform_plan_sa` | terraform-plan |
| `FRONTEND_BUCKET` | `terraform output frontend_bucket` | deploy-frontend |
| `ARTIFACT_REGISTRY_REPO` | `terraform output artifact_registry_repo` | deploy-backend |
| `API_URL` | `https://` + `terraform output api_domain` | deploy-frontend |
| `GCP_PROJECT_ID` | your GCP project ID | deploy-backend, terraform-plan |
| `GCP_REGION` | `region` var (default `us-east1`) | deploy-backend |
| `TF_STATE_BUCKET` | `terraform output` from `bootstrap/` | terraform-plan |
| `CLOUDFLARE_ZONE_ID` | your Cloudflare zone ID | deploy-frontend, terraform-plan |
| `CLOUDFLARE_API_TOKEN` | scoped Cloudflare API token | deploy-frontend |

No GCP service-account keys are ever stored — all GitHub → GCP auth goes through Workload
Identity Federation (`google-github-actions/auth`).

## Why two WIF providers

`ci-cd.tf` defines **two** WIF providers under one pool:
- `github-provider` — only accepts tokens from pushes to `main`; the two deploy service accounts
  (`frontend-deployer`, `backend-deployer`, both with write access) trust *only* this provider.
- `github-provider-pr` — accepts tokens from any ref in this repo (needed because PR-triggered
  workflows present a different OIDC `ref` claim); only the read-only `terraform-plan` service
  account trusts this provider.

Each provider stamps a distinct literal `attribute.provider` value (`main-deploy` vs. `pr-plan`),
and each service account's IAM binding is scoped to that attribute — not just `attribute.repository`
— specifically because a plain repository-scoped binding would let *any* provider in the pool
(including the permissive PR one) impersonate the write-capable deploy SAs. See the comments in
`ci-cd.tf` for the full explanation.

## Layout

See `../docs/infra.md` §3 for the full file-by-file rationale. `terraform fmt`/`validate` are
run as part of every change to this directory — there is no separate lint config.
