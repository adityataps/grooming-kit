# Bootstrap: Terraform state bucket

This is a tiny, standalone Terraform config with **local state** — it exists only to create the
GCS bucket that `../` (the real infra) uses as its remote state backend. It's a chicken-and-egg
problem: the bucket that holds Terraform state can't itself be managed by the config that
requires that bucket to exist first.

Run this **once**, by hand, before touching `../`:

```bash
cd infra/bootstrap
terraform init
terraform apply -var="project_id=<your-gcp-project-id>"
```

Note the `tf_state_bucket` output — you'll need it for the real config:

```bash
cd ../
terraform init -backend-config="bucket=<tf_state_bucket output value>"
```

You should not need to touch this directory again unless the state bucket itself is lost or
needs to be recreated in a different project. Its own state file (`terraform.tfstate`) is local
and gitignored — keep a copy somewhere safe (e.g. encrypted, or just re-run `apply` again if lost;
it's idempotent since the bucket already exists and this is the only resource here).
