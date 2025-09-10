#!/usr/bin/env sh
set -eu

# Iterate over all app containers and probe their HTTP endpoint
for c in $(docker compose ps -q app); do
  name=$(docker inspect -f '{{.Name}}' "$c" | sed 's#^/##')
  addr=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$c")
  if curl -fs "http://$addr:3000/" >/dev/null; then
    echo "$name healthy"
  else
    echo "$name UNHEALTHY" >&2
  fi
done
