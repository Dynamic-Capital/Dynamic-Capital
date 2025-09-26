#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Registers database webhooks so Supabase can trigger edge functions when
 * payments or receipts change.
 *
 * Required env vars:
 *   SUPABASE_PROJECT_ID   - Project reference, e.g. abcdefghijklmnop
 *   SUPABASE_ACCESS_TOKEN - Personal access token with project write access
 *
 * Optional env vars:
 *   FUNCTIONS_BASE_URL    - Override functions base URL
 */

const project = Deno.env.get("SUPABASE_PROJECT_ID");
const accessToken = Deno.env.get("SUPABASE_ACCESS_TOKEN");
if (!project) throw new Error("SUPABASE_PROJECT_ID missing");
if (!accessToken) throw new Error("SUPABASE_ACCESS_TOKEN missing");

const funcBase = Deno.env.get("FUNCTIONS_BASE_URL") ??
  `https://${project}.functions.supabase.co`;

const hooks = [
  {
    name: "payments-auto-review",
    table: "payments",
    events: ["INSERT"],
    url: `${funcBase}/payments-auto-review`,
  },
  {
    name: "receipt-ocr",
    table: "receipts",
    events: ["INSERT", "UPDATE"],
    url: `${funcBase}/receipt-ocr`,
  },
];

for (const h of hooks) {
  const body = {
    name: h.name,
    table: h.table,
    schema: "public",
    events: h.events,
    url: h.url,
    enabled: true,
  };
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${project}/database/webhooks`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const txt = await resp.text();
  console.log(h.name, resp.status, txt);
}
