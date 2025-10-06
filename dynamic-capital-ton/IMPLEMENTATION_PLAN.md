# Ton Pool Allocator Jetton Transfer Fix Plan

## Background

- `contracts/pool_allocator.tact` handles inbound TIP-3 `transfer` messages in
  `handleJettonTransfer`.
- The current implementation skips over the jetton `amount`, `destination`,
  `response_destination`, and `forward_ton_amount` fields when parsing the
  transfer body. It then divides the inbound TON value by two when forwarding to
  the router and rereads the body from the top to obtain the DCT amount for the
  emitted `DepositEvent`.
- This diverges from the TIP-3 transfer layout defined in
  [TEP-81](https://github.com/ton-blockchain/TEPs/blob/master/text/0081-dns-standard.md)
  and causes legitimate deposits to be rejected or underfunded.

## Objectives

1. Align `handleJettonTransfer` with the TIP-3 transfer payload structure so the
   allocator can safely accept standard wallet transfers.
2. Ensure the allocator forwards the exact `forward_ton_amount` declared by the
   depositor to `self.dexRouter`.
3. Emit `DepositEvent` values using the already parsed transfer fields rather
   than reparsing the body, ensuring the logged DCT amount and TON hash match
   the executed deposit.
4. Add regression coverage that simulates a compliant TIP-3 transfer and
   verifies the router receives the declared TON amount while the allocator
   emits a consistent `DepositEvent`.

## Implementation Steps

1. **Refactor TIP-3 Parsing**
   - After loading the op code and query ID, sequentially read:
     - `jetton_amount = body.loadCoins()`
     - `destination = body.loadMsgAddress()` and
       `response_destination = body.loadMsgAddress()`
     - `custom_payload = body.loadMaybeRef()` (keep optional for future use)
     - `forward_ton_amount = body.loadCoins()`
     - `forward_payload_slice = body.loadEitherRef().beginParse()` to access the
       deposit payload.
   - Validate `forward_payload_slice.loadUint(32)` equals `OP_DEPOSIT` before
     proceeding.

2. **Forward Correct TON Value**
   - Replace `msg.info.value / 2` with the parsed `forward_ton_amount` when
     constructing the internal message to `self.dexRouter`.
   - Preserve the remaining balance (if any) by relying on Tact runtime defaults
     or explicitly refunding if needed.

3. **Emit Deposit Event Using Parsed Data**
   - Capture `jetton_amount` for the event's `usdtAmount` (or reuse whichever
     field represents USDT) and avoid reparsing the body.
   - Use the parsed forward payload fields (`depositId`, `investorKey`,
     `expectedFx`, `tonTx`) and, if the event needs the transferred jetton or
     TON amounts, include the already parsed values.

4. **Regression Test**
   - Extend `apps/tests/pool_allocator.test.ts` or add a new integration test
     that constructs a TIP-3 transfer cell with explicit `forward_ton_amount`
     and deposit payload.
   - Simulate calling `handleJettonTransfer` (using Tact testing utilities or a
     mock) and assert that:
     - The router message carries `forward_ton_amount` in its value field.
     - The deposit payload remains intact and the event reflects the parsed
       amounts.
   - Cover rejection scenarios (e.g., incorrect op code) to ensure parsing
     guards remain effective.

5. **Housekeeping**
   - Run `npm run format`, `npm run lint`, and any TON contract build/test
     commands required by the project to validate the changes.

## Implementation Checklist

- [x] Update `handleJettonTransfer` parsing order to follow TIP-3 transfer
      structure (Steps 1.1–1.5). _Completed 2025-10-06; see contract evidence_
- [x] Guard against malformed payloads by validating the deposit opcode
      extracted from the forward payload (Step 1.6). _Completed 2025-10-06_
- [x] Forward the parsed `forward_ton_amount` to `self.dexRouter` instead of
      halving the inbound TON (Step 2). _Completed 2025-10-06_
- [x] Emit `DepositEvent` fields using the parsed jetton and forward payload
      data without reparsing (Step 3). _Completed 2025-10-06_
- [ ] Extend or add allocator regression tests to cover compliant transfers and
      rejection paths (Step 4). _Blocked 2025-10-06: Deno aborted while caching
      npm dependencies (e.g., `bnc-sdk@4.6.9`, `@grammyjs/conversations@2.1.0`)
      with repeated HTTP 502s; rerun required once the registry outage clears_
- [ ] Run formatting, linting, and contract/test suites relevant to the
      allocator changes (Step 5). _Blocked until the regression suites can
      execute successfully_

## Dependencies & Open Questions

- Confirm whether Tact testing infrastructure exists in the repo to simulate
  contract executions. If not, plan to add focused unit tests using the
  available toolchain or document the manual testing process.
- Verify if the allocator needs to refund any leftover TON from
  `msg.info.value - forward_ton_amount`; clarify desired behavior with
  stakeholders if unspecified.

## Evidence — 2025-10-06

- Executed `npm run go-live` to refresh the Telegram webhook automation and
  captured the run log under `docs/checklist-runs/2025-10-06-go-live.md`.
- The latest attempts to rerun the allocator regression suite via
  ``npx deno test --config deno.json -A --unsafely-ignore-certificate-errors``
-  failed because npm returned `502` responses while caching dependencies such as
  `bnc-sdk@4.6.9` and `@grammyjs/conversations@2.1.0`; see the updated test log
  for failure traces and retry instructions.
- Supabase wallet-link and subscription flows remain pending revalidation until
  the dependency outage is resolved and the Deno suites complete successfully.
