# Ngrok HTTP Tunnel Troubleshooting

## Requested Command

The following command was requested but cannot run successfully in this
environment because the `ngrok` CLI is not available:

```bash
ngrok http --url=exosporal-ezequiel-semibiographically.ngrok-free.dev 80
```

## Step-by-Step Resolution

1. **Install ngrok.**
   - **Linux (Debian/Ubuntu).**

     ```bash
     curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
     echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
     sudo apt update && sudo apt install -y ngrok
     ngrok version
     ```

     These commands add the official apt repository, install the CLI, and
     confirm the binary is available.
   - **macOS.** Run `brew install ngrok` (or download the macOS binary from
     <https://ngrok.com/download>), then ensure `/usr/local/bin` is on your
     `PATH`.
   - **Windows.** Download and unzip the binary, then add the containing folder
     to the `Path` environment variable so `ngrok` is invocable from any
     terminal.
2. **Authenticate.** Run `ngrok config add-authtoken <token>` with a token from
   the ngrok dashboard to link the binary to your account. Confirm configuration
   with `ngrok config check`.
3. **Reserve or verify the custom domain.** From the ngrok dashboard go to
   **Domains** and ensure `exosporal-ezequiel-semibiographically.ngrok-free.dev`
   is reserved for your account. If not, reserve it before starting the tunnel.
4. **Start the tunnel.** Execute the requested command once the CLI is installed
   and authenticated. If you encounter an error about an unknown flag, upgrade
   to the latest ngrok v3 release (`ngrok update`) because the `--url` flag is
   only available in v3.
   - Need to confirm the generated arguments before connecting? Append
     `-- --dry-run` to the npm script (`npm run tunnel:functions -- --dry-run`)
     to print the command without launching ngrok. This is helpful when
     validating custom ports or flags in automation.
   - For a stricter smoke test that validates overrides, run
     `npm run smoke:tunnel -- --port 8000 --bin ./bin/ngrok`. The script parses
     the dry-run JSON, checks that the helper honors each override, and prints
     the command that would be executed.

If you cannot install software on the current machine, run the command from a
workstation that already has `ngrok` installed.

## Verify the Connection

Once the tunnel command is running on a supported machine:

1. **Check the tunnel status locally.** The ngrok console prints the assigned
   forwarding URL—confirm it matches
   `https://exosporal-ezequiel-semibiographically.ngrok-free.dev`. You can also
   visit <http://127.0.0.1:4040/status> to confirm the tunnel is active.
2. **Test the endpoint.** From another terminal, use
   `curl https://exosporal-ezequiel-semibiographically.ngrok-free.dev` (or the
   appropriate path) to ensure you receive the expected response from your local
   service.
3. **Confirm you reached ngrok's edge.** Run
   `curl -sS -D - https://exosporal-ezequiel-semibiographically.ngrok-free.dev -o /dev/null | grep -i "^x-ngrok"`
   to verify the response includes ngrok headers. Their presence confirms you're
   hitting the current tunnel and not a cached or stale DNS entry.
4. **Inspect the ngrok dashboard.** Visit
   <https://dashboard.ngrok.com/endpoints/status> to confirm the tunnel is
   active and requests are flowing. The **Last Connection** timestamp should
   update when you send traffic.
5. **Review logs for errors.** In the terminal running ngrok press `Ctrl+L` (or
   open the **Logs** tab in the dashboard) to reveal connection attempts. Look
   for TLS handshake failures, 502 responses, or `ERR_NGROK_xxx` codes and
   resolve them based on the logged guidance.
6. **List active tunnels via the API (optional).** If you need an automated
   check, run `ngrok api tunnels list --json` from an authenticated environment
   and verify that the `public_url` matches the custom domain.

If any of these verification steps fail, review the ngrok logs (displayed in the
tunnel console) for connection errors and ensure the local service on port `80`
is reachable. You can test the local service directly with
`curl http://localhost:80` to make sure it is serving traffic before exposing it
via ngrok.

## Coordinating With a Remote Collaborator

When someone else confirms that the tunnel is running on their machine (for
example by sharing the ngrok status console), follow these steps before
proceeding:

1. **Acknowledge the tunnel status.** Confirm that the forwarding address they
   shared matches the expected custom domain. If you are on a call or chat, read
   the domain back to avoid typos.
2. **Independently test the endpoint.** Run
   `curl https://exosporal-ezequiel-semibiographically.ngrok-free.dev` (or the
   relevant path) from your environment to verify that you can reach the service
   over the tunnel.
3. **Check the HTTP response.** Look for the status code and payload you expect
   from the upstream application. A `200` response indicates success; a
   `4xx/5xx` response means the upstream service is likely misconfigured or
   offline.
4. **Match headers with the collaborator.** Ask your collaborator to share the
   `x-ngrok-trace-id` (or similar) header from their local `curl -i` run and
   ensure it matches what you see. Matching IDs confirm you are both exercising
   the same live tunnel instance.
5. **Confirm dashboard alignment.** Both parties should see the tunnel listed
   under <https://dashboard.ngrok.com/endpoints/status> with the same
   `public_url` and a recent **Last Connection** timestamp after your
   verification curl.
6. **Share next steps.** Once you confirm the tunnel works, let the collaborator
   know what actions you will take (for example, running integration tests,
   triggering a deployment, or browsing the exposed UI). If the curl check
   fails, report the exact error message so they can diagnose it on their side.

Documenting these checks ensures everyone has a shared understanding of the
tunnel's state before moving on to dependent work.
