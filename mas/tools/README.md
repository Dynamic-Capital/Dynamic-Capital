# Tooling

Support utilities for schema management, load generation, and canary orchestration live here.

Planned tools:

- `schema-publisher/`: Publishes JSON Schemas to the registry with version hashing.
- `codegen/`: Generates Pydantic models and TypeScript types from JSON Schema.
- `canary-publisher/`: Synthetic message publisher to validate deployments.
- `load-gen/`: Ray-based load testing harness for stress and soak tests.
- `dlq-replayer/`: Safely replays DLQ messages post remediation.

Each tool must be idempotent, include dry-run mode, and support structured logging for observability.

