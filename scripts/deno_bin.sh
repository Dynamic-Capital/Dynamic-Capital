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

extra_env="DENO_TLS_CA_STORE=system"

# Deno 2 automatically inspects package.json when resolving bare specifiers,
# which can trigger large npm downloads for commands that only target vendored
# modules. Opt out of that behavior so scripted tasks stay fast and avoid the
# UnknownIssuer TLS errors that motivated the OCR removal.
if [ -z "${DENO_NO_PACKAGE_JSON:-}" ]; then
  extra_env="${extra_env} DENO_NO_PACKAGE_JSON=1"
fi

echo "env ${extra_env} ${cmd}"
