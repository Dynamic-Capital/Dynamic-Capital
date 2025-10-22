#!/usr/bin/env bash
set -euo pipefail

echo "=== NVIDIA Container Toolkit setup for WSL ==="

# Ensure running in WSL
if ! grep -qiE 'microsoft|wsl' /proc/sys/kernel/osrelease 2>/dev/null; then
  echo "This script is intended for WSL. Exiting."
  exit 1
fi

# Check sudo early
if ! sudo -v; then
  echo "Sudo privileges are required. Exiting."
  exit 1
fi

# Require docker CLI
if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found."
  echo "- Install Docker Desktop (recommended) and enable WSL integration, or"
  echo "- Install native Docker Engine inside this WSL distro."
  exit 1
fi

ENGINE_OS="$(docker info --format '{{.OperatingSystem}}' 2>/dev/null || true)"
IS_DESKTOP=0
if echo "$ENGINE_OS" | grep -qi 'docker desktop'; then
  IS_DESKTOP=1
fi

if [ "$IS_DESKTOP" -eq 1 ]; then
  echo "Detected Docker Desktop engine."
  echo "- For Docker Desktop + WSL2 you typically do NOT install nvidia-container-toolkit inside WSL."
  echo "- Make sure: latest NVIDIA Windows driver with WSL support, Docker Desktop WSL integration enabled for this distro."
else
  echo "Detected native Docker Engine inside WSL. Installing NVIDIA Container Toolkit..."
  sudo apt-get update
  sudo apt-get install -y curl gnupg2 ca-certificates

  # Determine distribution (e.g., ubuntu22.04, debian12)
  . /etc/os-release
  distribution="${ID}${VERSION_ID}"

  # Add NVIDIA libnvidia-container repo with keyring
  sudo install -d -m 0755 /usr/share/keyrings
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

  curl -fsSL "https://nvidia.github.io/libnvidia-container/${distribution}/libnvidia-container.list" \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#' \
    | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y nvidia-container-toolkit

  # Configure runtime for Docker
  echo "Configuring NVIDIA runtime for Docker..."
  sudo nvidia-ctk runtime configure --runtime=docker || true

  # Restart Docker if possible
  if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet docker; then
    sudo systemctl restart docker
  elif command -v service >/dev/null 2>&1; then
    sudo service docker restart || true
  else
    echo "Could not restart Docker automatically. If needed, restart it manually."
  fi
fi

echo "=== Validating GPU access inside a container ==="
if docker run --rm --gpus all nvidia/cuda:12.3.2-base-ubuntu22.04 nvidia-smi; then
  echo "Success: GPU is accessible from containers."
else
  echo "Validation failed."
  echo "- If using Docker Desktop: open Docker Desktop > Settings > Resources > WSL integration and enable your distro, then restart Docker Desktop."
  echo "- Ensure latest NVIDIA Windows driver with WSL support is installed."
fi

