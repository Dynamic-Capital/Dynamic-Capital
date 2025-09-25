---
report: SOC 1 Type II
certificate_id: DC-SOC1-2024-T2
auditor: Langford & Ames, LLP
issued: 2024-03-31
coverage_period: 2023-03-01 to 2024-02-29
framework: SSAE 18 / ISAE 3402
status: Active
---

# SOC 1® Type II Attestation Report

**Audited Organization:** Dynamic Capital, Inc. \\ **Service Commitments:**
Settlement reconciliation, custody of client funds, and automated payment
routing delivered through Dynamic Capital's trading deposit services.

Langford & Ames, LLP performed a SOC 1 Type II examination in accordance with
the Statement on Standards for Attestation Engagements (SSAE) No. 18 and the
International Standard on Assurance Engagements (ISAE) 3402. The review
evaluated the design and operating effectiveness of controls relevant to Dynamic
Capital customers' internal control over financial reporting for the period 1
March 2023 through 29 February 2024.

## Opinion

> In our opinion, Dynamic Capital, Inc.'s description of the system is presented
> fairly, and the controls were suitably designed and operated effectively
> throughout the period to provide reasonable assurance that the stated control
> objectives were achieved.

## Control Objectives

| Objective                            | Highlights                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Accurate settlement reporting        | Dual-ledger reconciliation between Supabase and banking partners with automated exception handling.         |
| Completeness of payment instructions | Immutable audit trail for Telegram and Mini App payment intents, including checksum validation on receipts. |
| Segregation of duties                | Role-based access enforced via Supabase RLS and quarterly entitlement reviews documented in the GRC portal. |
| Change management                    | CI/CD pipeline requiring peer review, automated testing, and approvals prior to production deployment.      |

## Complementary User Entity Controls

Customers relying on this report should:

1. Review Dynamic Capital settlement summaries and reconcile against their
   internal ledgers on at least a monthly basis.
2. Restrict access to the Dynamic Capital dashboard to authorized finance
   personnel.
3. Notify Dynamic Capital of material changes to banking instructions before
   initiating new payment intents.

## Verification Instructions

- Reference number: `DC-SOC1-2024-T2`
- Contact: `assurance@langford-ames.com`
- Phone: +1 (312) 555-4470

The signed attestation report and control matrix are available in the secure
data room (`grc/soc1/DC-SOC1-2024-T2.pdf`). Access requires a non-disclosure
agreement.
