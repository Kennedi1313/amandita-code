#!/usr/bin/env bash
set -Eeuo pipefail

app_dir="${1:?Application directory is required}"
archive="${2:?Release archive is required}"
revision="${3:?Git revision is required}"

if [[ ! "$app_dir" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "Invalid application directory."
  exit 1
fi

if [[ ! -f "$archive" ]]; then
  echo "Release archive was not uploaded."
  exit 1
fi

mkdir -p "$app_dir"
if [[ ! -f "$app_dir/.env" ]]; then
  echo "Create $app_dir/.env on the VPS before deploying."
  exit 1
fi

password_line="$(grep -E '^POSTGRES_PASSWORD=' "$app_dir/.env" | tail -n 1 || true)"
password_value="${password_line#POSTGRES_PASSWORD=}"
if [[ ${#password_value} -lt 24 || "$password_value" == "password" ]]; then
  echo "Set a unique POSTGRES_PASSWORD with at least 24 characters in the VPS .env."
  exit 1
fi
unset password_line password_value

require_env_value() {
  local name="$1"
  if ! grep -Eq "^${name}=.+$" "$app_dir/.env"; then
    echo "Set ${name} in the VPS .env before deploying."
    exit 1
  fi
}

require_https_url() {
  local name="$1"
  if ! grep -Eiq "^${name}=https://[^[:space:]]+$" "$app_dir/.env"; then
    echo "Set ${name} to its HTTPS staging URL in the VPS .env."
    exit 1
  fi
}

require_env_value SAAS_BASE_DOMAIN
require_env_value GOOGLE_CLIENT_ID
require_env_value CORS_ALLOWED_ORIGINS
require_https_url APP_PUBLIC_API_URL
require_https_url APP_PUBLIC_API_V1_URL
require_https_url SAAS_ADMIN_URL
require_https_url PORTAL_PUBLIC_URL

if ! grep -Eiq '^MERCADOPAGO_SANDBOX=true$' "$app_dir/.env"; then
  echo "Set MERCADOPAGO_SANDBOX=true before staging deploys to prevent live checkout."
  exit 1
fi

tar -xzf "$archive" -C "$app_dir"
rm -f "$archive"
cd "$app_dir"

docker compose config --quiet
docker compose up --detach --build --remove-orphans \
  amandita-db \
  amandita-api \
  amandita-admin \
  amandita-frontend \
  amandita-portal

for attempt in $(seq 1 40); do
  if curl --fail --silent http://127.0.0.1:8080/actuator/health >/dev/null \
    && curl --fail --silent http://127.0.0.1:4173/ >/dev/null \
    && curl --fail --silent http://127.0.0.1:3000/ >/dev/null \
    && curl --fail --silent http://127.0.0.1:5174/ >/dev/null; then
    printf '%s\n' "$revision" > .deployed-revision
    echo "Staging deployment healthy at $revision."
    exit 0
  fi
  sleep 5
done

docker compose ps
echo "Staging services did not become healthy."
exit 1
