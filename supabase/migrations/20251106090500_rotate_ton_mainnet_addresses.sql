-- Rotate production TON coordinates for the refreshed treasury multisig.
-- Ensures existing deployments pick up the updated wallets after the initial
-- seed has already been applied.

update public.dct_app_config
set
  operations_wallet = 'EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq',
  ton_intake_wallet = 'EQAmzcKg3eybUNzsT4llJrjoDe7FwC51nSRhJEMACCdniYhq',
  dct_jetton_master = 'EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y',
  updated_at = now()
where id = 1;
