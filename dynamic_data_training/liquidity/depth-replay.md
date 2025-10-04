# Depth Replay Dataset Notes

The replay dataset stitches consolidated order book depth into 1-second frames
across CME equity futures. The archive is used by the DeepseekV3 benchmark to
validate sweep detection algorithms against historical flow.

- **Source**: Historical captures processed by the liquidity ingestion notebooks documented alongside this dataset.
- **Retention**: Rolling 7-day window with daily compaction to Parquet stored in
  Supabase bucket `knowledge_base_liquidity`.
- **Checksum**: sha256:cc9fa313e0f9a934bc5875ad6f0d3d6b02ff6cbe3795c410540ec375a68dbaf9
- **Last refresh**: 2025-10-05T07:15:22Z

## Validation Procedure

1. Rehydrate the target session into the replay notebook.
2. Compare the aggregated delta per bar with the imbalance manifest.
3. Flag any divergence above 0.5% for manual reconciliation.
