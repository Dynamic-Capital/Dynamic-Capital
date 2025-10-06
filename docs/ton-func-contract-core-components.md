# Core Components of a FunC Contract

## Overview
FunC contracts on the TON blockchain are structured around a concise set of entry points and helper routines. The language emphasises explicit stack manipulation, modular cell construction, and deterministic side effects to enable secure deployment on the TON Virtual Machine (TVM).

## Fundamental Building Blocks

### Function Declarations and Definitions
- A FunC program is composed of function declarations and definitions.
- Use `;` to declare a function signature and `{ ... }` to define the implementation.
- Group related helper functions to maintain clarity across larger contracts.

### Special Entry Points
- `recv_internal()` (function id `0`) **must** be defined to process inbound internal messages. The function can inspect stack values such as the message value, sender, and message body.
- `recv_external()` (function id `-1`) is used for handling external inbound messages. Implement when the contract needs to process off-chain initiated calls.

### Function Specifiers
- `impure` prevents the compiler from pruning function calls that have observable side effects (for example, sending outbound messages or mutating persistent storage).
- `inline` substitutes the function body directly at the call site; avoid recursion in inline functions.

### Method Chaining Semantics
- Non-mutating chaining leverages fluent APIs such as `begin_cell().store_uint(239, 8)`.
- Mutating chaining uses the `~` operator. The callee returns `(modified_value, ())` to propagate state updates across chained calls.

### Diagnostics and Logging
- The console library exposes helpers such as `log()` and `pretty_coins()` for formatting stack values during local testing and debugging.

## Typical Development Workflow
1. **Define Contract Purpose** – Specify key actions, invariants, and message flows.
2. **Set Up Environment** – Install the FunC compiler alongside TON developer tooling (e.g., `toncli`, `tonos-cli`).
3. **Author Contract Logic** – Implement `recv_internal()` as the core dispatcher, then build supporting functions marked with `impure` or `inline` as appropriate.
4. **Compile** – Use the FunC compiler to emit TVM bytecode and optionally ABI descriptions.
5. **Test** – Exercise the contract on TON testnet, leveraging console helpers for visibility into state transitions.
6. **Deploy** – Publish the compiled bytecode to mainnet, accounting for Toncoin deployment fees.

## Advanced Structuring Patterns
- **Modularity** – Split complex behaviour into focused modules or libraries to keep entry-point logic concise.
- **Error Handling** – Establish integer error codes and use `throw()` for deterministic exception management.
- **State Management** – Define how persistent data is stored and retrieved from TVM cells; encapsulate storage schemas for maintainability.

## Recommended Next Steps
- Review the official TON documentation and TON Blockchain course for in-depth coverage of FunC syntax and TVM execution semantics.
- Incorporate these guidelines into internal playbooks for dynamic prop firm contract development.
- Extend this summary with project-specific modules once architectural decisions are finalised.
