#!/usr/bin/env bash
set -euo pipefail
# Echo a deno command that works in this environment with TLS configured to
# trust the host OS certificate store. The CI environment lacks the Mozilla
# root bundle that Deno ships with, so forcing the system store avoids
# UnknownIssuer TLS errors when reaching npm.
cmd="deno"
if ! command -v deno >/dev/null 2>&1; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  INSTALL_DIR="${DENO_INSTALL_DIR:-"${REPO_ROOT}/.deno"}"
  BIN_PATH="${INSTALL_DIR}/bin/deno"
  DESIRED_VERSION="${DENO_VERSION:-v2.5.0}"
  DESIRED_VERSION_NO_V="${DESIRED_VERSION#v}"

  NEED_INSTALL=1
  if [ -x "${BIN_PATH}" ]; then
    INSTALLED_VERSION="$(${BIN_PATH} --version | head -n 1 | awk '{print $2}')"
    if [ "${INSTALLED_VERSION}" = "${DESIRED_VERSION_NO_V}" ]; then
      NEED_INSTALL=0
    fi
  fi

  if [ "${NEED_INSTALL}" -ne 0 ]; then
    mkdir -p "${INSTALL_DIR}/bin"
    rm -f "${BIN_PATH}"

    tmpdir="$(mktemp -d)"
    cleanup() {
      rm -rf "${tmpdir}"
    }
    trap cleanup EXIT

    archive="deno-x86_64-unknown-linux-gnu.zip"
    url="https://github.com/denoland/deno/releases/download/${DESIRED_VERSION}/${archive}"

    curl -fsSL "${url}" -o "${tmpdir}/${archive}"
    unzip -q "${tmpdir}/${archive}" -d "${tmpdir}"
    mv "${tmpdir}/deno" "${BIN_PATH}"
    chmod +x "${BIN_PATH}"

    cleanup
    trap - EXIT
  fi

  cmd="${BIN_PATH}"
fi

REPO_ROOT="${REPO_ROOT:-"$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"}"
CERT_BUNDLE="${REPO_ROOT}/certs/mozilla-root-ca.pem"

normalize_tls_store() {
  local raw="${1:-}"
  if [ -z "${raw}" ]; then
    echo "system,mozilla"
    return
  fi

  local IFS=','
  read -ra parts <<<"${raw}"
  local seen_system=0
  local seen_mozilla=0
  local normalized=()

  for part in "${parts[@]}"; do
    if [ -z "${part}" ]; then
      continue
    fi
    local already_present=0
    for existing in "${normalized[@]}"; do
      if [ "${existing}" = "${part}" ]; then
        already_present=1
        break
      fi
    done
    if [ ${already_present} -eq 1 ]; then
      if [ "${part}" = "system" ]; then
        seen_system=1
      elif [ "${part}" = "mozilla" ]; then
        seen_mozilla=1
      fi
      continue
    fi
    if [ "${part}" = "system" ]; then
      seen_system=1
    elif [ "${part}" = "mozilla" ]; then
      seen_mozilla=1
    fi
    normalized+=("${part}")
  done

  if [ ${seen_system} -eq 0 ]; then
    normalized+=("system")
  fi
  if [ ${seen_mozilla} -eq 0 ]; then
    normalized+=("mozilla")
  fi

  local joined
  IFS=',' read -r joined <<<"${normalized[*]}"
  echo "${joined// /,}"
}

TLS_STORE_VALUE="$(normalize_tls_store "${DENO_TLS_CA_STORE:-}")"

env_parts=("DENO_TLS_CA_STORE=${TLS_STORE_VALUE}")

if [ -f "${CERT_BUNDLE}" ]; then
  if [ -z "${DENO_CERT:-}" ]; then
    env_parts+=("DENO_CERT=${CERT_BUNDLE}")
  fi
  if [ -z "${EXTRA_CA_CERT:-}" ]; then
    env_parts+=("EXTRA_CA_CERT=${CERT_BUNDLE}")
  fi
  if [ -z "${SSL_CERT_FILE:-}" ]; then
    env_parts+=("SSL_CERT_FILE=${CERT_BUNDLE}")
  fi
  if [ -z "${NODE_EXTRA_CA_CERTS:-}" ]; then
    env_parts+=("NODE_EXTRA_CA_CERTS=${CERT_BUNDLE}")
  fi
fi

echo "env ${env_parts[*]} ${cmd}"
