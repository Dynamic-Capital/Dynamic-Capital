# Dynamic Subproject Ownership Matrix

This matrix groups the top-level `dynamic_*` subprojects by capability area so
teams can quickly identify stewardship responsibilities. Where a dedicated owner
has not yet been confirmed, the default fallback is
`@dynamic-capital/maintainers`.

## Ownership Table

| Capability Area        | Representative Subprojects                                                                                             | Primary Owner (Proposed)        | Backup Owner                     | Status             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------- | ------------------ |
| TON & Wallet Services  | `dynamic_ton`, `dynamic_wallet`, `dynamic_trading_language`, `dynamic_liquidity`, `dynamic_supply`                     | @dynamic-capital/maintainers    | @dynamic-capital/supabase-ops    | Needs confirmation |
| AI & Cognitive Systems | `dynamic_gpt_model`, `dynamic_ai`, `dynamic_cognition`, `dynamic_memory`, `dynamic_self_awareness`, `dynamic_learning` | @dynamic-capital/dai-core       | @dynamic-capital/agi-core        | Confirmed          |
| Web Experience         | `dynamic_web`, `dynamic_landing`, `dynamic_interface`, `dynamic_components`, `dynamic_experience`                      | @dynamic-capital/web-experience | @dynamic-capital/maintainers     | Confirmed          |
| Data & Analytics       | `dynamic_data_training`, `dynamic_datasets`, `dynamic_forecast`, `dynamic_quantitative`, `dynamic_analytics`           | @dynamic-capital/maintainers    | @dynamic-capital/intelligence-qa | Needs confirmation |
| Security & Compliance  | `dynamic_security_engine`, `dynamic_firewall`, `dynamic_validator`, `dynamic_kyc`, `dynamic_compliance`                | @dynamic-capital/maintainers    | @dynamic-capital/quality-ops     | Needs confirmation |
| Automation & Tooling   | `dynamic_scripts`, `dynamic_task_manager`, `dynamic_pipeline`, `dynamic_automation`, `dynamic_tool_kits`               | @dynamic-capital/maintainers    | @dynamic-capital/quality-ops     | Needs confirmation |
| Research & Strategy    | `dynamic_playbook`, `dynamic_strategy`, `dynamic_wisdom`, `dynamic_summary`, `dynamic_glossary`                        | @dynamic-capital/maintainers    | @dynamic-capital/maintainers     | Confirmed          |

## Follow-up Actions

- [ ] Confirm TON & wallet ownership with the blockchain operations squad.
- [x] Align AI & cognitive systems with `@dynamic-capital/dai-core` and
      `@dynamic-capital/agi-core` for redundancy.
- [ ] Validate data & analytics domain ownership and update CODEOWNERS.
- [ ] Nominate security engineering contacts for the compliance stack.
- [ ] Record automation/tooling maintainers once the platform team is staffed.

## How to Update

1. When a squad formally accepts ownership, replace the `Status` cell with
   `Confirmed` and update the CODEOWNERS file if necessary.
2. If ownership changes, leave a dated note in the commit message and update the
   `Follow-up Actions` section.
3. Keep this document synchronized with onboarding materials
   (`docs/onboarding-checklist.md`).
