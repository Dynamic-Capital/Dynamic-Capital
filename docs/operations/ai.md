# AI Operations Controls

## Rate limiting

Dynamic AI chat requests now enforce rate limiting before forwarding any payload
to the upstream service. Two sliding windows run for each request:

- **Per-user**: keyed by the authenticated NextAuth user (or the session ID when
  admin tokens are used).
- **Per-session**: keyed by the supplied `sessionId` value so that anonymous or
  shared sessions are also throttled.

When a caller exhausts either window the handler immediately returns `429`
without persisting the new user message or reaching the Dynamic AI API. The JSON
response contains the active limiter state under a `limits` array and a
`Retry-After` header is emitted when the reset window is known.

## Telemetry

Every rate-limit decision and downstream completion is recorded as a structured
telemetry event. Events are persisted in Supabase under the `user_interactions`
table with `interaction_type` set to `ai_chat_telemetry`. Each record captures
the evaluated rate-limit windows, caller identifiers, request success, and
latency to make quota tuning and incident investigation observable.

For local development or tests the telemetry pipeline can be overridden via the
`AI_CHAT_TELEMETRY_OVERRIDE_SYMBOL` global symbol.

## Configuration

Environment variables control the new quotas. Defaults are conservative and can
be overridden per environment.

- `DYNAMIC_AI_CHAT_USER_LIMIT` – allowed requests per user window.
- `DYNAMIC_AI_CHAT_USER_WINDOW_SECONDS` – window size for the per-user limiter.
- `DYNAMIC_AI_CHAT_SESSION_LIMIT` – allowed requests per chat session window.
- `DYNAMIC_AI_CHAT_SESSION_WINDOW_SECONDS` – window size for the per-session
  limiter.

Setting any limit to `0` disables that limiter. Changes are picked up on the
next request; no redeploy is required. Ensure the Upstash Redis credentials are
configured when deploying rate limits in production so that limits are enforced
consistently across instances.
