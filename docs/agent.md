# Agent: Dynamic Capital (Telegram Bot + Mini App)

This document defines how the **Dynamic Capital** agent behaves across Telegram
(webhook/commands) and the optional Telegram **Mini App** (Web App).

---

## 1) Purpose & Scope

- Verify **bank** (BML/MIB) and **crypto** (TXID) deposits.
- Auto-approve when rules pass; otherwise flag for **manual_review**.
- Keep flows **beginner-friendly** and fast for Telegram.

---

## 2) Hard Rules (must always hold)

- **200-fast webhook:** Always return HTTP 200 quickly; run heavy work in
  background or a scheduled worker.
- **OCR only on images:** Run OCR **only** when a Telegram image or
  image-document is present.
- **Read body once:** Do not call `req.json()` multiple times.
- **No secrets in client:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in
  browser/Mini App.
- **Idempotent DB changes:** Duplicate image uploads must be rejected via image
  `sha256`.
- **Time zone:** Maldives (UTC **+05:00**) for receipt timestamps.

---

## 3) Env Contract (names only)

Read via `Deno.env.get` (functions) and feature-flag safely (fail soft).

**Runtime (required):**

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

**Runtime (optional / defaults):**

- `BENEFICIARY_TABLE` (default: `beneficiaries`) — **read-only**
- `AMOUNT_TOLERANCE` (default: `0.02`) — ±2%
- `WINDOW_SECONDS` (default: `180`)
- `REQUIRE_PAY_CODE` (default: `false`)
- `OPENAI_API_KEY`, `OPENAI_ENABLED` (default: `false`)
- `MINI_APP_URL` (default: unset) — shows “Open Mini App” button when present

**CI only:**

- `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`

If a **required** key is missing at runtime: **log** and **return 200** (do not
crash).

---

## 4) Bank Auto-Approval (BML/MIB)

**Inputs:** Receipt image → OCR (Tesseract) → `parseBankSlip` (BML/MIB +
`pay_code`).

**Pass conditions (all true):**

1. **Amount** within `AMOUNT_TOLERANCE` of `intent.expected_amount`
2. **Time window:** parsed (txn/value) time within `WINDOW_SECONDS` of
   `intent.created_at` (UTC+05:00)
3. **Status:** “SUCCESS/Successful”
4. **Beneficiary/account:**
   - matches intent snapshot **or**
   - matches an **approved** record in `BENEFICIARY_TABLE` (read-only)
5. **pay_code:** if `REQUIRE_PAY_CODE=true` and intent has one, parsed
   `pay_code` must match

**Outcomes:**

- ✅ **approve** → set `payment_intents.status='approved'`, `approved_at=now()`,
  notify user
- 🔎 **manual_review** with a clear **reason** (e.g., `amount_mismatch`,
  `time_window_failed`, `status_not_success`, `beneficiary_mismatch`,
  `missing_pay_code`, `parse_failed`)

**Duplicates:** Reject if `image_sha256` already exists for this user/intent.

---

## 5) Crypto Deposits (TXID)

- **Never** approve from screenshots.
- Require **TXID**; verify on chain (network, token, **to** address, amount, min
  confirmations).
- Approve when confirmations reach threshold; otherwise show “awaiting
  confirmations”.

---

## 6) Telegram Webhook Behavior

- **Secret check:** header `X-Telegram-Bot-Api-Secret-Token` must match
  `TELEGRAM_WEBHOOK_SECRET`; on mismatch respond **200** (skip processing).
- **Ping path:** if body is `{"test":"ping"}`, return `{"pong":true}` 200.
- **OCR guard:** if no image/document, skip OCR and return 200.
- **Errors:** Wrap handler in try/catch; log, then return 200 `{ ok: true }`.

---

## 7) Admin & Health Commands

- `/ping` → `{ pong: true }`
- `/version` → short SHA/date
- `/env_status` → **present/missing** for required keys; flags state (no values)
- `/review` → list recent `manual_review`
- `/replay <receiptId>` → reprocess one
- `/webhook_info` → Telegram webhook status

> Restrict to admin chat IDs only.

---

## 8) Mini App (Web App) Notes

- **Theme:** “Dynamic Glass” (glassmorphism), **1:1 assets only**.
- **Button:** show **“Open Mini App”** only if `MINI_APP_URL` is set (read from
  env).
- **Auth:** Validate `initData` server-side using bot token; never expose
  service_role.
- **Client reads:** may use `supabase-js` (anon) with RLS for read-only; all
  writes via Edge Functions.

---

## 9) Logging & Safety

- Structured logs (single line):
  `event, sb_request_id, ocrMs, parserConfidence, verdict, reason`.
- Never log secrets or raw PII.
- Simple rate limit: e.g., 1 receipt upload per chat per 5s.

---

## 10) Testing & CI

- **Local:**\
  `supabase start` → `supabase functions serve telegram-bot --no-verify-jwt` →\
  `curl -X POST "http://127.0.0.1:54321/functions/v1/telegram-bot" -H "content-type: application/json" -H "X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET" -d '{"test":"ping"}'`
- **Typecheck:**
  `deno check --allow-import supabase/functions/telegram-bot/*.ts supabase/functions/telegram-bot/**/*.ts`
- **Post-deploy smoke:** invoke ping; check `getWebhookInfo` shows the correct
  URL and low pending updates.

---

## 11) Change Management

- Update this doc when toggles change (`REQUIRE_PAY_CODE`, `AMOUNT_TOLERANCE`,
  etc.) or when new banks/networks are added.
- Treat `/docs/agent.md` like code—changes via PR with reviewers.

---

## 12) Lovable Codex Integration

### UI Agent Prompt (Latest)

**Role & Focus**

- You are **Codex**, the senior UI engineer for the Dynamic Capital monorepo.
- Ship production-ready UI quickly with the smallest safe diffs, no duplication,
  and consistent design.

#### Stack & Libraries (assume present; add only if missing)

- Next.js (TypeScript) with the App Router preferred.
- Tailwind CSS, Framer Motion, and shadcn/ui (Radix primitives).
- lucide-react icons.
- React Hook Form + Zod for forms/validation.
- Utility helpers: `clsx`/`cn`, `class-variance-authority` (cva).
- Testing: `@testing-library/react` + `user-event`.
- Tooling: eslint, prettier, tsconfig strict.

#### Before You Code (Always)

- Reuse existing components/hooks—no duplication. Search `apps/*/components`,
  `ui/`, and `lib/` first.
- Follow existing design tokens for colors, spacing, radii, and shadows; only
  extend Tailwind config when absolutely necessary.
- Prioritize accessibility: semantic markup, ARIA where needed, keyboard
  navigation, and visible focus states.

#### Deliverables Per UI Task

- Place created/edited files under the correct app scope (e.g.,
  `apps/user-dashboard/app/(routes)/...`).
- Components in TypeScript with clear prop interfaces and sensible defaults.
- Include a page/route or Storybook story to preview the UI (`/playground` when
  no storybook).
- Provide loading, empty, and error states (skeletons/spinners, zero-state
  messaging).
- Ensure responsive layout (sm/md/lg/xl) with mobile-first CSS.
- Apply tasteful Framer Motion (opacity/translate, 120–240ms; honor
  `prefers-reduced-motion`).
- Add tests for critical interactions (render, accessibility role, click/submit,
  disabled states).
- Avoid inline secrets, dead code, or anything that breaks tree-shaking.

#### Preferred UI Patterns

- Layout: CSS grid/flex with gaps; container max-width; sticky top nav when
  helpful.
- Cards: rounded-2xl, soft shadow, subtle borders; use shadcn/ui `<Card>`.
- Forms: shadcn/ui + RHF + Zod with inline errors, disabled + loading states,
  optimistic UI when safe.
- Tables: virtualize or paginate beyond 50 rows with separate column definitions
  and explicit empty/error states.
- Modals/Drawers: Radix Dialog/Sheet with escape/overlay close and focus lock.
- Feedback: Radix Toast for success/error feedback.
- Icons: lucide-react sized via Tailwind (`h-5 w-5`).
- Theming: Tailwind + CSS vars with dark mode parity when the app supports it.

#### Data & Integration Guidance

- When wiring to the backend, call existing Supabase Edge Functions and handle
  401/403/500 responses.
- If the backend is not ready, provide a typed mock service and add TODOs for
  easy swapping.
- Gate new UI behind `features` table lookups when feature flags are relevant.

#### Performance & Quality Targets

- Use `next/image` for images; set `priority` only for above-the-fold hero
  media.
- Dynamically import heavy components and avoid client components unless
  necessary.
- Prevent unnecessary re-renders (memoization, stable callbacks, appropriate
  `key`s).
- Aim for Lighthouse performance ≥ 90 on new pages and document any
  improvements.

#### Output Format (Every Task)

1. **Summary** – describe what you built or changed.
2. **File Tree** – list touched paths.
3. **Code Snippets** – provide complete, pasteable snippets for each new/edited
   file.
4. **Test Snippets** – include RTL tests for key interactions.
5. **Preview Instructions** – note local routes or Storybook stories.
6. **Follow-ups** – capture small TODOs or outstanding flags.

#### Error/Build Fix Mode

- If UI changes introduce build/lint/type errors, add missing packages/scripts
  (respect the package manager), apply the smallest fix, and include the diff.
- Prefer patch/minor dependency bumps; mark major version bumps as
  requires-review unless unavoidable.

#### Examples of Request Interpretation

- “Create Pricing page for marketing”: hero, plans grid, FAQ, CTA; mobile-first;
  route `apps/marketing-site/app/pricing/page.tsx`.
- “Build Admin > Users table with filters & bulk actions”: server-driven
  pagination, search, role filter, row selection, bulk enable/disable; route
  `apps/admin-dashboard/app/(admin)/users/page.tsx`; reuse table primitives if
  they exist.
- “Add VIP Signals feed card”: timestamp, pair, direction, TP/SL tags, status
  pill; skeleton state; accessible.
- “Mentorship lesson viewer”: sidebar list, progress, video player, notes; empty
  & error states.

#### When in Doubt

- Extend existing primitives to keep consistency.
- Ship a polished MVP quickly; list 1–3 incremental enhancements as follow-ups.
- Favor the smallest safe diff with tests over large rewrites.

These guardrails keep Codex output consistent with Dynamic Capital’s design
system and engineering expectations.

---

## 13) Integration Guardrails & Architecture

### 🚨 CRITICAL: Core System Protection

**NEVER MODIFY THESE SYSTEMS:**

1. **Database Schema & Relationships**
   - Tables: `bot_users`, `user_subscriptions`, `payment_intents`, `receipts`,
     `bot_settings`
   - Foreign key relationships and constraints
   - RLS policies and security rules
   - Views: `current_vip`, analytics tables

2. **Edge Functions Core Logic**
   - `telegram-bot/index.ts` - Webhook handler & OCR pipeline
   - `verify-initdata/index.ts` - Telegram Web App authentication
   - Payment processing functions (`admin-review-payment`, `receipt-submit`)
   - VIP sync and membership management

3. **Authentication & Security**
   - Telegram `initData` validation mechanism
   - Bot token and webhook secret handling
   - User session management
   - Service role key usage patterns

### ✅ SAFE TO MODIFY: UI & UX Layer

**These areas are designed for UI improvements:**

- **React Components**: All files in `apps/web/components/`
- **Pages & Routing**: `apps/web/app/` directory (Next.js App Router)
- **Styling & Theming**: `app/globals.css`, `tailwind.config.ts`
- **UI Component Library**: `apps/web/components/ui/`
- **Frontend Hooks**: `apps/web/hooks/` (UI state only)
- **Static Assets**: Icons, images, fonts

### Connectivity Map

<lov-mermaid>
graph TB
    subgraph "Telegram Platform"
        TG[Telegram Bot]
        TU[Telegram User]
        TMA[Mini App Button]
    end

    subgraph "Supabase Edge Functions"
        TBF[telegram-bot]
        VIF[verify-initdata]
        MAF[miniapp]
        RPF[receipt-processing]
        ADF[admin-functions]
    end

    subgraph "Database Layer"
        BU[bot_users]
        US[user_subscriptions]
        PI[payment_intents]
        RC[receipts]
        BS[bot_settings]
        CV[current_vip view]
    end

    subgraph "Web App (React)"
        PG[Pages]
        CP[Components]
        HK[Hooks]
        UI[UI Library]
    end

    TU -->|/start| TG
    TG -->|webhook| TBF
    TG -->|Mini App| TMA
    TMA -->|launches| MAF
    MAF -->|serves| PG

    TBF -->|creates/updates| BU
    TBF -->|processes| PI
    TBF -->|stores| RC

    VIF -->|validates| TU
    RPF -->|auto-approve| PI
    ADF -->|admin actions| US

    BU --> US
    US --> PI
    PI --> RC
    US --> CV

    PG --> CP
    CP --> UI
    CP --> HK

    style BU fill:#ff9999
    style US fill:#ff9999
    style PI fill:#ff9999
    style RC fill:#ff9999
    style TBF fill:#ff9999
    style VIF fill:#ff9999

</lov-mermaid>

**Red nodes = PROTECTED (never modify)** **Blue nodes = SAFE TO MODIFY**

### UI Work Playbook

#### For Visual/Text Changes

1. **Use Visual Edits** in Lovable Codex chat interface
2. Click Edit button → modify directly on screen
3. Save credits for complex functionality changes

#### For Component Changes

1. **Read existing component** first to understand structure
2. **Use semantic tokens** from design system
3. **Test in both themes** (light/dark mode)
4. **Verify responsive** design on mobile

#### For New Features

1. **Create new components** instead of modifying large files
2. **Follow existing patterns** in the codebase
3. **Use TypeScript** with proper interfaces
4. **Implement error boundaries** for robustness

### Design System Enforcement

```css
/* ✅ CORRECT: Use semantic tokens */
.button {
  @apply bg-primary text-primary-foreground;
  @apply hover:bg-primary/90;
}

/* ❌ WRONG: Direct colors */
.button {
  @apply bg-blue-500 text-white;
  @apply hover:bg-blue-600;
}
```

**Available Semantic Tokens:**

- Colors: `primary`, `secondary`, `accent`, `destructive`
- Text: `foreground`, `muted-foreground`
- Backgrounds: `background`, `muted`, `card`
- Borders: `border`, `input`

### Payment Flow Invariants

**These rules MUST be preserved:**

1. **Receipt Processing:**
   - OCR → Bank Parser → Auto-approve/Manual Review
   - Duplicate detection via `image_sha256`
   - Time window validation (UTC+05:00 Maldives time)

2. **User Lifecycle:**
   - `/start` → `bot_users` record created
   - Plan selection → `user_subscriptions` created
   - Payment → `payment_intents` with bank details
   - Receipt → `receipts` table with OCR results

3. **VIP Access:**
   - Approved payment → VIP channel invitation
   - `current_vip` view determines access
   - Telegram membership sync via bot admin rights

4. **Admin Controls:**
   - Payment approval/rejection
   - User bans and unbans
   - System resets and diagnostics
   - Broadcast messaging

### Testing UI Changes

```bash
# Before UI changes - verify core functions work
curl -X POST https://qeejuomcapbdlhnjqjcc.functions.supabase.co/telegram-bot \
  -H "content-type: application/json" \
  -d '{"test":"ping"}'

# After UI changes - verify Mini App loads
curl -s https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/ | grep -q "Dynamic Capital"

# Verify auth still works
deno run -A scripts/make-initdata.ts --id=YOUR_TELEGRAM_ID
```

### Emergency Rollback

If UI changes break core functionality:

1. **Use Lovable's built-in version history**
2. **Rollback to last known good state**
3. **Check console logs** for error details
4. **Verify integration endpoints** still respond
5. **Contact system admin** if database issues suspected

**Remember: UI changes should NEVER affect backend functionality. If they do,
you've crossed into protected territory.**
