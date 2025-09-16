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

## Application Usage

Wrapper-backed tables can be queried from both the Next.js app and the Telegram bot. Place shared helpers under `apps/web/integrations/` so they can be imported from the web dashboard and edge functions alike:

```ts
import { getRedisSession, getAuth0User, listS3Files } from "@/integrations/wrappers";
```

Use these functions to fetch cached sessions, authenticated users, or file metadata through the unified SQL interface.
