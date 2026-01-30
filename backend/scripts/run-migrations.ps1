$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  Write-Host "DATABASE_URL is not set."
  exit 1
}

psql --dbname="$env:DATABASE_URL" -f "sql/001_users.sql"
psql --dbname="$env:DATABASE_URL" -f "sql/002_core_schema.sql"
psql --dbname="$env:DATABASE_URL" -f "sql/003_jobs.sql"
psql --dbname="$env:DATABASE_URL" -f "sql/004_events_webhooks.sql"
psql --dbname="$env:DATABASE_URL" -f "sql/005_webhook_delivery_retries.sql"
psql --dbname="$env:DATABASE_URL" -f "sql/006_refresh_tokens.sql"
psql --dbname="$env:DATABASE_URL" -f "sql/007_vectors.sql"
psql --dbname="$env:DATABASE_URL" -f "sql/008_documents_failed.sql"
