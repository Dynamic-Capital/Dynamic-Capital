#!/usr/bin/env bash
#
# install-deps.sh
# -----------------
# This script ensures that the development environment has the
# necessary toolchain for building and testing this project.
#
# The script performs the following tasks:
# 1. Verifies that Node.js and npm are available.
# 2. Installs the `drizzle-kit` CLI if it's not already installed.
# 3. Installs the `deno` runtime which is required by the test suite.
# 4. Prints helpful debug information so that developers can
#    understand what the script is doing at each step.
#
# The structure of the script is intentionally verbose and
# well-commented to provide clarity for contributors who may be
# new to shell scripting or to this project.
#
# Usage:
#   bash scripts/install-deps.sh
#
# The script is idempotent; running it multiple times should not
# harm your environment. If a dependency is already present, the
# script will simply skip the installation step for that dependency.
#
# -------------------------------------------------------------------

set -euo pipefail

# Utility function: print a heading with a surrounding border so that
# the log output is easy to skim.
print_heading() {
  local msg="$1"
  echo
  echo "=============================="
  echo "== $msg"
  echo "=============================="
}

# Utility function: show a success message.
print_success() {
  local msg="$1"
  echo "[ok] $msg"
}

# Utility function: show a warning message.
print_warn() {
  local msg="$1"
  echo "[warn] $msg" >&2
}

# Utility function: show an error message and exit.
print_error() {
  local msg="$1"
  echo "[error] $msg" >&2
  exit 1
}

# -------------------------------------------------------------------
# Step 1: Ensure Node.js and npm are installed.
# -------------------------------------------------------------------

print_heading "Checking Node.js and npm"

if ! command -v node >/dev/null 2>&1; then
  print_error "Node.js is required but was not found on PATH."
fi
print_success "Node.js $(node --version) detected"

if ! command -v npm >/dev/null 2>&1; then
  print_error "npm is required but was not found on PATH."
fi
print_success "npm $(npm --version) detected"

# -------------------------------------------------------------------
# Step 2: Install drizzle-kit if missing.
# -------------------------------------------------------------------

print_heading "Ensuring drizzle-kit is installed"

if npx --no-install drizzle-kit --version >/dev/null 2>&1; then
  DRIZZLE_VER=$(npx --no-install drizzle-kit --version)
  print_success "drizzle-kit ${DRIZZLE_VER} already installed"
else
  print_warn "drizzle-kit not found; installing via npm"
  npm install --save-dev drizzle-kit >/tmp/drizzle-install.log 2>&1 && \
    tail -n 20 /tmp/drizzle-install.log
  print_success "drizzle-kit installation completed"
fi

# -------------------------------------------------------------------
# Step 3: Install Deno if missing.
# -------------------------------------------------------------------

print_heading "Ensuring Deno runtime is installed"

if command -v deno >/dev/null 2>&1; then
  DENO_VER=$(deno --version | head -n1)
  print_success "$DENO_VER detected"
else
  print_warn "Deno not found; installing using official script"
  curl -fsSL https://deno.land/x/install/install.sh | sh >/tmp/deno-install.log 2>&1
  # Add Deno to PATH for current shell session.
  export DENO_INSTALL="$HOME/.deno"
  export PATH="$DENO_INSTALL/bin:$PATH"
  if command -v deno >/dev/null 2>&1; then
    DENO_VER=$(deno --version | head -n1)
    print_success "Installed $DENO_VER"
  else
    print_error "Deno installation failed"
  fi
fi

# -------------------------------------------------------------------
# Step 4: Display final summary of installed tools.
# -------------------------------------------------------------------

print_heading "Installation summary"

npx --no-install drizzle-kit --version 2>/dev/null || print_warn "drizzle-kit unavailable"
command -v deno >/dev/null 2>&1 && deno --version || print_warn "deno unavailable"

print_heading "All dependencies checked"

exit 0

