# Supabase Edge Function Database Clients

Supabase Edge Functions can connect to the project's Postgres database through a
few supported client libraries. The sections below outline the recommended
options, sample code, and SSL guidance for production and local development.

## Using `supabase-js`

`supabase-js` is the default option for most Edge Functions. The client handles
Row Level Security enforcement automatically and returns JSON responses out of
the box.

```ts
import { createClient } from "npm:@supabase/supabase-js@2";

const requireEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Missing Authorization header", { status: 401 });
  }

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data, error } = await supabase.from("countries").select("*");
    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
```

**Why use it**

- Automatic Row Level Security enforcement
- Built-in JSON serialization
- Consistent error handling
- TypeScript support when you generate types from the database schema

## Using a Postgres client

Edge Functions run on the server, so they can connect directly to Postgres using
popular drivers. The Deno Postgres driver lets you execute raw SQL with pooled
connections.

```ts
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const pool = new Pool(
  {
    tls: { enabled: false },
    database: Deno.env.get("DB_NAME") ?? "postgres",
    hostname: Deno.env.get("DB_HOSTNAME"),
    user: Deno.env.get("DB_USER"),
    port: Number(Deno.env.get("DB_PORT") ?? 6543),
    password: Deno.env.get("DB_PASSWORD"),
  },
  1,
);

Deno.addSignalListener("SIGTERM", () => {
  pool.end().catch((err) => console.error("Failed to close pool", err));
});

Deno.serve(async (_req) => {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10_000);

  try {
    const connection = await pool.connect();
    try {
      const result = await connection.queryObject({
        text: "SELECT * FROM animals",
        args: [],
        signal: abortController.signal,
      });

      const animals = result.rows;
      const body = JSON.stringify(
        animals,
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2,
      );

      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    return new Response(String(err?.message ?? err), { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
});
```

## Using Drizzle ORM

You can pair Drizzle ORM with `postgres.js` for a type-safe query builder. Add
both dependencies to the project `import_map.json` and initialize the client
inside your function.

```json
{
  "imports": {
    "drizzle-orm": "npm:drizzle-orm@0.29.1",
    "drizzle-orm/": "npm:/drizzle-orm@0.29.1/",
    "postgres": "npm:postgres@3.4.3"
  }
}
```

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { countries } from "../_shared/schema.ts";

const connectionString = Deno.env.get("SUPABASE_DB_URL");
if (!connectionString) {
  throw new Error("SUPABASE_DB_URL must be defined");
}

Deno.serve(async (_req) => {
  const client = postgres(connectionString, { prepare: false });

  try {
    const db = drizzle(client);
    const allCountries = await db.select().from(countries);
    return Response.json(allCountries);
  } finally {
    await client.end({ timeout: 5_000 });
  }
});
```

### Hardening checklist

Regardless of the client you choose, apply the following safeguards:

- Validate all required environment variables at startup to fail fast during
  deployment.
- Enforce authentication checks at the edge (for example by requiring the
  `Authorization` header) before touching the database.
- Set defensible timeouts for database operations to avoid exhausting the Edge
  Function runtime when Postgres is under load.
- Release or close clients and pools in a `finally` block and hook into process
  signals so that upgrades drain connections cleanly.
- Avoid logging raw secrets—mask tokens before writing to the console or
  observability pipelines.

## SSL connections

### Production

Deployed Edge Functions automatically negotiate SSL when connecting to the
Supabase database. No extra configuration is required.

### Local development

To develop with SSL locally:

1. Download the SSL certificate from the database settings screen.
2. Set these environment variables in your local `.env` file:
   - `SSL_CERT_FILE=/path/to/cert.crt`
   - `DENO_TLS_CA_STORE=mozilla,system`
3. Restart your local Supabase function server:
   ```bash
   supabase functions serve your-function
   ```

This ensures local connections validate the certificate chain just like
production.
