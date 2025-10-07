# Networking

This project relies on a Next.js service and Supabase Edge Functions. Use the
following guidance to expose the services and control access.

## DNS and domains

- Point your domain's A/AAAA records to the host running the Next.js service or
  reverse proxy.
- Create `www` and `api` CNAME records that resolve to that host so the frontend
  and backend share the same runtime endpoint.
- Set `DOMAIN` in your `.env` to the root zone (e.g. `example.com`) for helper
  scripts and Nginx templates.
- Update `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to the canonical site URL, and
  adjust `NEXT_PUBLIC_API_URL` if using an API subdomain.
- `ALLOWED_ORIGINS` should list the site and API origins so browsers can call
  the endpoints.
- `dynamiccapital.ton` is the canonical production domain, fronted by Cloudflare
  and resolved through TON DNS. Keep the DigitalOcean, Lovable, and Vercel hosts
  as hot standbys so traffic can fail over if the TON resolver is paused; the
  exports live under `dns/` (see
  [`dns/dynamic-capital.ondigitalocean.app.zone`](../dns/dynamic-capital.ondigitalocean.app.zone)
  for the legacy DigitalOcean zone and
  [`dns/dynamic-capital.lovable.app.json`](../dns/dynamic-capital.lovable.app.json)
  for the Lovable snapshot) and all hosts target the same Cloudflare anycast IPs
  (162.159.140.98 and 172.66.0.96).
- `dynamiccapital.ton` and `www.dynamiccapital.ton` stay configured for TON DNS
  blockchain-based resolution (see
  [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json) for
  configuration). TON DNS requires registration through the TON DNS marketplace
  and resolver contract deployment. Expose
  `https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton` as
  the browser fallback so desktop users without a TON resolver can continue
  testing the Mini App (documented in
  [`docs/ton-site-gateway-access.md`](./ton-site-gateway-access.md)). Keep the
  public ton.site gateway bookmarked as a secondary fallback.
- The resolver contract for `dynamiccapital.ton` is
  `EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo` (verified via
  [TON Contract Verifier](https://verifier.ton.org/EQADj0c2ULLRZBvQlWPrjJnx6E5ccusPuP3FNKRDDxTBtTNo)).
  You can self-host the UI or proxy requests through your infrastructure using
  the [official Contract Verifier repository](./ton-contract-verifier.md) to
  align with Dynamic Capital's Supabase verification flow.

### TON ↔ Supabase bridge (`api.dynamiccapital.ton`)

1. **Anchor the host selection.** Standardise on `api.dynamiccapital.ton` as the
   Supabase surface so on-chain references, Mini App manifests, and back-office
   automations all point to the same origin.
2. **Publish the CNAME to the TON zone file.** Add a `CNAME` record for
   `api → <project-ref>.supabase.co` and commit the update to
   [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json). Keep the TTL
   in the 60–300 second range during rollout so TON DNS clients pick up
   certificate challenges quickly.
3. **Mirror Supabase TXT challenges in Web3 storage.** When Supabase issues
   `_acme-challenge.api.dynamiccapital.ton` TXT tokens, add them to the DNS
   snapshot and pin the raw token bundle to TON Storage or IPFS. This creates a
   tamper-evident audit trail that wallets and smart contracts can hash against.
4. **Reverify from both worlds.** Trigger `supabase domains reverify` (or use
   the dashboard) and separately resolve `api.dynamiccapital.ton` through
   `toncli dns resolve` or Tonkeeper to confirm the blockchain resolver has
   propagated the record.
5. **Activate and harden.** After Supabase issues the TLS certificate, activate
   the domain, raise the TTL to your steady-state value, and update OAuth
   callbacks, Telegram Mini App origins, and edge-function allow lists to
   reference `https://api.dynamiccapital.ton` alongside the legacy host.
6. **Stream telemetry to the Web3 graph.** Emit a `custom_domain_activated`
   event to the Supabase `tx_logs` table, hash the DNS bundle, and publish the
   hash to the TON multisig memo so downstream analytics can verify the Web2 ↔
   Web3 linkage.
7. **Validate billing coverage.** Confirm the **Custom Domain** add-on remains
   enabled in Supabase billing; without it the host will downgrade and the TON
   resolver will strand requests.

- Run `deno run -A scripts/configure-digitalocean-dns.ts --dry-run` to inspect
  the planned DNS state for `dynamic-capital.lovable.app`. Remove `--dry-run`
  once the plan looks correct to apply changes through `doctl`. The script keeps
  the Dynamic-managed zone aligned with the shared Cloudflare front door by
  replaying the records from
  [`dns/dynamic-capital.lovable.app.json`](../dns/dynamic-capital.lovable.app.json).

## Public static ingress IPs

Cloudflare terminates TLS for the production hosts and forwards requests to the
Next.js service running on port `8080`. When you need to allowlist ingress or
recreate DNS records, use the anycast A records published for the app:

- `162.159.140.98`
- `172.66.0.96`

## Environment variables

- Copy `.env.example` to `.env` and `.env.local`, then fill in credentials.
- `ALLOWED_ORIGINS` defines a comma-separated list of domains allowed to call
  the API and edge functions. If unset, it falls back to `SITE_URL` (or
  `http://localhost:3000` when `SITE_URL` is missing).

## Exposing the app

- Run the app in Docker (or similar) and map the container's port `8080` to your
  host.
- If you host a static site separately, forward `/api/*` requests to the Next.js
  service. Example Nginx rule:

```nginx
location /api/ {
  proxy_pass http://localhost:8080;
  proxy_set_header Host $host;
}
```

## Cloudflare ingress

Traffic routed through Cloudflare may arrive from public IPs such as
`162.159.140.98` or `172.66.0.96`. Set your web app domain's A records to these
IPs and let Cloudflare proxy requests to the service running on port `8080`.

## Origin alignment across platforms

- The DigitalOcean App Platform spec keeps ingress open so `dynamiccapital.ton`,
  `dynamic-capital.ondigitalocean.app`, `dynamic-capital.vercel.app`, and
  `dynamic-capital.lovable.app` all route to the same service while the app
  publishes TON-hosted links as the default.
- `supabase/config.toml` now sets `site_url`, `additional_redirect_urls`, and
  the Supabase Functions env block to the TON origin while allowlisting the
  DigitalOcean, Lovable, and Vercel hosts for cross-domain API calls.
- `vercel.json` and the Dynamic scripts default to the TON domain but expose the
  full allow list so alternate hosts continue to work without additional
  overrides.
- `lovable-build.js` and `lovable-dev.js` hydrate `SITE_URL`,
  `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, and `MINIAPP_ORIGIN` before running
  Dynamic workflows so previews and builds share the production origin when
  values are omitted, with `ALLOWED_ORIGINS` defaulting to the combined host
  list.

## Outbound connectivity

Ensure the runtime can reach external services like Supabase over HTTPS
(`*.supabase.co`). Adjust firewall or egress rules as needed.

## WebSockets on Edge Functions

Supabase Edge Functions can host long-lived WebSocket sessions in addition to
standard HTTP handlers. Use them to fan out live dashboards, run lightweight
chat relays, or bridge to upstream streaming APIs.

### Accepting WebSocket upgrades

- Edge Functions accept upgrades through the standard `upgrade` header check and
  `Deno.upgradeWebSocket` helper.
- Reject non-WebSocket requests early so the function exits quickly when not
  needed.

```ts
Deno.serve((req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("request isn't trying to upgrade to WebSocket.", {
      status: 400,
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onopen = () => console.log("socket opened");
  socket.onmessage = (event) => {
    console.log("socket message:", event.data);
    socket.send(new Date().toString());
  };
  socket.onerror = (event) => console.log("socket errored:", event.message);
  socket.onclose = () => console.log("socket closed");

  return response;
});
```

### Relaying to outbound WebSockets

Combining inbound and outbound sockets lets an Edge Function proxy external
real-time APIs (for example, the OpenAI Realtime API). Use `npm:ws` in
`noServer` mode so you can handle the upgrade yourself and fan out events
between the browser client and the upstream service.

```ts
import { createServer } from "node:http";
import { WebSocketServer } from "npm:ws";
import { RealtimeClient } from "https://raw.githubusercontent.com/openai/openai-realtime-api-beta/refs/heads/main/lib/client.js";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const server = createServer();
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (ws) => {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new RealtimeClient({ apiKey: OPENAI_API_KEY });

  client.realtime.on("server.*", (event) => {
    ws.send(JSON.stringify(event));
  });
  client.realtime.on("close", () => ws.close());

  const messageQueue: string[] = [];
  const relay = (data: string) => {
    const event = JSON.parse(data);
    client.realtime.send(event.type, event);
  };

  ws.on("message", (data) => {
    if (!client.isConnected()) {
      messageQueue.push(data.toString());
    } else {
      relay(data.toString());
    }
  });

  ws.on("close", () => client.disconnect());

  await client.connect();

  while (messageQueue.length) {
    relay(messageQueue.shift()!);
  }
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(8080);
```

### Authentication strategies

- Supabase CLI and dashboard skip JWT verification for WebSocket handlers unless
  you pass `--no-verify-jwt` during development and deployment. Handle
  authentication inside the handler instead.
- WebSocket clients cannot send custom headers, so pass the JWT via query
  parameters or negotiated subprotocols. Query parameters may appear in logs, so
  avoid embedding secrets directly if the log stream is shared.
- Validate tokens server-side before accepting the connection.

```ts
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

Deno.serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("request isn't trying to upgrade to WebSocket.", {
      status: 400,
    });
  }

  const url = new URL(req.url);
  const jwt = url.searchParams.get("jwt");
  if (!jwt) {
    return new Response("Auth token not provided", { status: 403 });
  }

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) {
    return new Response("Invalid token provided", { status: 403 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onmessage = (event) => {
    socket.send(new Date().toString());
  };

  return response;
});
```

### Repository implementation (`websocket-relay`)

- The function lives at
  [`supabase/functions/websocket-relay/index.ts`](../supabase/functions/websocket-relay/index.ts)
  and is deployed as `/websocket-relay` on the Supabase functions domain.
- The handler expects a `jwt` query parameter and validates it with a
  service-role Supabase client before completing the WebSocket upgrade.
- Supabase configuration disables the default JWT middleware for this function
  (`verify_jwt = false`) so the Edge Function can accept WebSocket upgrades from
  browsers that cannot set custom headers.
- When `OPENAI_API_KEY` is present, the function instantiates the official
  OpenAI Realtime SDK and relays events between the browser and the upstream
  session. Queueing ensures that client events sent before the upstream session
  is ready are forwarded after `session.created` arrives.
- Set `OPENAI_REALTIME_MODEL` if you need to override the default model for the
  upstream connection. Leave it empty to let the SDK fall back to the current
  default (`gpt-4o-realtime-preview-2024-10-01`).
- Without an API key, the handler downgrades to an authenticated echo server so
  teams can still validate local WebSocket clients and Supabase authentication.
- The socket emits JSON envelopes such as `connected`, `heartbeat`,
  `upstream.ready`, and `relay.error` to keep clients informed about the
  connection lifecycle. The upstream server's events are forwarded verbatim.
- Start the function locally with
  `supabase functions serve websocket-relay --no-verify-jwt` so the CLI skips
  the default auth middleware and keeps the worker alive for the WebSocket
  session. Connect via `wscat` or a browser client, passing a valid Supabase
  JWT:

  ```bash
  wscat -c "ws://localhost:54321/functions/v1/websocket-relay?jwt=$SUPABASE_JWT"
  ```

### Local development constraints

- Local Supabase Edge Function instances exit immediately after the request
  finishes. To keep WebSocket sessions alive, set the edge runtime policy to
  `per_worker` in `supabase/config.toml`:

  ```toml
  [edge_runtime]
  policy = "per_worker"
  ```
- The repository's checked-in `supabase/config.toml` already sets this policy so
  local developers can establish WebSocket sessions without additional manual
  tweaks.
- Edge Functions still respect their wall-clock, CPU, and memory limits. The
  connection closes automatically when any quota is exceeded.
