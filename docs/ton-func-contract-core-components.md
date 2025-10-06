# Core Components of a FunC Contract

## Overview
FunC contracts on the TON blockchain are built around a small set of entry points that coordinate deterministic state updates on the TON Virtual Machine (TVM). Effective contracts pair disciplined stack manipulation with explicit cell construction, enabling predictable execution and auditable behaviour.

## Fundamental Building Blocks

### Function Declarations and Definitions
- A FunC program is composed of function declarations and definitions.
- Use `;` to declare a function signature and `{ ... }` to define the implementation.
- Group related helper functions into logical sections to keep large codebases maintainable.

### Special Entry Points
| Function | ID  | Purpose |
| --- | --- | --- |
| `recv_internal()` | `0` | Processes inbound internal messages. Inspect stack values (message value, sender, body) to authorise and dispatch logic. |
| `recv_external()` | `-1` | Handles off-chain initiated messages. Implement when the contract exposes administrative or public interfaces to external callers. |
| `main()` / `main_external()` | Defined per use case | Optional bootstrap entry points for specialised flows (e.g., get-method orchestration). |

### Function Specifiers
- `impure` prevents the compiler from pruning function calls that have observable side effects (for example, sending outbound messages or mutating persistent storage).
- `inline` substitutes the function body directly at the call site; avoid recursion in inline functions.
- `method_id(<id>)` pins a function to a specific selector, enabling structured dispatch tables.

### Method Chaining Semantics
- Non-mutating chaining leverages fluent APIs such as `begin_cell().store_uint(239, 8)`.
- Mutating chaining uses the `~` operator. The callee returns `(modified_value, ())` to propagate state updates across chained calls.

### Diagnostics and Logging
- The console library exposes helpers such as `log()` and `pretty_coins()` for formatting stack values during local testing and debugging.
- Wrap debug-only helpers in `#ifdef DEBUG` guards to prevent unnecessary gas consumption in production builds.

## Typical Development Workflow
1. **Define Contract Purpose** – Specify key actions, invariants, and message flows.
2. **Set Up Environment** – Install the FunC compiler alongside TON developer tooling (e.g., `toncli`, `tonos-cli`).
3. **Model State Layout** – Sketch persistent storage cells, including bit widths and references for each field.
4. **Author Contract Logic** – Implement `recv_internal()` as the core dispatcher, then build supporting functions marked with `impure` or `inline` as appropriate.
5. **Compile** – Use the FunC compiler to emit TVM bytecode and optionally ABI descriptions.
6. **Test** – Exercise the contract on TON testnet, leveraging console helpers for visibility into state transitions.
7. **Deploy** – Publish the compiled bytecode to mainnet, accounting for Toncoin deployment fees.

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

## Persistent Storage Blueprint
| Cell | Purpose | Key Fields |
| --- | --- | --- |
| `root_cell` | Canonical contract state | Version flag, admin address, balance snapshot |
| `orders_cell` | Dynamic order book data | Order count, reference list of active orders |
| `config_cell` | Operational settings | Risk parameters, fee schedule, execution toggles |

**Implementation Tips**
- Use deterministic layouts: store version and upgrade flags at fixed bit positions.
- Encapsulate load/store logic in helper functions (e.g., `load_config()` / `store_config()`).
- Document bit widths to avoid silent truncation when parameters evolve.

## Error Handling Strategy
- Establish integer error codes and reuse them across modules for consistent telemetry.
- Prefer `throw_if(code, condition)` patterns for branch-heavy logic.
- Emit explicit `error` logs during testing to simplify diagnosing failing paths.

## Testing Checklist
- Unit-test handlers with `toncli run` or emulator-based frameworks.
- Validate serialisation by reconstructing storage cells and verifying bit precision.
- Run integration scripts that mimic internal and external message flows, asserting on emitted events and outgoing messages.
- Capture coverage of negative paths (bad opcodes, insufficient value, unauthorised senders).

## Recommended Next Steps
- Review the official TON documentation and TON Blockchain course for in-depth coverage of FunC syntax and TVM execution semantics.
- Incorporate these guidelines into internal playbooks for dynamic prop firm contract development.
- Extend this summary with project-specific modules once architectural decisions are finalised.
