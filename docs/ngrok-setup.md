# Ngrok Setup in CI Containers

This repository occasionally requires secure tunneling for local services. The development containers do not include ngrok by default, so you can install it manually when necessary.

## Installation Steps

1. Download the Linux amd64 distribution archive from ngrok:
   ```bash
   curl -fsSL -o /tmp/ngrok.tgz https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
   ```
2. Extract the binary to a directory on your `PATH`:
   ```bash
   sudo tar -xzf /tmp/ngrok.tgz -C /usr/local/bin
   ```
3. Verify the installation:
   ```bash
   ngrok version
   ```

## Authentication

Authenticate the CLI with a valid token before creating tunnels:

```bash
ngrok config add-authtoken <YOUR_TOKEN>
```

Store tokens only in the local configuration file (`~/.config/ngrok/ngrok.yml`) and **never** commit them to the repository.

## Quick Checklist

Use this checklist to confirm that your local environment is ready before you start sharing tunnels:

- [ ] Install the ngrok binary and confirm `ngrok version` returns successfully.
- [ ] Run `ngrok config add-authtoken <YOUR_TOKEN>` to link your CLI with your account.
- [ ] Start the local service you plan to expose (for example, `python3 -m http.server 3000`).
- [ ] Launch `ngrok http http://localhost:3000` and verify that the public URL forwards traffic to your service.
- [ ] Shut down the tunnel with `Ctrl+C`, then stop your temporary local service.

## Confirm the Connection

1. Start any local service you want to expose (for example, a temporary static file server):
   ```bash
   python3 -m http.server 3000
   ```
2. In a new shell session, launch a tunnel that points at that service:
   ```bash
   ngrok http http://localhost:3000
   ```
3. When the connection succeeds, ngrok prints a status table containing a public `https://` URL. Copy the URL and open it in a browser or with `curl` to confirm you can reach the local service through the tunnel.
4. Stop the tunnel with `Ctrl+C` when you no longer need it, then terminate the local test server.
