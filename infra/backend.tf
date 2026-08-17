# Partial configuration — the state bucket name comes from `bootstrap/`'s output and can't be a
# variable here (Terraform backend blocks don't support interpolation). Initialize with:
#   terraform init -backend-config="bucket=<tf_state_bucket output from bootstrap>"
terraform {
  backend "gcs" {
    prefix = "grooming-kit"
  }
}
