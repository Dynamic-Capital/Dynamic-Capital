# DCT Tonkeeper Distribution & Onboarding Playbook

This playbook documents how Dynamic Capital distributes DCT jettons across
multiple wallets and how investors can onboard into fund or mentorship programs
through Tonkeeper. It maps both the backend automation patterns and the
front-of-house experience so operations, engineering, and investor relations can
coordinate a single source of truth.

## 1. Distribution pathways

Every DCT transfer automatically instantiates a jetton wallet (per jetton
standard) for the recipient. No pre-deployment is required.

### 1.1 Manual Tonkeeper / Tonviewer transfers

Use for small allocations, spot grants, or operational top-ups:

1. Open Tonkeeper with the treasury wallet that holds DCT.
2. Tap **Send** → enter the receiving TON address or `.ton` domain (for example,
   `treasury.dynamiccapital.ton`).
3. Select **Dynamic Capital Token (DCT)** as the asset.
4. Enter the amount (for example, `5000`) and confirm.

Tonkeeper automatically deploys the recipient jetton wallet if it does not yet
exist. The same workflow can be executed in Tonviewer for desktop operators.

### 1.2 Scripted distributions (bulk / automated)

For vesting schedules, investor batches, or DAO emissions run the distribution
script from the controller multisig. The core pattern mirrors the
`distribute.ts` helper:

```ts
await jettonWallet.transfer({
  to: recipientAddress,
  amount: toNano("5000"),
  value: toNano("0.25"),
  body: Buffer.from("Investor Allocation 1"),
});
```

Recommended practices:

- Run from a multisig that already maintains the TON balance required to cover
  gas for each transfer (`≈0.25–0.5 TON`).
- Maintain a CSV or Supabase table of recipients so the script can be rerun
  idempotently if a transfer fails.
- Tag the `body` field with a descriptive memo to ease treasury audits.

## 2. Investor onboarding through Tonkeeper

Two onboarding patterns cover the majority of investor journeys. Both rely on
Tonkeeper discovering or deploying the investor's DCT jetton wallet once value
is received.

### 2.1 Direct wallet → fund contract (on-chain subscription)

Best for power users already comfortable sending on-chain transactions:

1. Investor opens Tonkeeper and taps **Send**.
2. Inputs the recipient (for example, `fund.dynamiccapital.ton`).
3. Chooses the asset (TON or USDT jetton) and enters the investment amount (for
   example, `100 TON`).
4. Confirms the transaction.

The fund pool contract receives the transfer, calculates the conversion (for
example, `1 USDT → 20 MVR → DCT`), and either mints DCT back to the investor or
records the share in an off-chain ledger. Optional automation hooks can:

- Notify investors via `@Dynamic_VIPBot` on Telegram.
- Update dashboards through a Supabase Edge Function.

### 2.2 Web onboarding → Tonkeeper deep link (best UX)

Ideal for mainstream users via the web app or Telegram mini app. Integrate
TonConnect v2 into the frontend so an "Invest via Tonkeeper" button generates a
Tonkeeper deep link:

```
ton://transfer/fund.dynamiccapital.ton?amount=1000000000&text=Join+Private+Fund
```

Key parameters:

- `receiver`: The fund contract (for example, `fund.dynamiccapital.ton`).
- `amount`: Value in nanoTON (or specify a jetton payload when using USDT).
- `text`: Memo for analytics, support, or reconciliation.

Tonkeeper opens automatically, the investor confirms, and the smart contract (or
Supabase webhook) issues DCT and updates the investor dashboard.

## 3. Investor journey reference

| Step | Investor action                                | System response                                               |
| ---- | ---------------------------------------------- | ------------------------------------------------------------- |
| 1    | Clicks **Join Fund** in the mini app or web UI | App generates a TonConnect deep link targeted at the fund DNS |
| 2    | Confirms the Tonkeeper transaction             | Payment hits the fund pool contract                           |
| 3    | Waits for confirmation                         | Contract mints/sends DCT; Supabase logs the investment        |
| 4    | Receives Telegram notification                 | Bot confirms the investment, dashboard flips to _Active_      |
| 5    | Opens Tonkeeper                                | DCT balance and `.ton` mappings visible for future transfers  |

## 4. Operational checklist

- Keep each treasury or contract wallet topped up with TON so outgoing jetton
  transfers never fail due to gas shortages.
- Monitor incoming transfers with Supabase Edge Functions tied to TON API or
  TonCenter webhooks, then reconcile against the `investors` table.
- Store investor metadata (wallet address, deposit amount, timestamps) in
  Supabase for compliance-ready audit trails.
- Use Telegram inline buttons that deep link directly into Tonkeeper (for
  example, "Invest 100 USDT via Tonkeeper") to streamline mobile onboarding.

## 5. Quick reference summary

| Task                        | Tool / Action                      | Outcome                                         |
| --------------------------- | ---------------------------------- | ----------------------------------------------- |
| Send tokens to allocations  | Tonkeeper (manual)                 | Immediate jetton wallet deployment and transfer |
| Distribute to many wallets  | `distribute.ts` (scripted airdrop) | Bulk allocations with audit-friendly memos      |
| Accept investor deposits    | Fund contract / TonConnect link    | Capital accepted from Tonkeeper in one tap      |
| Deliver investor tokens     | Auto jetton mint or scripted drop  | DCT appears in the investor's Tonkeeper wallet  |
| Track & confirm investments | Supabase + Telegram bot            | Real-time confirmations and dashboards          |
