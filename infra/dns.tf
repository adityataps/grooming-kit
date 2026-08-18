# Cloudflare DNS — see docs/infra.md §4.4.

# UI: direct CNAME to the GCS bucket's website endpoint.
resource "cloudflare_record" "ui" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  type    = "CNAME"
  content = "c.storage.googleapis.com"
  proxied = true # Cloudflare edge CDN/DDoS in front; also required for Flexible SSL below
}

# API: CNAME to Google's domain-mapping frontend (the exact target Google expects for domain
# mappings, per the `resourceRecords` field the domain mapping itself reports — regardless of
# the mapped domain).
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api.${var.subdomain}"
  type    = "CNAME"
  content = "ghs.googlehosted.com"
  # DNS-only (unproxied) while Google verifies domain ownership + provisions its managed cert.
  # Can be flipped to proxied = true afterward once google_cloud_run_domain_mapping.backend
  # shows a ready certificate.
  proxied = false
}

# SSL modes (set manually in the Cloudflare dashboard — not exposed via the `cloudflare_record`
# resource in provider v4):
#   grooming-kit.<domain_root>     → Flexible  (GCS website endpoint is HTTP-only for
#                                     custom-domain-named buckets; Cloudflare terminates TLS)
#   api.grooming-kit.<domain_root> → Full (strict) (Cloud Run provisions a real managed cert)
