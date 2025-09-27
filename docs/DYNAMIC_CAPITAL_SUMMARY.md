# Dynamic Capital Summary

## Overview

Dynamic Capital delivers a Telegram-first deposit orchestration platform that
pairs a high-speed bot with a polished Mini App experience. A unified Next.js
codebase powers both the marketing landing page and the authenticated dashboard,
mirroring the homepage into a static `_static/` snapshot for CDN distribution
while Supabase-backed `/app` routes manage authentication, data, and trading
automation guardrails.

## Core Capabilities

- **Trader workflows:** Telegram webhooks, rapid OCR-based bank receipt
  validation, crypto TXID submission, and optional glass-themed Mini App
  surfaces streamline fiat and crypto onboarding.
- **Operational control:** Admin command suite, AI-enabled Dynamic Codex
  tooling, and an embedded Multi-LLM Studio empower operators to design, test,
  and deploy strategies inside the main application shell.
- **Intelligence automation:** Market Intelligence workspaces, Dynamic Market
  Review automations, and macro-event streaming via the `economic-calendar` edge
  function keep the signal bus synchronized across bot, dashboard, and hedging
  services.

## Investor Experience

- TonConnect onboarding unifies Telegram deep links, QR fallbacks, and secure
  session resumption across devices.
- Automated guardrails enforce hedging limits, circuit breakers, and approval
  queues before strategies are promoted to production.
- Wallet coverage spans Tonkeeper, OpenMask, and MyTonWallet with adaptive
  capability negotiation for staking, swaps, and signing flows.

## Treasury & Governance

The Dynamic Capital Token (DCT) anchors treasury management with transparent
supply schedules and fee routing, complemented by live liquidity monitoring on
STON.fi and DeDust that feed into Supabase-ledgered hedging hooks.

## Architecture & Platform Services

- A synchronized theming pipeline leverages `apps/web/app/layout.tsx`,
  `useTheme`, and Supabase edge functions to coordinate instant boot themes,
  runtime updates, and persisted preferences across web and Mini App surfaces.
- Supabase edge functions underpin critical services such as Telegram bot
  handling, Mini App lifecycle, hedging safeguards, analytics collection, and
  workflow automation, while standalone broadcast and queue workers extend
  asynchronous orchestration.
- The consolidated build pipeline produces both the Next.js runtime and static
  landing snapshot, with helper scripts to regenerate documentation indices and
  keep configuration centralized at the repository root.

## Security & Compliance

Transport security enforces TLS 1.2+ (preferential TLS 1.3), strict HSTS
headers, and rate-limiting to blunt opportunistic abuse. The program maintains
ISO 27001, SOC 2 Type II, PCI DSS Level 1, HIPAA, GDPR, and EU–US Data Privacy
Framework compliance, with supporting materials in the `docs/compliance` suite.

## Operations & Deployment

- Environment management starts from `.env.example`, with `npm run sync-env`
  ensuring local and deployment-specific secrets stay aligned while segregating
  browser-exposed `NEXT_PUBLIC_*` keys from server-only credentials.
- Build workflows (`npm run dev`, `npm run build`, `npm run start`) and snapshot
  commands (`npm run build:web`, `npm run build:landing`) prepare assets for CDN
  upload via `npm run upload-assets` and DigitalOcean-powered automation.
- Deployment tooling includes Docker- and Go-based health checks, asset CDNs
  with purge automation, and helpers like `npm run docs:organize` to keep
  repository documentation navigable for contributors.
