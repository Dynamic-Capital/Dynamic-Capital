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

## Application Usage

Wrapper-backed tables can be queried from both the Next.js app and the Telegram bot. Place shared helpers under `apps/web/integrations/` so they can be imported from the web dashboard and edge functions alike:

```ts
import { getRedisSession, getAuth0User, listS3Files } from "@/integrations/wrappers";
```

Use these functions to fetch cached sessions, authenticated users, or file metadata through the unified SQL interface.
