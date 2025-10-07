#!/usr/bin/env bash
# Orchestrate the Supabase CLI workflow referenced in the setup checklist.
# Requires SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, and optionally
# SUPABASE_PROJECT_REF. Falls back to supabase/config.toml when the ref
# is not provided via environment variable.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_URL_OVERRIDE="${SUPABASE_DB_URL:-}"

if [[ -z "${ACCESS_TOKEN}" ]]; then
  echo "SUPABASE_ACCESS_TOKEN is required to run the Supabase CLI workflow." >&2
  echo "Generate a personal access token from the Supabase dashboard and export it" >&2
  echo "before invoking this script." >&2
  exit 1
fi

if [[ -z "${PROJECT_REF}" ]]; then
  if [[ -f "${ROOT_DIR}/supabase/config.toml" ]]; then
    PROJECT_REF="$(sed -n 's/^project_id = "\(.*\)"/\1/p' "${ROOT_DIR}/supabase/config.toml" | head -n 1)"
  fi
fi

if [[ -z "${PROJECT_REF}" ]]; then
  echo "Unable to determine Supabase project ref. Set SUPABASE_PROJECT_REF or" >&2
  echo "ensure supabase/config.toml includes a project_id." >&2
  exit 1
fi

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "SUPABASE_DB_PASSWORD is required to link and push migrations." >&2
  echo "Export the database password used for the remote project before running" >&2
  echo "this workflow." >&2
  exit 1
fi

cd "${ROOT_DIR}"

build_db_url() {
  local user="$1"
  local password="$2"
  local host="$3"

  local encoded_password
  encoded_password="$(node -e "console.log(encodeURIComponent(process.argv[1] ?? ''))" "${password}")"
  printf 'postgresql://%s:%s@%s:5432/postgres' "${user}" "${encoded_password}" "${host}"
}

DB_HOST="db.${PROJECT_REF}.supabase.co"
DB_URL="${DB_URL_OVERRIDE:-$(build_db_url "${DB_USER}" "${DB_PASSWORD}" "${DB_HOST}")}"

run_supabase() {
  local description="$1"
  shift
  echo "== ${description} =="
  npx supabase --workdir "${ROOT_DIR}" "$@"
}

run_supabase "Logging in to Supabase CLI" login --token "${ACCESS_TOKEN}" --no-browser --yes
run_supabase "Linking project ${PROJECT_REF}" link --project-ref "${PROJECT_REF}" --password "${DB_PASSWORD}" --yes
run_supabase "Pushing database migrations" \
  db push --linked --password "${DB_PASSWORD}" --db-url "${DB_URL}" --yes

echo "Supabase CLI workflow completed for project ${PROJECT_REF}."
