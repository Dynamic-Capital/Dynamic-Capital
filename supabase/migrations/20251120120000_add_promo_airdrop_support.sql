begin;

alter table public.promotions
  add column if not exists airdrop_campaign text,
  add column if not exists airdrop_metadata jsonb,
  add column if not exists airdrop_bot_user_id uuid,
  add column if not exists airdrop_target text;

do $$
begin
  alter table public.promotions
    add constraint promotions_airdrop_bot_user_id_fkey
    foreign key (airdrop_bot_user_id)
    references public.bot_users(id)
    on delete set null;
exception
  when duplicate_object then null;
end$$;

create index if not exists idx_promotions_airdrop_bot_user
  on public.promotions (airdrop_bot_user_id);

create index if not exists idx_promotions_airdrop_target
  on public.promotions (airdrop_target);

create or replace function validate_promo_code(p_code text, p_telegram_user_id text)
returns table(
  valid boolean,
  reason text,
  promotion_id uuid,
  discount_type discount_type_enum,
  discount_value numeric
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  pr promotions%rowtype;
  recipient_bot_id uuid;
begin
  select * into pr from promotions where code = p_code;

  if pr.id is null then
    return query select false, 'not_found', null::uuid, null::discount_type_enum, null::numeric;
    return;
  end if;

  select id into recipient_bot_id
  from bot_users
  where telegram_id = p_telegram_user_id
  limit 1;

  if pr.airdrop_target is not null and pr.airdrop_target <> p_telegram_user_id then
    return query select false, 'not_entitled', pr.id, null::discount_type_enum, null::numeric;
    return;
  end if;

  if pr.airdrop_bot_user_id is not null then
    if recipient_bot_id is null then
      return query select false, 'not_entitled', pr.id, null::discount_type_enum, null::numeric;
      return;
    end if;

    if pr.airdrop_bot_user_id <> recipient_bot_id then
      return query select false, 'not_entitled', pr.id, null::discount_type_enum, null::numeric;
      return;
    end if;
  end if;

  if pr.is_active = false then
    return query select false, 'inactive', pr.id, null::discount_type_enum, null::numeric;
    return;
  end if;

  if pr.valid_until < now() or pr.valid_from > now() then
    return query select false, 'out_of_window', pr.id, null::discount_type_enum, null::numeric;
    return;
  end if;

  if pr.max_uses is not null and pr.current_uses >= pr.max_uses then
    return query select false, 'maxed_out', pr.id, null::discount_type_enum, null::numeric;
    return;
  end if;

  if exists (
    select 1
    from promotion_usage
    where promotion_id = pr.id
      and telegram_user_id = p_telegram_user_id
  ) then
    return query select false, 'already_used', pr.id, null::discount_type_enum, null::numeric;
    return;
  end if;

  return query select true, null::text, pr.id, pr.discount_type, pr.discount_value;
end;
$fn$;

commit;
