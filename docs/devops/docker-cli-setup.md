# Docker CLI Setup

This guide explains how to install the Docker CLI on Ubuntu-based development environments like the project container.

## Installation Steps

1. Update the package index to ensure the latest package metadata is available:
   ```bash
   sudo apt-get update
   ```
2. Install the `docker.io` package, which provides the Docker Engine and CLI:
   ```bash
   sudo apt-get install -y docker.io
   ```
   This command installs supporting packages such as `containerd` and configures the `docker` systemd service.
3. Confirm that the Docker CLI is available:
   ```bash
   docker --version
   ```
   A successful installation prints the Docker client version (for example, `Docker version 27.5.1, build 27.5.1-0ubuntu3~24.04.2`).

## Post-Installation Notes

- The container environment may not automatically start the Docker daemon because background services are restricted. If Docker commands report that the daemon is unavailable, start it manually (e.g., `sudo service docker start`) or rely on remote Docker hosts for testing.
- Add your user to the `docker` group if you prefer to run Docker commands without `sudo` on persistent systems:
  ```bash
  sudo usermod -aG docker $USER
  ```
  Log out and back in for the group change to take effect.
- For production or CI environments, consider using the official Docker APT repository to track the latest stable releases.

## Running Containers in this Project Environment

Local containers inside the Codespaces-style development environment have a few limitations:

- Nested virtualization is unavailable, so `docker run` commands may fail even after installing the CLI if the Docker daemon cannot start. In that case, prefer connecting to a remote Docker host (for example, `docker context use <remote>`).
- Avoid pasting real authentication tokens, API keys, or other secrets directly into commands. Use environment variables or `.env` files that are excluded from version control instead.
- When you need to expose services (like tunneling with ngrok), validate that the tunnel provider terms allow usage from your environment and that tokens are managed through environment variables such as `NGROK_AUTHTOKEN`.

When commands need elevated privileges (e.g., `sudo docker run ...`), remember that containerized development environments may not grant the necessary capabilities. In those cases, running the command on your local machine or a dedicated VM is safer.
