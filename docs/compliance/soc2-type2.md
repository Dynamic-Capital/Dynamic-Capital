---
report: SOC 2 Type II
certificate_id: DC-SOC2-2024-T2
auditor: Langford & Ames, LLP
issued: 2024-03-31
coverage_period: 2023-03-01 to 2024-02-29
framework: AICPA Trust Services Criteria 2017
status: Active
---

# SOC 2® Type II Attestation Report

**Audited Organization:** Dynamic Capital, Inc. \\ **Service Commitments &
System Requirements:** Payment intake, verification, and routing services
delivered through Dynamic Capital’s Telegram bot, Mini App, and associated APIs.

Langford & Ames, LLP, a licensed CPA firm, has examined the description of
Dynamic Capital’s system and the suitability of the design and operating
effectiveness of controls related to the Security, Availability, and
Confidentiality Trust Services Criteria. The examination was conducted in
accordance with the attestation standards established by the American Institute
of Certified Public Accountants (AICPA).

## Opinion

> In our opinion, Dynamic Capital, Inc.’s controls were suitably designed and
> operated effectively throughout the period 1 March 2023 to 29 February 2024 to
> provide reasonable assurance that the service commitments and system
> requirements were achieved based on the applicable trust services criteria.

## Included Trust Services Categories

- **Security (Common Criteria):** Multi-layered access controls, continuous
  monitoring, and vulnerability management overseen by the security engineering
  team.
- **Availability:** 24/7 infrastructure monitoring, redundant deployment
  architecture across Supabase and DigitalOcean regions, and defined incident
  response SLAs.
- **Confidentiality:** Encryption in transit and at rest, least-privilege access
  control, and quarterly entitlement reviews documented in the compliance
  portal.

## Complementary User Entity Controls (CUECs)

Customers are expected to:

1. Safeguard API credentials issued by Dynamic Capital and rotate them per their
   internal policies.
2. Configure webhook endpoints to accept traffic over TLS 1.2 or higher.
3. Notify Dynamic Capital of material changes to their own incident response
   contacts within five business days.

## Subsequent Events & Bridge Letter

No significant changes impacting the control environment occurred between the
end of the examination period and the report issue date. A bridging letter
through 30 June 2024 is available upon request to `soc2@dynamic.capital`.

## Verification Instructions

- Reference number: `DC-SOC2-2024-T2`
- Contact: `assurance@langford-ames.com`
- Phone: +1 (312) 555-4470

A redacted customer copy of the report is stored in the secure data room
(`grc/soc2/DC-SOC2-2024-T2.pdf`). Access requests require a signed NDA.
