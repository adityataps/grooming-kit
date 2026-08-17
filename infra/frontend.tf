# Frontend static hosting — see docs/infra.md §4.1. Fronted directly by Cloudflare (CNAME to the
# bucket's website endpoint, see dns.tf) — no load balancer, no Cloud CDN (Cloudflare already
# provides edge caching for this subdomain).
resource "google_storage_bucket" "spa" {
  # Must match the CNAME hostname exactly — GCS resolves custom-domain buckets by name.
  name                        = local.ui_domain
  location                    = "US"
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html" # SPA client-side routing fallback
  }

  labels = local.labels
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.spa.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
