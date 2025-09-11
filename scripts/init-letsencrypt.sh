#!/bin/bash
# Obtain an initial Let's Encrypt certificate for dynamiccapital.duckdns.org
# Usage: EMAIL=user@example.com ./scripts/init-letsencrypt.sh
set -euo pipefail

DOMAIN="dynamiccapital.duckdns.org"
EMAIL="${EMAIL:-admin@dynamiccapital.duckdns.org}"
WEBROOT_PATH="/var/lib/letsencrypt"

docker compose run --rm certbot certonly \
  --webroot -w ${WEBROOT_PATH} \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d ${DOMAIN}
