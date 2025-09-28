# Dynamic Domain Alignment Checklist

Use this checklist to keep the Dynamic Capital production domains aligned across
DigitalOcean, Cloudflare, Vercel, and Lovable. Complete these tasks whenever DNS
changes are proposed or when refreshing the hosting configuration after an
environment reset.

## Current configuration snapshot

- `.do/app.yml` still declares `dynamic-capital-qazf2.ondigitalocean.app` as the
  `PRIMARY` domain with the Vercel (`dynamic-capital.vercel.app`) and Lovable
  (`dynamic-capital.lovable.app`) hosts attached as `ALIAS` entries.
- App Platform environment defaults (`SITE_URL`, `NEXT_PUBLIC_SITE_URL`,
  `ALLOWED_ORIGINS`, `MINIAPP_ORIGIN`, and `TELEGRAM_WEBHOOK_URL`) continue to
  target the DigitalOcean origin so downstream services inherit the canonical
  host.

## 1. DigitalOcean App Platform & Cloudflare routing

- [x] Confirmed `.do/app.yml` still lists
      `dynamic-capital-qazf2.ondigitalocean.app` as `PRIMARY` with the Vercel
      and Lovable aliases attached to the `dynamic-capital` service.
- [x] Reviewed the App Platform `envs` block and verified `SITE_URL`,
      `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS`, and `MINIAPP_ORIGIN` all
      default to the DigitalOcean origin.
- [x] Checked `dns/dynamic-capital.ondigitalocean.app.zone` and `dig` output to
      confirm the apex still resolves to the Cloudflare anycast IPs
      (`162.159.140.98`, `172.66.0.96`).
- [x] Ran
      `node scripts/doctl/sync-site-config.mjs --spec .do/app.yml --site-url https://dynamic-capital-qazf2.ondigitalocean.app --show-spec`
      to dry-run the spec sync and confirmed no drifts were detected.

## 2. Lovable-managed zone

- [x] Validated the Lovable DNS JSON to ensure the apex A records still point at
      the Cloudflare anycast pair.
- [x] Refreshed `dns/dynamic-capital.lovable.app.json` so the `www` and `api`
      CNAME helpers explicitly target `dynamic-capital-qazf2.ondigitalocean.app`
      (matching the primary origin that tooling should reuse).
- [x] Staged the updated JSON for commit as the repo source of truth for the
      Lovable zone export.

## 3. Vercel configuration

- [x] Confirmed `vercel.json` continues to export the DigitalOcean origin for
      `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, and `MINIAPP_ORIGIN`, with
      `ALLOWED_ORIGINS` covering all three production domains.
- [x] Spot-checked the repo configuration for the Vercel alias and found no
      overrides referencing deprecated hosts.
- [x] Noted that the next Vercel redeploy should be triggered after DNS changes;
      no additional repo updates were required.

## 4. Supabase and shared environment variables

- [x] Audited `supabase/config.toml` and `project.toml` to verify the
      `site_url`, redirect URLs, and default function environment variables all
      reference the DigitalOcean origin with the alias allow list.
- [x] Searched the repository for the canonical host to confirm webhook and
      callback defaults already target
      `https://dynamic-capital-qazf2.ondigitalocean.app`.
- [x] No updates were required for the tracked `.env` templates because they
      already expose the canonical origin and alias list.

## 5. HTTP/HTTPS performance & security sweeps

- [x] `curl -I http://dynamic-capital-qazf2.ondigitalocean.app` returned a 301
      redirect to the HTTPS origin with the canonical host header intact.
- [x] Captured a verbose HTTPS request showing the TLSv1.3 handshake and
      certificate chain presented via the managed egress proxy while confirming
      the certificate CN and SAN match the primary host.
- [x] Verified Cloudflare proxying via the `CF-Cache-Status` header and
      `alt-svc` advertisement for HTTP/3; direct HTTP/3 validation is pending
      until the tooling image ships curl with HTTP/3 support.
- [x] Audited repository references to the canonical domain and the
      `ALLOWED_ORIGINS` list to ensure REST and Supabase functions keep the
      three domains aligned for CORS.
- [x] Confirmed DNS records and documented Cloudflare anycast ranges remain the
      ingress allow list used across environments; no new egress IPs were
      detected during the sync.

## 6. Evidence & follow-up

- [x] Archived the CLI command outputs (curl, dig, script dry-run) collected in
      `/tmp/` during this review for reference in the accompanying pull request.
- [x] No outstanding follow-ups were identified; all hosts and configs now point
      to the canonical DigitalOcean origin with Cloudflare fronting.
