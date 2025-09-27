# Wrapper Integration

This project can interact with external services through Postgres foreign data
wrappers (FDWs). Wrappers let the app query APIs and storage services using
regular SQL via Supabase.

## Installation

Enable the extensions in your database:

```sql
CREATE EXTENSION IF NOT EXISTS redis_wrapper;
CREATE EXTENSION IF NOT EXISTS auth0_wrapper;
CREATE EXTENSION IF NOT EXISTS s3_wrapper;
```

Dynamic Capital provisions the S3 wrapper through the migration
`20251104090000_enable_s3_wrapper.sql`. Before applying it, configure the
connection secrets as Postgres settings so the server definition can pull them
at runtime:

```sql
-- Replace the placeholder values with the real OneDrive-backed S3 credentials.
ALTER DATABASE postgres SET app.settings.one_drive_s3_endpoint = 'https://example-compat.endpoint';
ALTER DATABASE postgres SET app.settings.one_drive_s3_region = 'us-east-1';
ALTER DATABASE postgres SET app.settings.one_drive_s3_bucket = 'dynamic-ai-database';
ALTER DATABASE postgres SET app.settings.one_drive_s3_prefix = 'knowledge/';
ALTER DATABASE postgres SET app.settings.one_drive_s3_access_key_id = '<access-key-id>';
ALTER DATABASE postgres SET app.settings.one_drive_s3_secret_access_key = '<secret-access-key>';
ALTER DATABASE postgres SET app.settings.one_drive_s3_manifest = 'metadata.jsonl';
```

With the settings in place, run the migration to create the foreign server,
manifest table, and runtime grants.

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

Dynamic Capital exposes the OneDrive manifest through the
`public.one_drive_assets` table. Each row mirrors a JSONL entry describing a
document, PDF, or image inside the remote knowledge bucket.

## Application Usage

Wrapper-backed tables can be queried from both the Next.js app and the Telegram
bot. Place shared helpers under `apps/web/integrations/` so they can be imported
from the web dashboard and edge functions alike:

```ts
import {
  getAuth0User,
  getRedisSession,
  listS3Files,
} from "@/integrations/wrappers";
```

The repository now provides typed helpers for the OneDrive bucket:

```ts
import { listOneDriveAssets } from "@/integrations/wrappers";

const assets = await listOneDriveAssets({ prefix: "docs/" });
```

Use these functions to fetch cached sessions, authenticated users, or file
metadata through the unified SQL interface.
