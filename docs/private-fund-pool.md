# Private Fund Pool Service

The Private Fund Pool enables share-based USDT investment cycles for Dynamic
Capital members. Investors can deposit to join the active cycle, request
withdrawals that obey the 7-day notice and 16% reinvestment rule, and
participate in monthly settlements where profits are split across payout,
reinvestment, and performance fees.

## Regulatory Structure

- **Dynamic Capital Asset Management Ltd.** operates the pooled investment
  vehicle and is the sole counterparty for investor capital. It maintains the
  jurisdictional fund management or investment adviser licence required for
  discretionary trading and files attestations in the
  [compliance register](./compliance/README.md).
- **Dynamic Capital Token Issuer Ltd.** mints, redeems, and provides utility
  services for DCT under a virtual asset service provider (VASP) registration. A
  standing distribution agreement grants the issuer read-only access to fund
  performance data while keeping custody, settlement, and liquidity decisions
  inside the licensed fund manager.
- **Dynamic Capital Platform Services Ltd.** runs the treasury, settlement
  automation, and customer platform infrastructure. A technology services
  contract between Platform Services and Asset Management defines SLAs for data
  delivery, NAV calculations, and investor reporting. Token Issuer Ltd.
  maintains an interface agreement with Platform Services to route utility
  redemptions without touching client capital or managed assets.

The fund manager renews the operating agreements annually, documenting any
regulator correspondence or licence updates under
[`docs/compliance`](./compliance/README.md) so operations teams can evidence
separation of duties during audits.

## Database schema

The service introduces the following tables (all in the `public` schema).

| Table                  | Purpose                                                     | Key Columns                                                                                |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `investors`            | Links authenticated profiles to pool participation          | `profile_id`, `status`, `joined_at`                                                        |
| `fund_cycles`          | One row per monthly trading cycle                           | `cycle_month`, `cycle_year`, `status`, `profit_total_usdt`, `payout_summary`               |
| `investor_deposits`    | Ledger of deposits, carryovers, and reinvestments per cycle | `investor_id`, `cycle_id`, `amount_usdt`, `deposit_type`, `tx_hash`                        |
| `investor_withdrawals` | Withdrawal requests and approvals                           | `investor_id`, `cycle_id`, `amount_usdt`, `net_amount_usdt`, `notice_expires_at`, `status` |
| `investor_shares`      | Share percentage and capital base per cycle                 | `investor_id`, `cycle_id`, `share_percentage`, `contribution_usdt`                         |

All tables have Row Level Security enabled. Investors (authenticated profiles)
can read their own records; admins (profiles with role `admin`) have full
access. Edge functions operate with the Supabase service role and manage write
operations.

### Cycle workflow

1. Investors submit deposits (`private-pool-deposit`) which create ledger rows
   and recompute shares for the active cycle.
2. Withdrawals (`private-pool-withdraw`) create pending requests with a 7-day
   notice. Admins approve/deny requests; approvals automatically apply the 16%
   reinvestment rule and recompute shares.
3. Cycle settlement (`private-pool-settle-cycle`) records the monthly profit
   split (64% payout, 16% reinvestment, 20% performance fee), closes the current
   cycle, creates the next cycle, seeds carryover and reinvestment deposits,
   recomputes shares, and notifies investors.

## Edge function APIs

All endpoints expect authenticated Supabase users. Telegram Mini App sessions
can provide `initData` in the request body as an alternative to an
`Authorization` header.

### `POST /private-pool-deposit`

Request body:

```json
{
  "amount": 150.0,
  "txHash": "0xabc123...",
  "notes": "Initial funding"
}
```

Response:

```json
{
  "ok": true,
  "depositId": "uuid",
  "cycleId": "uuid",
  "sharePercentage": 42.857143,
  "contributionUsdt": 150,
  "totalCycleContribution": 350
}
```

### `POST /private-pool-withdraw`

Investor request body:

```json
{
  "amount": 50
}
```

Response includes the generated withdrawal ID and the notice expiration
timestamp. Admin approval uses the same endpoint:

```json
{
  "requestId": "uuid",
  "action": "approve",
  "adminNotes": "Reviewed"
}
```

Approval responses surface the net amount (84% of the requested value), the
reinvestment amount (16%), and the updated share distribution.

### `POST /private-pool-settle-cycle`

Admin-only endpoint for month-end settlement.

Request body:

```json
{
  "profit": 3000,
  "notes": "March 2025 cycle"
}
```

Response highlights the totals (profit, payouts, reinvestment, performance
fees), per-investor payout summary, and the ID/month of the newly created cycle.
Investors with linked Telegram IDs receive a notification summarizing their
payout, reinvestment, fee, and new share percentage.

## Deployment checklist

1. Apply the migration
   `supabase/migrations/20250915010000_private_fund_pool.sql` via
   `supabase db push` or the Supabase dashboard.
2. Deploy edge functions:
   ```bash
   supabase functions deploy private-pool-deposit --no-verify-jwt
   supabase functions deploy private-pool-withdraw --no-verify-jwt
   supabase functions deploy private-pool-settle-cycle --no-verify-jwt
   ```
3. Provide environment variables for the functions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY` (for auth header validation)
   - `TELEGRAM_BOT_TOKEN` (optional; enables settlement notifications)
4. Grant the service role permission to invoke the functions or expose them
   through your API gateway.
5. Update operational runbooks to include monthly settlement steps and admin
   approval procedures for withdrawals.

## Testing

Automated tests cover deposit logic, withdrawal flows (including the admin
approval path), and end-to-end settlement behaviour. Run `npm test` to execute
the Deno test suite.
