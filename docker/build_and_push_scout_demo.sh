#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="dynamiccapital/scout-demo"
IMAGE_TAG="${1:-v1}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to build the image." >&2
  exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "docker buildx is required to push multi-platform images." >&2
  echo "Install buildx by following https://docs.docker.com/build/install-buildx/" >&2
  exit 1
fi

FULL_TAG="${IMAGE_NAME}:${IMAGE_TAG}"

# Build and push the image using buildx so the registry receives the final artifact.
docker buildx build \
  --platform linux/amd64 \
  --push \
  -t "${FULL_TAG}" \
  -f docker/Dockerfile \
  .

echo "Successfully pushed ${FULL_TAG}" 
