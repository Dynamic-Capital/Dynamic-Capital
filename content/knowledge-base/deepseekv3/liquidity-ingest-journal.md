# Liquidity Ingest Journal

This journal records the DeepseekV3 catalogue rebuild that restores parity with
the ChatCPT5 knowledge base slice.

## Restored Artefacts

| Asset | Description | Verification |
| ----- | ----------- | ------------ |
| `content/knowledge-base/deepseekv3/market-liquidity-scenarios.md` | Scenario catalogue aligned to liquidity escalations | Cross-checked by risk engineering on 2025-10-05 |
| `dynamic_data_training/liquidity/imbalance-manifest.csv` | Canonical imbalance export re-linked to Deepseek dashboards | Hash verified and synced to Supabase storage bucket `knowledge_base_liquidity` |
| `dynamic_data_training/liquidity/depth-replay.md` | Replay dataset used to validate sweep detection thresholds | Sampled by analytics to confirm timestamp continuity |

## Observations

- Missing catalogue entries originated from an outdated manifest pointer that
  skipped the liquidity imbalance datasets when the pipeline rotated archives.
- Supabase delta tables now include an `origin_provider` column so Deepseek and
  ChatCPT5 contributions can be reconciled during audits.
- The ingestion notebooks were tagged with the `deepseekv3` label to ensure the
  benchmark loader counts them for coverage metrics.

## Next Steps

1. Monitor the nightly ingestion job for checksum regressions.  
2. Raise a follow-up validation ticket if the replay dataset falls out of sync
   with Supabase for more than 12 hours.  
3. Keep the journal updated with future catalogue additions.
