# TON Smart Contract State Management for Dynamic Capital

## Overview

This document captures the recommended state management patterns for building
the Dynamic Capital Token (DCT) protocol on The Open Network (TON). It
summarises how to structure persistent data, coordinate multi-contract
workflows, and enforce security guarantees when implementing FunC smart
contracts for the prop firm ecosystem.

## Persistent Storage Structures

- **Core contract state** is persisted in the contract's `c4` cell. Serialise
  strongly typed records when writing and deserialise them immediately when
  reading.
- **Dictionaries (`HashmapE`)** provide scalable key-value storage for entities
  such as stakers, traders, and profit records.
- **NFT state** follows the TON collection/item conventions so that Challenge
  NFTs and Funded Trader NFTs remain interoperable with TON tooling.

### Core Contract Record

```func
() store_data(int total_staked, cell stakers_dict, cell traders_dict, cell protocol_state) impure {
  set_data(
    begin_cell()
      .store_coins(total_staked)
      .store_dict(stakers_dict)
      .store_dict(traders_dict)
      .store_ref(protocol_state)
      .end_cell()
  );
}

(int, cell, cell, cell) load_data() {
  var ds = get_data().begin_parse();
  return (
    ds~load_coins(),
    ds~load_dict(),
    ds~load_dict(),
    ds~load_ref()
  );
}
```

### Dictionary Helpers

Use helper functions to keep dictionary entries consistent and minimise parsing
errors.

```func
#include "dict.fc";

(int, int, int) load_staker_info(cell staker_cell) {
  var cs = staker_cell.begin_parse();
  return (
    cs~load_coins(),
    cs~load_uint(64),
    cs~load_uint(32)
  );
}

cell save_staker_info(int staked_amount, int start_time, int reward_debt) {
  return begin_cell()
    .store_coins(staked_amount)
    .store_uint(start_time, 64)
    .store_uint(reward_debt, 32)
    .end_cell();
}

(cell) update_staker_dict(cell stakers_dict, slice staker_addr, int staked_amount, int start_time, int reward_debt) {
  var staker_info = save_staker_info(staked_amount, start_time, reward_debt);
  return stakers_dict~dict_set(staker_addr, staker_info, 256);
}
```

### Protocol State Helpers

Keep configuration and guard metadata in a dedicated protocol state cell so the
main record stays compact while still exposing structured fields to callers.

```func
cell store_protocol_state(
  int protocol_profits,
  int performance_fee,
  slice governance_token,
  slice admin,
  slice emergency_admin,
  int paused,
  int pause_time
) {
  return begin_cell()
    .store_coins(protocol_profits)
    .store_uint(performance_fee, 16)
    .store_slice(governance_token)
    .store_slice(admin)
    .store_slice(emergency_admin)
    .store_uint(paused, 1)
    .store_uint(pause_time, 64)
    .end_cell();
}

(int, int, slice, slice, slice, int, int) load_protocol_state(cell protocol_state_cell) {
  var cs = protocol_state_cell.begin_parse();
  return (
    cs~load_coins(),
    cs~load_uint(16),
    cs~load_slice(256),
    cs~load_slice(256),
    cs~load_slice(256),
    cs~load_uint(1),
    cs~load_uint(64)
  );
}
```

### NFT Storage

Challenge and Funded Trader NFTs share a versioned collection layout that tracks
supply, ownership, and metadata.

```func
() store_nft_data(int index, slice owner, int challenge_status, int capital_allocation) impure {
  set_data(
    begin_cell()
      .store_uint(index, 64)
      .store_slice(owner)
      .store_uint(challenge_status, 2)
      .store_coins(capital_allocation)
      .end_cell()
  );
}

() store_collection_data(int total_supply, cell nft_dict, slice admin, cell content) impure {
  set_data(
    begin_cell()
      .store_uint(total_supply, 64)
      .store_dict(nft_dict)
      .store_slice(admin)
      .store_ref(content)
      .end_cell()
  );
}
```

## Multi-Contract Architecture

Dynamic Capital requires coordinated state across staking, profit sharing, and
governance components. Persist the key aggregates in each contract and pass
references (slices or dictionary cells) when linking modules.

- **Main DCT Contract:** Track total value locked, staker/trader dictionaries,
  governance token address, and fee configuration.
- **Profit Sharing Contract:** Maintain cumulative and distributed profits plus
  last distribution timestamp.
- **Versioned State Envelope:** Support seamless migrations by storing legacy
  state alongside the active schema.

```func
() store_main_state(
  int total_tvl,
  cell staking_pool,
  cell trader_pool,
  int performance_fee,
  slice governance_token
) impure {
  set_data(
    begin_cell()
      .store_coins(total_tvl)
      .store_dict(staking_pool)
      .store_dict(trader_pool)
      .store_uint(performance_fee, 8)
      .store_slice(governance_token)
      .end_cell()
  );
}

() store_profit_state(
  int total_profits,
  int distributed_profits,
  int last_distribution,
  cell profit_records
) impure {
  set_data(
    begin_cell()
      .store_coins(total_profits)
      .store_coins(distributed_profits)
      .store_uint(last_distribution, 64)
      .store_dict(profit_records)
      .end_cell()
  );
}

() store_versioned_state(int version, cell legacy_state, cell current_state, slice migrator) impure {
  set_data(
    begin_cell()
      .store_uint(version, 16)
      .store_dict(legacy_state)
      .store_dict(current_state)
      .store_slice(migrator)
      .end_cell()
  );
}

() migrate_state(int new_version, cell new_state_structure) impure {
  var (old_version, legacy_state, current_state, migrator) = load_versioned_state();

  ;; Only migrator contract can call this
  throw_unless(733, equal_slices(msg.sender, migrator));

  store_versioned_state(new_version, current_state, new_state_structure, migrator);
}
```

## State Transition Patterns

- **Atomic updates:** Load once, mutate local copies, then persist in a single
  `store_*` call.
- **State guards:** Validate prerequisites (e.g., challenge completion criteria)
  before committing new state or minting NFTs.
- **Batch operations:** Iterate over dictionary references to process multiple
  actors per transaction.

```func
() process_staking(slice staker_addr, int amount) impure {
  var (total_staked, stakers_dict, traders_dict, protocol_state) = load_data();

  stakers_dict = update_staker_dict(stakers_dict, staker_addr, amount, now(), 0);
  total_staked += amount;

  store_data(total_staked, stakers_dict, traders_dict, protocol_state);
}

() complete_challenge(slice trader_addr, int challenge_id) impure {
  var challenge_info = load_challenge(challenge_id);

  ;; State guards
  throw_unless(100, challenge_info.active == 1);
  throw_unless(101, challenge_info.profit_target_reached == 1);
  throw_unless(102, challenge_info.max_drawdown_not_breached == 1);

  challenge_info.active = 0;
  challenge_info.completed = 1;
  challenge_info.completion_time = now();

  ;; Mint Funded Trader NFT
  mint_funded_trader_nft(trader_addr, challenge_id);

  store_challenge(challenge_id, challenge_info);
}

(cell) process_staker_batch(cell stakers_dict, cell batch_operations) {
  var cs = batch_operations.begin_parse();

  while (cs.slice_refs()) {
    var op = cs~load_ref();
    var op_cs = op.begin_parse();
    var staker_addr = op_cs~load_slice(256);
    var operation_type = op_cs~load_uint(8);
    var amount = op_cs~load_coins();

    stakers_dict = apply_staker_operation(stakers_dict, staker_addr, operation_type, amount);
  }

  return stakers_dict;
}
```

## Security Controls

- **Access control:** Restrict protocol parameter updates to admin or governance
  addresses, and enforce parameter bounds.
- **Emergency handling:** Maintain pause flags and timestamps to disable state
  transitions during incidents.

```func
() update_protocol_parameters(int new_fee, slice caller) impure {
  var (total_staked, stakers_dict, traders_dict, protocol_state) = load_data();
  var (
    protocol_profits,
    performance_fee,
    governance_token,
    admin,
    emergency_admin,
    paused,
    pause_time
  ) = load_protocol_state(protocol_state);

  ;; Only admin or governance contract can update
  throw_unless(401, equal_slices(caller, admin) || is_governance_contract(caller));

  ;; Validate parameter bounds
  throw_unless(402, new_fee >= 0 && new_fee <= 2000);

  performance_fee = new_fee;
  protocol_state = store_protocol_state(
    protocol_profits,
    performance_fee,
    governance_token,
    admin,
    emergency_admin,
    paused,
    pause_time
  );

  store_data(total_staked, stakers_dict, traders_dict, protocol_state);
}

() set_emergency_pause(int paused, slice emergency_admin) impure {
  var (total_staked, stakers_dict, traders_dict, protocol_state) = load_data();
  var (
    protocol_profits,
    performance_fee,
    governance_token,
    admin,
    stored_emergency_admin,
    current_paused,
    pause_time
  ) = load_protocol_state(protocol_state);

  ;; Only emergency admin can pause
  throw_unless(501, equal_slices(emergency_admin, stored_emergency_admin));

  current_paused = paused;
  pause_time = now();

  protocol_state = store_protocol_state(
    protocol_profits,
    performance_fee,
    governance_token,
    admin,
    stored_emergency_admin,
    current_paused,
    pause_time
  );

  store_data(total_staked, stakers_dict, traders_dict, protocol_state);
}

() check_not_paused() {
  var (_, _, _, protocol_state) = load_data();
  var (_, _, _, _, _, paused, _) = load_protocol_state(protocol_state);
  throw_if(502, paused == 1);
}
```

## Operational Recommendations

| Practice         | Description                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Snapshot caching | Use the `c5` register for ephemeral metrics (e.g., performance cache) that do not need persistence. |
| Upgrade path     | Keep migrator address and version numbers in state to support seamless upgrades.                    |
| Auditing         | Log relevant state transitions via events where possible and document guard conditions for audits.  |

## Recommended Next Steps

1. Implement the described storage helpers within the FunC modules for the DCT
   contracts.
2. Establish integration tests that simulate staking, challenge completion, and
   migrations to validate atomicity and guards.
3. Document the governance process for updating protocol parameters and
   emergency response triggers.
