#!/usr/bin/env bash
set -euo pipefail

WHITEPAPER_URL="https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/bot-media/Official-white-paper-10-11-2025.pdf"
EXPECTED_SHA256="dae8ad6065a402965a808f0172b993b3fecb7c73b61f1c9aed6eb3a8bb448ab5"
OUTPUT_PATH="${1:-Official-white-paper-10-11-2025.pdf}"

if command -v curl >/dev/null 2>&1; then
  DOWNLOADER=(curl -fL "$WHITEPAPER_URL" -o "$OUTPUT_PATH")
elif command -v wget >/dev/null 2>&1; then
  DOWNLOADER=(wget -O "$OUTPUT_PATH" "$WHITEPAPER_URL")
else
  echo "Error: neither curl nor wget is available to download the white paper." >&2
  exit 1
fi

"${DOWNLOADER[@]}"

downloaded_sha=$(sha256sum "$OUTPUT_PATH" | awk '{print $1}')
if [[ "$downloaded_sha" != "$EXPECTED_SHA256" ]]; then
  rm -f "$OUTPUT_PATH"
  echo "Error: checksum mismatch. Expected $EXPECTED_SHA256 but got $downloaded_sha." >&2
  exit 1
fi

echo "White paper downloaded to $OUTPUT_PATH with verified SHA-256 checksum."
