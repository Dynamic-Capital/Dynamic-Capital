# Core Components of a FunC Contract

## Overview

FunC contracts on the TON blockchain are built around a compact set of entry
points that coordinate deterministic state updates on the TON Virtual Machine
(TVM). A robust implementation couples disciplined stack manipulation with
explicit cell construction to deliver predictable execution, bounded gas
consumption, and auditable behaviour under stress.

### Execution Context Quick Reference

| Aspect                | Summary                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Stack Layout**      | Arguments are pushed right-to-left; the current continuation (`c0`) and contract data (`c4`) are implicitly available. |
| **Gas Accounting**    | TVM debits gas before instruction execution. Guard long-running loops and external calls with explicit caps.           |
| **Message Envelopes** | `in_msg` references the full inbound cell; slices derived from it must be copied before destructive reads.             |
| **Persistent Data**   | Accessed via `get_data()` / `set_data()`. Serialise composite data into nested cells to avoid size explosions.         |
| **Error Signalling**  | `throw(code)` and `throw_if(code, condition)` abort execution and return unused gas minus penalties.                   |

## Fundamental Building Blocks

### Function Declarations and Definitions

- A FunC program is composed of function declarations and definitions.
- Use `;` to declare a function signature and `{ ... }` to define the
  implementation.
- Group related helper functions into logical sections to keep large codebases
  maintainable.

### Special Entry Points

| Function                     | ID                     | Trigger                                                  | Primary Responsibilities                                                                                                                 |
| ---------------------------- | ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `recv_internal()`            | `0`                    | Internal message from another contract or wallet         | Decode opcodes, enforce payment/value constraints, dispatch to feature-specific handlers, and write back state.                          |
| `recv_external()`            | `-1`                   | External inbound message from an off-chain client        | Authenticate the caller (if required), harden against replay attacks, and limit exposed functionality to idempotent or admin-only tasks. |
| `main()` / `main_external()` | Implementation-defined | Explicit invocation via the TVM (e.g., get-method calls) | Provide deterministic getters or simulation routines that query persistent state without side effects.                                   |

### Function Specifiers

- `impure` prevents the compiler from pruning function calls that have
  observable side effects (for example, sending outbound messages or mutating
  persistent storage).
- `inline` substitutes the function body directly at the call site; avoid
  recursion in inline functions.
- `method_id(<id>)` pins a function to a specific selector, enabling structured
  dispatch tables.

### Method Chaining Semantics

- **Non-mutating chaining** leverages fluent APIs such as
  `begin_cell().store_uint(239, 8)`. Each call returns a new builder instance.
- **Mutating chaining** uses the `~` operator. The callee returns
  `(modified_value, ())` to propagate state updates across chained calls.
- **Persistence helpers** should return both the updated cell and a status flag
  to keep downstream operations explicit.

### Diagnostics and Logging

- The console library exposes helpers such as `log()`, `dump()`, and
  `pretty_coins()` for formatting stack values during local testing and
  debugging.
- Wrap debug-only helpers in `#ifdef DEBUG` guards to prevent unnecessary gas
  consumption in production builds.
- When tracing message execution, log both the opcode and the high-level action
  to simplify correlation with client telemetry.

## Typical Development Workflow

1. **Define Contract Purpose** – Specify key actions, invariants, and message
   flows.
2. **Set Up Environment** – Install the FunC compiler alongside TON developer
   tooling (e.g., `toncli`, `tonos-cli`).
3. **Model State Layout** – Sketch persistent storage cells, including bit
   widths and references for each field.
4. **Author Contract Logic** – Implement `recv_internal()` as the core
   dispatcher, then build supporting functions marked with `impure` or `inline`
   as appropriate.
5. **Compile** – Use the FunC compiler to emit TVM bytecode and optionally ABI
   descriptions.
6. **Test** – Exercise the contract on TON testnet, leveraging console helpers
   for visibility into state transitions.
7. **Deploy** – Publish the compiled bytecode to mainnet, accounting for Toncoin
   deployment fees.

## Execution Flow Example

```func
() recv_internal(int in_msg_value, cell in_msg, slice in_msg_body) impure {
    ;; Step 1: Decode the operation identifier
    int op = in_msg_body~load_uint(32);

    ;; Step 2: Authorise sender and value constraints
    throw_if(101, in_msg_value < MIN_MSG_VALUE);
    slice sender = in_msg~load_msg_addr();
    require_owner(sender);

    ;; Step 3: Dispatch to feature-specific handlers
    if (op == OP_PLACE_ORDER) {
        handle_place_order(in_msg_body);
    } elseif (op == OP_CANCEL_ORDER) {
        handle_cancel_order(in_msg_body);
    } else {
        throw(102);
    }
}
```

- **Operation decoding** maintains deterministic function branching.
- **Guard clauses** preserve gas and prevent unauthorised usage.
- **Dedicated handlers** keep the entry point focused on orchestration.
- **Gas-aware senders** should be debited explicitly before outbound messages to
  guarantee atomicity.

### External Message Flow Companion

```func
() recv_external(slice in_msg_body) impure {
    ;; Step 1: Authenticate sender (if multi-sig, delegate to guardian set)
    require_admin_signature(in_msg_body);

    ;; Step 2: Execute administrative command
    int op = in_msg_body~load_uint(32);
    if (op == OP_SET_CONFIG) {
        apply_config_update(in_msg_body);
    } elseif (op == OP_PAUSE) {
        toggle_pause_flag(true);
    } else {
        throw(201);
    }

    ;; Step 3: Return success acknowledgement (optional)
    send_admin_ack();
}
```

- **Authentication** should consider replay vectors by binding nonces or
  expirations into the message body.
- **Administrative separation** keeps privileged logic outside the standard
  trading paths, reducing attack surface.

## Persistent Storage Blueprint

| Cell          | Purpose                      | Key Fields                                           | Serialization Notes                                                                           |
| ------------- | ---------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `root_cell`   | Canonical contract state     | Version flag, admin address, balance snapshot        | Keep global invariants (e.g., paused flag) in fixed-width bits near the root for fast checks. |
| `orders_cell` | Dynamic order book data      | Order count, reference list of active orders         | Store list heads as references; use bounded slices to cap memory growth.                      |
| `config_cell` | Operational settings         | Risk parameters, fee schedule, execution toggles     | Include a checksum or version number to enforce upgrade sequencing.                           |
| `audit_cell`  | Historical execution markers | Last processed nonce, settlement timestamp, checksum | Enables replay protection and deterministic reconciliation with off-chain ledgers.            |

**Implementation Tips**

- Use deterministic layouts: store version and upgrade flags at fixed bit
  positions.
- Encapsulate load/store logic in helper functions (e.g., `load_config()` /
  `store_config()`).
- Document bit widths to avoid silent truncation when parameters evolve.
- Reserve spare bits for future expansion and clearly document unused padding to
  avoid accidental reuse.
- Compose nested builders with defensive defaults (e.g., zeroed fees) to guard
  against partially initialised writes.

## Error Handling Strategy

- Establish integer error codes and reuse them across modules for consistent
  telemetry.
- Prefer `throw_if(code, condition)` patterns for branch-heavy logic.
- Emit explicit `error` logs during testing to simplify diagnosing failing
  paths.
- Wrap high-risk sections (liquidations, withdrawals) in dedicated functions so
  that invariants can be unit-tested in isolation.
- Maintain an error code registry in shared documentation to synchronise
  on-chain failures with off-chain monitoring.

## Testing Checklist

- Unit-test handlers with `toncli run`, `func -o`, or emulator-based frameworks.
- Validate serialisation by reconstructing storage cells and verifying bit
  precision.
- Run integration scripts that mimic internal and external message flows,
  asserting on emitted events and outgoing messages.
- Capture coverage of negative paths (bad opcodes, insufficient value,
  unauthorised senders).
- Track code coverage (where tooling permits) to prioritise tests around
  financial logic and settlement-critical flows.

### Testing Toolkit Snapshot

| Tool                         | Use Case                                          | Notes                                                                  |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `toncli`                     | Local compilation, unit tests, deployment scripts | Supports sandboxed execution and fixture-driven tests.                 |
| `tonos-cli`                  | On-chain interaction, message crafting            | Ideal for manual sanity checks against testnet deployments.            |
| FunC Emulator                | Deterministic simulation of TVM bytecode          | Validate edge cases without incurring gas costs.                       |
| Integration Harness (custom) | End-to-end trading scenarios                      | Mirror production message cadence to test liquidity and risk controls. |

## Recommended Next Steps

- Review the official TON documentation and TON Blockchain course for in-depth
  coverage of FunC syntax and TVM execution semantics.
- Incorporate these guidelines into internal playbooks for dynamic prop firm
  contract development.
- Extend this summary with project-specific modules once architectural decisions
  are finalised.
- Build a contract skeleton repository with templated
  `recv_internal`/`recv_external` handlers, shared error codes, and CI scripts
  that run the testing checklist automatically.
