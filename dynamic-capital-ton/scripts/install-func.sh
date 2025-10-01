#!/usr/bin/env bash
set -euo pipefail

VERSION="${TON_FUNC_VERSION:-v2025.07}"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)
    PLATFORM="linux-x86_64"
    ;;
  arm64|aarch64)
    PLATFORM="linux-arm64"
    ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$REPO_ROOT/.bin"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$BIN_DIR"
APPIMAGE="$TMP_DIR/func.appimage"
URL="https://github.com/ton-blockchain/ton/releases/download/${VERSION}/func-${PLATFORM}"

echo "Downloading FunC ${VERSION} (${PLATFORM})..."
curl -fsSL "$URL" -o "$APPIMAGE"
chmod +x "$APPIMAGE"

echo "Extracting AppImage payload..."
(
  cd "$TMP_DIR"
  "./$(basename "$APPIMAGE")" --appimage-extract >/dev/null
)

INSTALL_PATH="$BIN_DIR/func"
install -m 0755 "$TMP_DIR/squashfs-root/usr/bin/func" "$INSTALL_PATH"

cat <<MSG
FunC compiler installed to: $INSTALL_PATH
Add the following directory to your PATH for convenience:
  export PATH="$BIN_DIR:\$PATH"

Note: the FunC binary depends on libsodium. On Debian/Ubuntu systems run:
  sudo apt-get install libsodium23
MSG
