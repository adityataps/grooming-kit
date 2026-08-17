# Backend service + domain mapping — see docs/infra.md §4.2.
resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "grooming-kit-backend"
  format        = "DOCKER"
  description   = "Docker images for the grooming-kit Socket.IO/Express backend"

  # Keep only the N most recent image versions (default 5, see var.artifact_keep_count and
  # docs/infra.md §7.4) so CI doesn't silently accumulate old images past the free tier.
  #
  # A DELETE policy alone would target every version; pairing it with this KEEP policy exempts
  # the most recent `keep_count` from that DELETE, since a KEEP match always overrides a matching
  # DELETE for the same version.
  cleanup_policies {
    id     = "keep-latest-${var.artifact_keep_count}"
    action = "KEEP"
    most_recent_versions {
      keep_count = var.artifact_keep_count
    }
  }

  cleanup_policies {
    id     = "delete-rest"
    action = "DELETE"
    condition {
      tag_state = "ANY"
    }
  }

  labels = local.labels
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "grooming-kit-backend"
  location = var.region
  labels   = local.labels

  template {
    scaling {
      min_instance_count = 0
      # Single-instance constraint: room state is in-memory, no shared store between
      # instances — see hld.md §5.
      max_instance_count = 1
    }
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}/server:latest"
      ports {
        container_port = 8080
      }
      env {
        name  = "CORS_ORIGIN"
        value = "https://${local.ui_domain}"
      }
    }
  }

  # CI deploys new revisions by pushing a new image and re-running `deploy-cloudrun`; Terraform
  # shouldn't fight that by trying to reset the image back to whatever was last applied here.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers" # anonymous access — no auth layer in front, per requirements
}

resource "google_cloud_run_domain_mapping" "backend" {
  name     = local.api_domain
  location = var.region
  metadata {
    namespace = var.project_id
  }
  spec {
    route_name = google_cloud_run_v2_service.backend.name
  }
}
