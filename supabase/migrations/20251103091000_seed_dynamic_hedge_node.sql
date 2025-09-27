-- Register the dynamic-hedge policy node in the orchestration graph

INSERT INTO public.node_configs AS nc (
  node_id,
  type,
  enabled,
  interval_sec,
  dependencies,
  outputs,
  metadata,
  weight
) VALUES (
  'dynamic-hedge',
  'policy',
  true,
  300,
  '["trades","correlations","risk_settings"]'::jsonb,
  '["hedge_actions","signals"]'::jsonb,
  jsonb_build_object(
    'description', 'Dynamic hedge model evaluating volatility, drawdown, and news triggers',
    'confidence', 0.9
  ),
  0.9
)
ON CONFLICT (node_id) DO UPDATE
SET
  type = EXCLUDED.type,
  enabled = EXCLUDED.enabled,
  interval_sec = EXCLUDED.interval_sec,
  dependencies = EXCLUDED.dependencies,
  outputs = EXCLUDED.outputs,
  metadata = EXCLUDED.metadata,
  weight = EXCLUDED.weight;
