# DCT Budget Deployment Audit

This audit walks through the Maldivian budget outline step by step and confirms
how each spend category should flow through the DCT treasury, compliance, and
automation controls. The goal is to ensure that every fiat allocation ultimately
fortifies Dynamic Capital Token (DCT) utility, liquidity, and governance.

## 1. Legal and Administrative Setup

### Entity segmentation & licences

| Entity                                 | Scope                                                                                      | Licences & Registrations                                                                                       | Compliance Filing                                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dynamic Capital Token Issuer Ltd.      | Token minting, redemptions, and utility integrations for DCT.                              | Virtual Asset Service Provider (VASP) registration and ongoing token utility disclosures.                      | Store regulator notices and renewal receipts in [`docs/compliance/README.md`](./compliance/README.md) alongside the certificate inventory.                                 |
| Dynamic Capital Asset Management Ltd.  | Managed fund operations, discretionary trading, investor onboarding, and share accounting. | Investment adviser or fund management licence plus anti-money-laundering (AML) programme approval.             | File licences, audits, and investor communications under [`docs/compliance/dpf.md`](./compliance/dpf.md) with cross-references to NAV attestations.                        |
| Dynamic Capital Platform Services Ltd. | Treasury management, settlements, platform infrastructure, and client billing.             | Money services business (MSB) registration and payment service provider approvals for supported jurisdictions. | Log correspondence, SOC reports, and control reviews in [`docs/compliance/certificates.json`](./compliance/certificates.json) and reference the supporting markdown files. |

- **Company registration (MVR 10,000–20,000)**
  - Route payments from the off-chain runway into the on-chain treasury
    operations tranche so the multisig can settle registration invoices while
    maintaining the 1 USD ↔ 1 DCT peg.
  - Verify the registration entries are captured in the treasury ledger and
    tagged for audit to preserve eligibility for governance expense reports.
- **Legal consultation (MVR 5,000–15,000)**
  - Deploy retained counsel to maintain the ongoing KYC/KYB, smart-contract
    audit attestations, and risk reviews that the DCT whitepaper mandates.
  - Record retainer drawdowns alongside counsel deliverables (e.g., licensing
    filings, trading disclosures) to uphold the compliance evidence trail.
- **Licensing and permits (MVR 20,000–50,000)**
  - Confirm that financial services licenses explicitly reference DCT as a
    utility token, not a security, and store copies in the compliance data room
    linked to treasury transactions.
  - Schedule quarterly reviews to confirm license renewals remain in force
    before enabling new product launches tied to DCT staking or liquidity
    mining.

## 2. Infrastructure and Technology

- **Broker partnerships (IB vs. white-label)**
  - For IB agreements, document revenue-share terms and ensure referral payouts
    are reconciled in the DCT performance ledger that feeds buyback scheduling.
  - For white-label deployments (\$10,000–\$50,000), capture capitalized
    software costs in the treasury module and amortize them against trading P&L
    before triggering DCT emission boosts.
- **Office space and setup (MVR 15,000–30,000/month; MVR 20,000–50,000
  one-time)**
  - Map lease and capex payments to the operations tranche with monthly variance
    tracking; flag overruns that could constrain liquidity reserved for DCT
    buybacks.
  - Inventory all IT equipment in the asset registry so depreciation schedules
    feed treasury NAV calculations that underpin the floor-price formula.
- **Trading platforms and analytics (\$500–\$2,000/year)**
  - Vet third-party tools for API compatibility with the Supabase schema to keep
    performance data synchronized with DCT allocation jobs.
  - Maintain vendor security reviews to protect price oracle inputs and
    automation secrets.

## 3. Marketing and Community Building

- **Branding and website (MVR 10,000–30,000)**
  - Require deliverables that communicate DCT staking tiers, fee rebates, and
    governance rights to convert spend into measurable token utility adoption.
- **Social media and advertising (MVR 5,000–10,000/month)**
  - Track campaign attribution (sign-ups, staking conversions) in the analytics
    pipeline so marketing ROI feeds back into treasury governance proposals.
- **Workshops and training (MVR 5,000–15,000/event)**
  - Capture attendee engagement metrics and resulting DCT wallet activations to
    justify continued community budget allocation.

## 4. Operating Funds

- **Proprietary trading capital (\$50,000–\$100,000)**
  - Allocate to desks using the performance-linked treasury loop; mandate
    monthly P&L attestations before profits are converted into buybacks, burns,
    and staking rewards.
  - Reconcile trading balances in both fiat and on-chain accounts to prevent
    drift in the DCT performance snapshot.
- **Salaries and team costs (MVR 50,000–100,000/month)**
  - Segregate payroll between roles that protect DCT infrastructure
    (engineering, risk, support) versus growth experiments, ensuring
    compensation aligns with token governance mandates.
  - Automate payroll entries into the treasury ledger for real-time runway
    forecasting against DCT reserve targets.

## 5. Budget Readiness Checklist

1. ✅ Treasury multisig funded with fiat runway and tagged for legal,
   operations, marketing, and trading draws.
2. ✅ Compliance repository stocked with registration documents, licenses, and
   counsel deliverables tied back to DCT governance requirements.
3. ✅ Automation stack (Supabase, Edge Functions, multisig routing) deployed
   with monitoring on oracle feeds and settlement jobs.
4. ✅ Marketing and community metrics instrumented to prove DCT utility growth
   from every campaign.
5. ✅ Trading capital controls codified so profits automatically reinforce the
   buyback–burn–staking cycle defined in the dynamic pricing framework.

Maintaining this audit trail ensures that each Maldivian budget line strengthens
DCT’s economic loop, making treasury management defensible to regulators,
partners, and token holders.
