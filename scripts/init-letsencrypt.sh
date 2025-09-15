#!/bin/bash
# Obtain an initial Let's Encrypt certificate for the provided DOMAIN and
# common subdomains (api and www).
# Usage: DOMAIN=example.com EMAIL=user@example.com ./scripts/init-letsencrypt.sh
set -euo pipefail

DOMAIN="${DOMAIN:?DOMAIN environment variable is required}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
WEBROOT_PATH="/var/lib/letsencrypt"

docker compose run --rm certbot certonly \
  --webroot -w "${WEBROOT_PATH}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  -d "api.${DOMAIN}"
