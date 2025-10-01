# Cold Email Campaign Architecture with Supabase

## Overview

This blueprint demonstrates how to orchestrate a compliant, event-driven cold
email workflow using Supabase as the system of record, an Edge Function for
orchestration, and Resend (or any SMTP-compatible service) for delivery. The
design keeps lead data, templates, and delivery telemetry in one place while
enabling secure automation through Supabase Edge scheduling, n8n, or a cron
runner.

## Database Schema

Define three core tables inside the `public` schema:

### `cold_email_leads`

- `id uuid default gen_random_uuid()` – primary key.
- `created_at timestamptz default now()` – insertion timestamp.
- `updated_at timestamptz default now()` – audit trail for updates.
- `name text` – prospect name.
- `email text not null` – unique email (indexed).
- `company text` – organisation name.
- `status text default 'new'` – lifecycle (`new`, `processing`, `sent`, `error`,
  etc.).
- `last_contacted timestamptz` – null until the first email is sent.
- `metadata jsonb` – optional enrichment payload used for merge variables.

### `cold_email_templates`

- `id uuid default gen_random_uuid()` – primary key.
- `created_at timestamptz default now()`.
- `name text` – internal handle for the template.
- `subject text not null`.
- `body text not null` – HTML or plaintext body.
- `variables text[] default '{}'` – list of `{{placeholders}}` expected in the
  template.
- `is_active boolean default true` – toggles availability without deleting
  records.

### `cold_email_events`

- `id uuid default gen_random_uuid()` – primary key.
- `created_at timestamptz default now()`.
- `lead_id uuid references cold_email_leads(id)` – the recipient.
- `template_id uuid references cold_email_templates(id)` – template used.
- `message_id text` – provider identifier (Resend, SMTP message-id, etc.).
- `status text` – delivery state (`sent`, `error`, `bounced`, etc.).
- `error text` – optional diagnostic message.
- `sent_at timestamptz default now()` – when the email attempt occurred.

Enable row-level security and restrict read/write access to the service role by
default. Add indexes on `email`, `status`, and `sent_at` for efficient querying.

### `claim_cold_email_leads` function

- `claim_cold_email_leads(batch_size integer default 5)` – transactional helper
  that selects up to `batch_size` leads in `status = 'new'`, marks them as
  `processing`, and returns the rows so workers cannot double-send in parallel
  invocations.

The function uses `FOR UPDATE SKIP LOCKED` semantics to atomically reserve work
items across concurrent schedulers.

## Edge Function Responsibilities

The Supabase Edge Function `cold-email-dispatch` coordinates the campaign:

1. **Load active templates** – filter `cold_email_templates` on
   `is_active = true` and pick one randomly for A/B variation.
2. **Claim pending leads** – call `claim_cold_email_leads(batch_size)` so each
   worker atomically reserves a slice of leads ordered by
   `last_contacted`/`created_at`.
3. **Merge variables** – compile the subject/body, replacing any
   `{{placeholders}}` with lead fields or metadata. Missing variables
   short-circuit the send, flagging the lead for review.
4. **Send via Resend** – call `https://api.resend.com/emails` (or the configured
   provider) with `from`, `to`, `subject`, and `html`.
5. **Persist telemetry** – insert a row into `cold_email_events` and update the
   lead’s `status` and `last_contacted` timestamp.
6. **Return a summary** – respond with counts of `sent`, `skipped`, and `error`
   outcomes so schedulers can track throughput.

Environment variables required by the function:

- `RESEND_API_KEY` – API key for Resend (or analogous provider secret).
- `COLD_EMAIL_FROM_ADDRESS` – sender address (`user@domain.com`).
- `COLD_EMAIL_FROM_NAME` _(optional)_ – human-readable sender label.
- `COLD_EMAIL_REPLY_TO` _(optional)_ – reply-to override.
- `COLD_EMAIL_MAX_BATCH` _(optional)_ – max leads processed per invocation
  (defaults to 5, capped at 50).

## Edge Function Skeleton

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { createLogger } from "../_shared/logger.ts";
import { corsHeaders, json, mna, oops } from "../_shared/http.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";

const { RESEND_API_KEY, COLD_EMAIL_FROM_ADDRESS } = requireEnv(
  [
    "RESEND_API_KEY",
    "COLD_EMAIL_FROM_ADDRESS",
  ] as const,
);
const FROM_NAME = optionalEnv("COLD_EMAIL_FROM_NAME");
const supabase = createClient("service");
const logger = createLogger({ function: "cold-email-dispatch" });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders(req, "POST,OPTIONS") },
    });
  }
  if (req.method !== "POST") return mna();

  try {
    const { data: templates } = await supabase
      .from("cold_email_templates")
      .select("id, subject, body, variables")
      .eq("is_active", true);

    const { data: leads } = await supabase.rpc("claim_cold_email_leads", {
      batch_size: Number(optionalEnv("COLD_EMAIL_MAX_BATCH")) || 5,
    });

    // Merge, send via Resend, and update logs (see full implementation under
    // `supabase/functions/cold-email-dispatch/index.ts`).
    logger.info("Dispatch request", {
      leads: leads?.length ?? 0,
      templates: templates?.length ?? 0,
    });

    return json({ ok: true, dispatched: leads?.length ?? 0 }, 200, {}, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("cold-email-dispatch failure", { error: message });
    return oops(message, undefined, req);
  }
});
```

Refer to the production-ready version in
[`supabase/functions/cold-email-dispatch/index.ts`](../supabase/functions/cold-email-dispatch/index.ts)
for full error handling, logging, and Resend integration.

## Automation Layer

Schedule the Edge Function via:

- **Supabase Scheduled Functions** – configure a cron expression (e.g., every 15
  minutes) from the Supabase dashboard.
- **n8n / Zapier** – trigger HTTPS calls to the function endpoint, layering drip
  logic or conditional branching.
- **Custom cron job** – run
  `curl https://<project>.functions.supabase.co/cold-email-dispatch` from an
  external worker.

Recommended safeguards:

- Randomise delays between sends (e.g., `setTimeout` or queueing) if running
  inside a longer-lived worker to avoid spam flags.
- Monitor `cold_email_events` for hard bounces and update lead statuses
  accordingly.
- Store unsubscribe preferences in a separate table and filter leads server-side
  before dispatch.

## Why This Approach Works

- **Single source of truth** – Supabase tables hold leads, reusable templates,
  and delivery history.
- **Secure execution** – Edge Functions run server-side with service-role access
  and provider secrets.
- **Pluggable delivery** – switch to Gmail API, Smartlead, or SMTP by swapping
  the `sendEmail` implementation.
- **Flexible automation** – schedule through Supabase or external orchestrators
  without exposing raw credentials.
