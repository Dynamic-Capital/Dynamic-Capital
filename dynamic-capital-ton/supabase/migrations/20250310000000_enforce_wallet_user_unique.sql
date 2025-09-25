alter table if exists wallets
  add constraint if not exists wallets_user_id_key unique (user_id);
