INSERT INTO public.kv_config (key, value)
VALUES 
  ('MINI_APP_URL', to_jsonb('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp/'::text)),
  ('MINI_APP_SHORT_NAME', to_jsonb('dynamic_pay'::text))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;