insert into bot_content (content_key, content_value, content_type, description, is_active)
values (
  'usd_mvr_rate',
  '20',
  'number',
  'Exchange rate from USD to MVR',
  true
)
on conflict (content_key) do update set
  content_value = excluded.content_value,
  content_type = excluded.content_type,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();
