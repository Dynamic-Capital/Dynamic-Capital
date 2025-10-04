# Telemetry Refresh Runbook

The telemetry refresh sequence ensures DeepseekV3 stays aligned with the
operational guardrails defined for the multi-LLM benchmark.

## Refresh Checklist

1. Trigger the liquidity ingestion notebook and confirm new frames are appended
   to `dynamic_data_training/liquidity/depth-replay.md`.
2. Regenerate the imbalance manifest and upload the CSV to the Supabase
   `knowledge_base_liquidity` bucket.
3. Update the routing prompts for DeepseekV3 and ChatCPT5 so dual confirmation
   logic remains consistent across providers.
4. Record the refresh timestamp and verification notes in
   `content/knowledge-base/deepseekv3/liquidity-ingest-journal.md`.

## Validation Controls

- **Sampling cadence**: every 12 hours, with an optional ad-hoc run after major
  market events.  
- **Probe expectations**: success metrics are logged into the governance table
  referenced by the benchmark; failures must be resolved within one cycle.  
- **Escalation**: if telemetry freshness exceeds 24 hours, create a remediation
  ticket and notify the trading desk leads.

## Roles & Ownership

- **Primary**: Liquidity Insights squad maintains ingestion notebooks and review
  logs.  
- **Secondary**: Platform Reliability double-checks Supabase sync jobs whenever a
  failed probe is recorded.

Maintaining this runbook keeps the DeepseekV3 dataset eligible for the B-band
threshold while we drive additional automation toward an A-grade target.
