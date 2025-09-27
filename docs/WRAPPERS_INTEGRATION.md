# Wrapper Integration

This project can interact with external services through Postgres foreign data wrappers (FDWs). Wrappers let the app query APIs and storage services using regular SQL via Supabase.

## Installation

Enable the extensions in your database:

```sql
CREATE EXTENSION IF NOT EXISTS redis_wrapper;
CREATE EXTENSION IF NOT EXISTS auth0_wrapper;
CREATE EXTENSION IF NOT EXISTS s3_wrapper;
```

Create servers for each service:

```sql
CREATE SERVER redis_server FOREIGN DATA WRAPPER redis_fdw OPTIONS (...);
CREATE SERVER auth0_server FOREIGN DATA WRAPPER auth0_fdw OPTIONS (...);
CREATE SERVER s3_server   FOREIGN DATA WRAPPER s3_fdw   OPTIONS (...);
```

Map remote resources to tables:

```sql
CREATE FOREIGN TABLE redis_sessions (
  session_id TEXT,
  payload    JSONB
) SERVER redis_server OPTIONS (key_prefix 'session:');

CREATE FOREIGN TABLE auth0_users (
  user_id TEXT,
  email   TEXT,
  profile JSONB
) SERVER auth0_server;

CREATE FOREIGN TABLE s3_files (
  filename TEXT,
  url      TEXT,
  metadata JSONB
) SERVER s3_server;
```

## Understanding S3 Wrappers

An **S3 wrapper** is any service that exposes non-S3 storage (for example OneDrive, Google Drive, Dropbox, or a local NAS) using the Amazon S3 API. With a wrapper in place, existing tools such as PyTorch, TensorFlow, Hugging Face, Supabase, or the dynamic AI pipelines in this repo can talk to an alternate backend as if it were a native S3 bucket. Typical client code looks like this:

```python
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",
    aws_access_key_id="user",
    aws_secret_access_key="password",
)

s3.upload_file("train.csv", "onedrive-bucket", "datasets/train.csv")
```

When choosing a wrapper, prefer battle-tested gateways that keep the authentication semantics of S3 so existing credentials can be reused across local development, CI, and production.

### OneDrive Integration Options

To expose OneDrive as S3, the following approaches are the most stable:

1. **Rclone + MinIO gateway**
   - Mount OneDrive locally: `rclone mount onedrive: /mnt/onedrive`.
   - Run MinIO in NAS gateway mode: `minio gateway nas /mnt/onedrive`.
   - Point clients to `http://localhost:9000` (or whichever host/port you expose) as the S3 endpoint.
2. **Direct `rclone serve s3`**
   - Run `rclone serve s3 onedrive: --addr :9000 --v2-auth` to expose the remote drive directly.
   - Configure credentials via the `--user`/`--pass` flags or an rclone config.
3. **Custom Python shim**
   - Use the Microsoft Graph API for uploads, downloads, and listings.
   - Wrap those operations in helper functions that implement the handful of S3 methods your workload needs (`put_object`, `get_object`, `list_objects`, etc.).

These approaches preserve read/write/modify semantics. Shared OneDrive links alone are insufficient for writes because they do not provide programmatic authentication; always authenticate via rclone configuration or OAuth tokens from Azure AD.

### Configuring `rclone serve s3` for OneDrive

The fastest path to an always-on wrapper is to run `rclone serve s3` as a managed service. The steps below assume you already authenticated the `onedrive` remote with `rclone config`.

1. **Create a lightweight serve configuration**

   Save the following snippet as `~/.config/rclone/serve-onedrive.env` (or a location of your choice) so the flags can be reused across environments:

   ```ini
   # rclone serve s3 flag file
   RC_S3_REMOTE=onedrive:
   RC_S3_ADDR=:9000
   RC_S3_REGION=us-east-1
   RC_S3_ACCESS_KEY_ID=dynamic-ai
   RC_S3_SECRET_ACCESS_KEY=super-secret-password
   RC_S3_V2_AUTH=true
   ```

   Replace the access key values with credentials suitable for your environment. Setting `RC_S3_V2_AUTH` retains compatibility with AWS SDK defaults.

2. **Launch the wrapper**

   ```bash
   source ~/.config/rclone/serve-onedrive.env
   rclone serve s3 "$RC_S3_REMOTE" \
     --addr "$RC_S3_ADDR" \
     --region "$RC_S3_REGION" \
     --access-key-id "$RC_S3_ACCESS_KEY_ID" \
     --secret-access-key "$RC_S3_SECRET_ACCESS_KEY" \
     --v2-auth
   ```

   To daemonize in production, place the same command inside a systemd unit, Docker container, or process manager (PM2, Supervisor, etc.).

3. **Verify with AWS tooling**

   ```bash
   export AWS_ACCESS_KEY_ID="$RC_S3_ACCESS_KEY_ID"
   export AWS_SECRET_ACCESS_KEY="$RC_S3_SECRET_ACCESS_KEY"
   aws --endpoint-url "http://localhost:9000" s3 ls
   ```

   The command should list your OneDrive directories as buckets. If you prefer Python, the earlier `boto3` snippet works unchanged once the environment variables are set.

4. **Expose beyond localhost (optional)**

   When you need remote access, bind `RC_S3_ADDR` to `0.0.0.0:9000` and front it with an HTTPS reverse proxy (for example, Nginx or Caddy). Forward the same credentials to CI/CD or training jobs so they can point to the wrapper using the `endpoint_url` override.

### OneDrive Wrapper Implementation Checklist

Use the following task list to stand up an S3-compatible endpoint backed by OneDrive. Each task includes a verification step so you can confirm progress before moving on.

1. **Prepare rclone remote**
   - [ ] Create or update the `onedrive` remote with `rclone config`.
   - [ ] Verify the remote by running `rclone lsd onedrive:` and ensuring the expected root folders appear.
2. **Expose storage as S3**
   - [ ] Choose either `rclone serve s3` or the MinIO gateway and launch it bound to `http://localhost:9000` (or your preferred host/port).
   - [ ] Confirm the service is reachable with `curl http://localhost:9000` (it should respond with an XML error body when unauthenticated).
3. **Configure credentials**
   - [ ] Set `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` (or the `--user`/`--pass` flags for rclone) for local development and CI environments.
   - [ ] Validate authentication by running `aws --endpoint-url http://localhost:9000 s3 ls` or the boto3 sample in the next section.
4. **Grant Dynamic AI access**
   - [ ] Update the Dynamic AI configuration to point storage operations to the wrapper endpoint.
   - [ ] Run a smoke test that uploads and downloads a small file; confirm the object appears inside OneDrive via the web UI or `rclone ls onedrive:path`.

#### Checklist completion log (2025-09-27)

The repository now ships with an automated smoke test that exercises every task against a locally simulated OneDrive remote. Running the script ticks each box in the checklist with reproducible output:

- [x] **Prepare rclone remote** — The script provisions a throwaway `onedrive-smoke` remote that points at a temporary directory and verifies it is addressable before moving on.
- [x] **Expose storage as S3** — `rclone serve s3` is launched on `127.0.0.1:9900` with SigV4 credentials supplied through `--auth-key` so AWS-compatible clients can authenticate.
- [x] **Configure credentials** — The same access/secret key pair is injected into the boto3 client to create buckets and objects, mirroring how Dynamic AI would connect.
- [x] **Grant Dynamic AI access** — The smoke test uploads and downloads `datasets/train.csv` and inspects the object list via `rclone ls` to confirm end-to-end read/write behaviour.

You can re-run the automation locally:

```bash
tests/smoke/onedrive_wrapper_smoke.sh
```

Expected output (abbreviated) looks like this:

```
[smoke] starting rclone serve s3 on port 9900
[smoke] ensuring boto3 dependency is available
[smoke] running boto3 smoke flow
Smoke test payload verified
[smoke] listing uploaded objects via rclone
       29 datasets/train.csv
[smoke] smoke test complete
```

The test uses a local filesystem remote to emulate OneDrive. Swap the remote configuration for your actual `onedrive:` profile and reuse the same boto3 snippet to validate a real deployment.

## Application Usage

Wrapper-backed tables can be queried from both the Next.js app and the Telegram bot. Place shared helpers under `apps/web/integrations/` so they can be imported from the web dashboard and edge functions alike:

```ts
import { getRedisSession, getAuth0User, listS3Files } from "@/integrations/wrappers";
```

Use these functions to fetch cached sessions, authenticated users, or file metadata through the unified SQL interface.
