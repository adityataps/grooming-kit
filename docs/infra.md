# Infrastructure Design — Scrum Poker & Sprint Retro SPA

## 1. Overview

Single production environment. Root domain `tapshalkar.com` is managed in Cloudflare.
Two subdomains, **no external load balancer**:
- `grooming-kit.tapshalkar.com` → static SPA, served directly from a GCS bucket
- `api.grooming-kit.tapshalkar.com` → Socket.IO/Express backend on Cloud Run

### Why no load balancer
The natural GCP pattern for "static site + API on one domain" is an external HTTPS Application
Load Balancer with path-based routing (`/api/*` → Cloud Run, default → GCS backend bucket).
We evaluated and rejected this: a global forwarding rule costs **~$0.025/hr (~$18/month) per
rule, charged continuously regardless of traffic**, plus data processing fees — a flat cost that
directly undercuts the scale-to-zero design used everywhere else (Cloud Run `min-instances=0`,
Pub/Sub pay-per-message over Memorystore, etc.).

Splitting into two subdomains removes the need for a LB entirely:
- The GCS bucket is fronted **directly** by Cloudflare (CNAME to the bucket's storage endpoint).
- Cloud Run exposes itself directly via its own **native domain mapping** feature (free), with
  Cloudflare DNS pointed at it.

**Tradeoffs accepted:**
- Cross-origin requests (UI origin ≠ API origin) — requires a one-line Socket.IO CORS config
  (`cors: { origin: 'https://grooming-kit.tapshalkar.com' }`) instead of same-origin-by-default.
- Cloud Run domain mapping is GA-adjacent but Google still designates it **"Preview"** and
  recommends the LB approach for production workloads needing multi-region routing, Cloud Armor
  (WAF), or Cloud CDN. None of those apply to this low-traffic internal tool, so the risk is
  acceptable. If those needs emerge later, reintroducing the LB is a contained, additive change
  (nothing else in this design depends on the absence of a LB).
- No Google Cloud CDN in front of the GCS bucket — not a real loss, since Cloudflare (proxied)
  already provides edge caching/CDN for the UI subdomain.

```
Cloudflare DNS (tapshalkar.com zone)
        │
        ├── grooming-kit.tapshalkar.com (CNAME, proxied)  ──▶  GCS bucket (Vite static build)
        │                                                      SSL mode: Flexible
        │                                                      (bucket website endpoint is HTTP-only
        │                                                       for custom-domain-named buckets;
        │                                                       Cloudflare terminates TLS at the edge)
        │
        └── api.grooming-kit.tapshalkar.com (CNAME → ghs.googleapis.com)
                    │
                    ▼
            Cloud Run domain mapping (free, Preview)
                    │
                    ▼
            Cloud Run service (Socket.IO/Express, min=0 / max=1)
```

## 2. Region & Resources

- **Region**: `us-east1` (Cloud Run, Artifact Registry).
- **Resources provisioned**:
  - GCS bucket named exactly `grooming-kit.tapshalkar.com` (required for the direct CNAME
    pattern — GCS matches custom-domain buckets by name)
  - Artifact Registry Docker repo (backend images)
  - Cloud Run service (`min-instances=0`, `max-instances=1` — see `hld.md` §5)
  - Cloud Run domain mapping resource (`api.grooming-kit.tapshalkar.com` → the service)
  - Workload Identity Federation pool + provider (GitHub OIDC)
  - Two deploy service accounts: `frontend-deployer`, `backend-deployer` (least privilege)
  - Two Cloudflare DNS records (CNAME for UI, CNAME for API)

No load balancer, static IP, managed SSL certificate, URL map, backend service/bucket, or
serverless NEG resources are needed — removing an entire category of Terraform resources and
the ~30–60 minute managed-cert provisioning wait that would otherwise gate the first deploy.

## 3. Terraform Layout

```
infra/
├── bootstrap/                    # one-time, run manually before everything else
│   ├── main.tf                   # creates the GCS bucket used for TF remote state itself
│   └── README.md                 # chicken-and-egg note: apply this with local state once
├── main.tf                       # provider blocks: google, cloudflare
├── backend.tf                    # terraform { backend "gcs" { bucket = "<from bootstrap>" } }
├── variables.tf                  # project_id, region, domain, cloudflare_zone_id, github_repo
├── outputs.tf                    # Cloud Run URL, bucket name, WIF provider resource name
├── frontend.tf                   # GCS bucket (website config), public read IAM binding
├── backend-service.tf            # Artifact Registry repo + Cloud Run service + domain mapping
├── ci-cd.tf                      # WIF pool/provider + 2 deploy service accounts + IAM bindings
├── dns.tf                        # cloudflare_record for both subdomains
└── terraform.tfvars              # actual non-secret config values
```

Single root module (not nested submodules) — appropriate for a single-environment, low
-complexity deployment. Revisit as a module if a staging environment is added later.

### 3.1 State backend bootstrap
Terraform needs a GCS bucket to store its own state, which can't be created by the same config
that references it. `bootstrap/` is a tiny, separate Terraform config (local state, applied once
by hand) that creates just that bucket (versioned, uniform bucket-level access). After that,
`infra/backend.tf` points at it and everything else is applied normally.

## 4. Key Resource Sketches

### 4.1 Frontend static hosting (`frontend.tf`)
```hcl
resource "google_storage_bucket" "spa" {
  name                        = "grooming-kit.tapshalkar.com"  # must match the CNAME hostname
  location                    = "US"
  uniform_bucket_level_access = true
  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"   # SPA client-side routing fallback
  }
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.spa.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
```

### 4.2 Backend service + domain mapping (`backend-service.tf`)
```hcl
resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "grooming-kit-backend"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "grooming-kit-backend"
  location = var.region

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 1   # single-instance constraint, see hld.md §5
    }
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/grooming-kit-backend/server:latest"
      ports { container_port = 8080 }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"   # anonymous access — no auth layer in front, per requirements
}

resource "google_cloud_run_domain_mapping" "backend" {
  name     = "api.grooming-kit.tapshalkar.com"
  location = var.region
  metadata {
    namespace = var.project_id
  }
  spec {
    route_name = google_cloud_run_v2_service.backend.name
  }
}
```
The domain mapping resource, once applied, outputs the DNS records Google expects (a CNAME to
`ghs.googleapis.com`); `dns.tf` creates that record and Google auto-provisions the managed cert
once DNS resolves.

### 4.3 Workload Identity Federation (`ci-cd.tf`)
```hcl
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  # Restrict to this repo AND the main branch — deploys only run from merges to main
  attribute_condition = "assertion.repository == 'adityataps/grooming-kit' && assertion.ref == 'refs/heads/main'"
  oidc { issuer_uri = "https://token.actions.githubusercontent.com" }
}

resource "google_service_account" "frontend_deployer" {
  account_id = "frontend-deployer"
}
resource "google_service_account" "backend_deployer" {
  account_id = "backend-deployer"
}

# Least privilege: frontend deployer can only write to the SPA bucket
resource "google_storage_bucket_iam_member" "frontend_deployer_write" {
  bucket = google_storage_bucket.spa.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.frontend_deployer.email}"
}

# Least privilege: backend deployer can push images + deploy the one Cloud Run service
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

# Bind each SA to the WIF pool, scoped to this repo
resource "google_service_account_iam_member" "frontend_wif_binding" {
  service_account_id = google_service_account.frontend_deployer.name
  role                = "roles/iam.workloadIdentityUser"
  member              = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/adityataps/grooming-kit"
}
resource "google_service_account_iam_member" "backend_wif_binding" {
  service_account_id = google_service_account.backend_deployer.name
  role                = "roles/iam.workloadIdentityUser"
  member              = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/adityataps/grooming-kit"
}
```

### 4.4 Cloudflare DNS (`dns.tf`)
```hcl
# UI: direct CNAME to the GCS bucket's website endpoint
resource "cloudflare_record" "ui" {
  zone_id = var.cloudflare_zone_id
  name    = "grooming-kit"
  type    = "CNAME"
  content = "c.storage.googleapis.com"
  proxied = true   # Cloudflare edge CDN/DDoS in front
}

# API: CNAME to Google's domain-mapping frontend (target given by the domain mapping resource)
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api.grooming-kit"
  type    = "CNAME"
  content = "ghs.googleapis.com"
  proxied = false   # DNS-only recommended for Google's domain verification + cert issuance;
                     # can be flipped to proxied=true afterward once the mapping is confirmed working
}
```
**SSL modes**: `grooming-kit` (UI) requires Cloudflare **Flexible** SSL mode, since the GCS
bucket's website endpoint for a custom-domain-named bucket only serves plain HTTP — Cloudflare
terminates TLS for visitors and connects to GCS over HTTP. `api.grooming-kit` should use
**Full (strict)**, since Cloud Run's domain mapping provisions a real Google-managed cert once
DNS is verified.

## 5. CI/CD (GitHub Actions)

Two independent workflows, each triggered only by path changes relevant to it, both using
`google-github-actions/auth` with Workload Identity Federation (no stored keys).

### 5.1 `.github/workflows/deploy-frontend.yml`
- Trigger: push to `main` touching `client/**` or `shared/**`
- Steps: checkout → setup Node → `npm ci && npm run build` (in `client/`, with
  `VITE_API_URL=https://api.grooming-kit.tapshalkar.com` baked in at build time since the UI now
  calls a cross-origin API) → `google-github-actions/auth` (WIF, `frontend-deployer` SA) →
  `google-github-actions/upload-cloud-storage` to sync `client/dist/` to the SPA bucket →
  purge the Cloudflare cache for the zone (`cloudflare/pages-github-action`-style API call, or a
  plain `curl` to the Cloudflare purge-cache API using a scoped API token secret)

### 5.2 `.github/workflows/deploy-backend.yml`
- Trigger: push to `main` touching `server/**` or `shared/**`
- Steps: checkout → `google-github-actions/auth` (WIF, `backend-deployer` SA) →
  `docker build` (in `server/`) → push to Artifact Registry →
  `google-github-actions/deploy-cloudrun` to deploy the new image as a new Cloud Run revision
  (domain mapping is a one-time Terraform-managed resource, unaffected by each deploy)

### 5.3 `.github/workflows/terraform-plan.yml` (optional, recommended)
- Trigger: pull requests touching `infra/**`
- Steps: `terraform fmt -check`, `terraform validate`, `terraform plan` (comment plan output on
  the PR). `terraform apply` for infra changes is run manually/locally for MVP, given the low
  frequency of infra changes — avoids granting GitHub Actions broad IAM-modifying permissions.

## 6. Operational Notes
- **Cold starts**: `min-instances=0` means the first Socket.IO connection after idle will incur
  a cold start (image pull + Node boot, typically 1–3s). Acceptable for a low-traffic internal
  tool; revisit with `min-instances=1` (small always-on cost) if this becomes noticeable.
- **CORS**: since the UI and API are now on different subdomains, the Express/Socket.IO server
  must explicitly allow `https://grooming-kit.tapshalkar.com` as the CORS origin — see LLD event
  contract notes.
- **Domain mapping caveat**: Cloud Run domain mapping is Google-designated "Preview." It works
  fine for a single-region, single-service, low-traffic tool like this one, but Google recommends
  the LB approach for anything needing multi-region routing, Cloud Armor, or Cloud CDN. If those
  needs arise later, the LB design in this doc's history (see git log) can be reintroduced without
  touching the frontend or backend code.
- **Cert provisioning**: after the `api` CNAME resolves, Google auto-provisions a managed cert for
  the domain mapping — this can take anywhere from a few minutes to ~24 hours on first setup.
- **Secrets**: none required for MVP (no DB, no third-party API keys). If added later, use Google
  Secret Manager + Cloud Run secret env var references, not Terraform variables in plain state.

## 7. Estimated Cost Analysis

Prices below are GCP list prices as of writing (2025, `us-east1`/US multi-region rates) — re-verify
against the [Cloud Run](https://cloud.google.com/run/pricing),
[Cloud Storage](https://cloud.google.com/storage/pricing), and
[Artifact Registry](https://cloud.google.com/artifact-registry/pricing) pricing pages before
relying on this for budgeting, since GCP pricing changes over time.

### 7.1 Usage assumptions (small internal team)
- ~8 participants, 3 sessions/week (poker + retro combined), ~45 min/session
- → **~9 hours/month** of Cloud Run instance uptime (rounded up generously to 10 hrs/month for
  buffer/testing/cold-start overlap)
- SPA build size: a few MB (React + Vite output)
- Backend Docker image: ~150–250 MB per build

### 7.2 Cloud Run (backend)
| Resource | Free tier (per billing account/month) | Our estimated usage | Cost |
|---|---|---|---|
| vCPU-seconds | 180,000 free | 10 hrs × 3600s × 1 vCPU = 36,000 | **$0** (well under free tier) |
| Memory GiB-seconds | 360,000 free | 10 hrs × 3600s × 0.5 GiB = 18,000 | **$0** |
| Requests | 2,000,000 free | Low thousands/month (connections + reconnects) | **$0** |
| Egress (NA) | 1 GiB free | Small JSON broadcast payloads, negligible | **$0** |

Cloud Run only bills for CPU/memory while a request (including an open WebSocket connection) is
active — since `min-instances=0`, there is **no charge while the room is idle/empty**. At this
usage level, the backend should stay entirely within Cloud Run's always-free monthly quota →
**~$0/month**.

**Sensitivity check** — for reference, the free vCPU-second quota (180,000/mo) would only be
exhausted by roughly **50 vCPU-hours/month** of active connections — i.e. this team would need to
have the room continuously occupied for ~7% of every month before any Cloud Run compute charge
appears.

### 7.3 GCS (frontend static hosting)
| Resource | Free tier/month | Our estimated usage | Cost |
|---|---|---|---|
| Standard storage | 5 GB free | A few MB (SPA build) | **$0** |
| Class A ops (uploads) | 5,000 free | ~Dozens/month (one per deploy) | **$0** |
| Class B ops (reads) | 50,000 free | Low thousands/month (page loads × assets), further reduced by Cloudflare edge caching | **$0** |
| Egress | 100 GB free | Negligible for this file size/traffic | **$0** |

**~$0/month**, and Cloudflare's proxy/CDN in front further reduces actual GCS origin hits.

### 7.4 Artifact Registry (backend images)
- Free tier: 0.5 GB storage/month, always free.
- A single backend image is ~150–250 MB; keeping 2 recent revisions fits inside the free tier.
- **Recommendation**: add a cleanup policy (`google_artifact_registry_repository` cleanup policies,
  e.g. keep last 5 versions) so CI doesn't silently accumulate old images past the free tier.
- If exceeded: ~$0.10/GB/month — even 5 GB of retained image history is only ~$0.50/month.

### 7.5 Other components
| Component | Cost |
|---|---|
| Workload Identity Federation (OIDC) | Free — no per-token or per-auth charge |
| Cloud Run domain mapping | Free |
| Cloudflare (Free plan: DNS, proxy/CDN, basic DDoS) | Free — no paid plan needed for this scale |
| Terraform state GCS bucket (bootstrap) | A few KB of state files — **$0** (rounds to nothing) |

### 7.6 Total estimated cost
**~$0/month** at the assumed usage level (small team, a few sessions/week) — the design should sit
entirely inside GCP's always-free tier, plus Cloudflare's free plan. The only realistic ways this
starts costing real money:
1. Setting `min-instances=1` to eliminate cold starts → roughly **$55–65/month** (CPU/memory billed
   continuously instead of only during active connections) — a deliberate tradeoff to make later,
   not something to reach for by default.
2. Usage growing far beyond a single small team (many more concurrent rooms/hours) — Cloud Run's
   `max-instances=1` cap (see §6/HLD §5) would need to be lifted first anyway, at which point
   revisit both the Pub/Sub adapter (HLD §5) and this cost model together.
3. Artifact Registry image history growing unbounded without a cleanup policy.

None of these apply to the MVP as scoped, so this design has effectively **no fixed monthly
infrastructure cost** beyond the (separately billed) domain registration you already own.

