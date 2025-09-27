#!/usr/bin/env bash
# Orchestrate the Supabase CLI workflow referenced in the setup checklist.
# Requires SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, and optionally
# SUPABASE_PROJECT_REF. Falls back to supabase/config.toml when the ref
# is not provided via environment variable.
set -euo pipefail
shopt -s extglob

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    # Trim leading/trailing whitespace and ignore comments/blank lines.
    local line="${raw_line%%$'\r'}"
    line="${line##+([[:space:]])}"
    line="${line%%+([[:space:]])}"
    [[ -z "$line" || "${line:0:1}" == "#" ]] && continue

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local value="${BASH_REMATCH[2]}"
      # Preserve existing exported values to avoid clobbering explicit env vars.
      [[ -n "${!key:-}" ]] && continue

      # Strip surrounding quotes if present.
      if [[ "${value:0:1}" == '"' && "${value: -1}" == '"' ]]; then
        value="${value:1:-1}"
      elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
        value="${value:1:-1}"
      fi

      export "$key"="$value"
    fi
  done <"$file"
}

# Load local environment defaults so the workflow can run non-interactively.
load_env_file "${ROOT_DIR}/.env.local"
load_env_file "${ROOT_DIR}/.env"

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
FUNCTIONS_TO_DEPLOY="${SUPABASE_DEPLOY_FUNCTIONS:-}"

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

run_supabase() {
  local description="$1"
  shift
  echo "== ${description} =="
  npx supabase --workdir "${ROOT_DIR}" "$@"
}

run_supabase "Logging in to Supabase CLI" login --token "${ACCESS_TOKEN}" --no-browser --yes
run_supabase "Linking project ${PROJECT_REF}" link --project-ref "${PROJECT_REF}" --password "${DB_PASSWORD}" --yes
run_supabase "Pushing database migrations" db push --linked --password "${DB_PASSWORD}" --yes

if [[ -n "${FUNCTIONS_TO_DEPLOY}" ]]; then
  IFS=',' read -r -a functions <<< "${FUNCTIONS_TO_DEPLOY}"
  for fn in "${functions[@]}"; do
    fn="${fn//[[:space:]]/}"
    [[ -z "$fn" ]] && continue
    run_supabase "Deploying edge function ${fn}" functions deploy "$fn" --project-ref "${PROJECT_REF}"
  done
fi

echo "Supabase CLI workflow completed for project ${PROJECT_REF}."
