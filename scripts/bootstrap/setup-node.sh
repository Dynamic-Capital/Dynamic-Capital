#!/usr/bin/env bash
set -euo pipefail

# Idempotently install nvm, Node.js 20, and pin npm to 11.4.2
# Works on Linux/macOS shells. For Windows, use nvm-windows GUI/installer.

NVM_VERSION="v0.40.1"
NODE_VERSION="20"
NPM_VERSION="11.4.2"

if [ -z "${HOME:-}" ]; then
  echo "$0: HOME is not set; aborting." >&2
  exit 1
fi

export NVM_DIR="$HOME/.nvm"

install_nvm() {
  echo "Installing nvm $NVM_VERSION ..."
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
}

load_nvm() {
  # shellcheck disable=SC1090
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
}

ensure_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    return
  fi
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    install_nvm
  fi
  load_nvm
  if ! command -v nvm >/dev/null 2>&1; then
    echo "nvm failed to install or load; please open a new shell and retry." >&2
    exit 1
  fi
}

ensure_node() {
  if nvm ls "$NODE_VERSION" | grep -q "$NODE_VERSION"; then
    :
  else
    echo "Installing Node.js ${NODE_VERSION} ..."
    nvm install "$NODE_VERSION"
  fi
  nvm use "$NODE_VERSION"
  nvm alias default "$NODE_VERSION" >/dev/null 2>&1 || true
}

pin_npm() {
  echo "Pinning npm to ${NPM_VERSION} ..."
  npm install -g "npm@${NPM_VERSION}"
}

main() {
  ensure_nvm
  ensure_node
  echo "Node: $(node -v)"
  echo "npm (before pin): $(npm -v)"
  pin_npm
  echo "npm (after pin): $(npm -v)"
  echo "Done. You can now run: npm ci"
}

main "$@"

