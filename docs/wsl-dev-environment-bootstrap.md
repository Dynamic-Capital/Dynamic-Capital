# WSL Dev Environment Bootstrap

Set up a Windows Subsystem for Linux (WSL 2) workstation that can run Docker, Podman, the Supabase CLI, and stay in sync with
GitHub Desktop on the Windows host. The guide focuses on Ubuntu 22.04, but the same commands work for later Ubuntu releases.

## Prerequisites

- Windows 11 with the **Virtual Machine Platform** and **Windows Subsystem for Linux** optional features enabled.
- An Ubuntu distribution installed in WSL (Ubuntu 22.04 recommended).
- Administrative access to run commands with `sudo`.
- GitHub Desktop installed on Windows for the shared repository workflow.

## Setup Checklist

- [ ] Update Ubuntu and install core developer packages.
- [ ] Enable Docker and Podman compatibility, then refresh the `docker` group membership.
- [ ] Configure WSL to start `systemd` so the Docker service runs automatically.
- [ ] Install Node.js 20.x and the Supabase CLI globally.
- [ ] Clone the shared repository from Windows storage for GitHub Desktop syncing.
- [ ] Start the Supabase local stack from the project directory.
- [ ] (Optional) Install the Docker Compose plugin and build the application stack.
- [ ] Verify Docker, Podman, and Supabase respond without errors.

## 1. Update Ubuntu and Install Essentials
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git zsh tmux unzip podman docker.io
```

## 2. Enable Docker and Podman Compatibility
```bash
sudo apt install -y podman-docker
sudo usermod -aG docker $USER
```
> Sign out of WSL or run `exec su -l $USER` to refresh group membership.

## 3. Enable systemd for Docker in WSL
```bash
echo -e "[boot]\nsystemd=true" | sudo tee /etc/wsl.conf
```
Then from an elevated PowerShell session on Windows run:
```powershell
wsl --shutdown
```
Restart the distribution from the Start menu or by running `wsl` again.

## 4. Install Node.js and Supabase CLI
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g supabase
```

## 5. Clone Shared Repository for GitHub Desktop
```bash
cd /mnt/c/Users/Abdul/Projects
git clone https://github.com/your-org/your-repo.git
```
> Adjust the target path and repository URL for your organization.

## 6. Launch Supabase Locally
```bash
cd your-repo
supabase start
```

## 7. Optional: Run Docker Compose Stack

If the project uses Docker Compose, install the plugin and start the stack:

```bash
sudo apt install -y docker-compose-plugin
docker compose up --build
```

## 8. Verify Tooling Integration

```bash
docker info
podman info
supabase status
```

Each command should complete without errors, confirming Docker, Podman, and Supabase CLI are properly configured. If any
command fails, review the previous steps or rerun them to resolve missing dependencies.
