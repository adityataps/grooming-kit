variable "project_id" {
  type        = string
  description = "GCP project ID hosting the grooming-kit infrastructure."
}

variable "region" {
  type        = string
  default     = "us-east1"
  description = "GCP region for Cloud Run and Artifact Registry (see hld.md §5 for why Cloud Run is pinned to a single region/instance)."
}

variable "domain_root" {
  type        = string
  default     = "tapshalkar.com"
  description = "Root domain managed in the Cloudflare zone."
}

variable "subdomain" {
  type        = string
  default     = "grooming-kit"
  description = "Subdomain prefix for the app. The SPA is served at <subdomain>.<domain_root>, the API at api.<subdomain>.<domain_root>."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare zone ID for domain_root."
}

variable "github_repo" {
  type        = string
  default     = "adityataps/grooming-kit"
  description = "GitHub \"owner/repo\" allowed to assume the CI/CD deploy service accounts via Workload Identity Federation."
}

variable "artifact_keep_count" {
  type        = number
  default     = 5
  description = "Number of most-recent backend image versions to retain in Artifact Registry before older ones are auto-deleted (see docs/infra.md §7.4)."
}
