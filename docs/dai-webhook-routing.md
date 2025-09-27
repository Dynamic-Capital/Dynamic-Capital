# DAI Webhook Routing Patterns

Dynamic AI (DAI) can register TradingView (or other automation) webhooks in two
complementary ways. Start with the lightweight universal endpoint and evolve
toward auto-provisioned per-strategy routes once the strategy catalog and
governance mature.

## 1. Universal Webhook Endpoint

Keep one FastAPI (or equivalent) webhook URL such as
`https://api.dynamiccapital.app/webhook`.

TradingView alerts embed routing metadata:

```json
{
  "strategy": "DynamicGoldBreakout",
  "signal": "BUY",
  "confidence": 0.82
}
```

The webhook handler inspects `strategy` (and any additional fields) to dispatch
signals to the correct execution pipeline. This keeps infrastructure simple—only
one public endpoint to secure, monitor, and rotate secrets for—while still
supporting many algos.

### Implementation Notes

- Use a FastAPI router that forwards payloads to the proper worker queue or
  Supabase function based on `strategy`.
- Include lightweight schema validation so malformed alerts are rejected
  quickly.
- Capture audit logs that store the payload, dispatch target, and correlation
  identifiers for downstream reconciliation.

## 2. Auto-Provisioned Strategy Endpoints

When teams want explicit URLs per strategy, DAI can auto-generate them during
algo registration (for example, via a Telegram admin command or Supabase
dashboard workflow).

1. Store strategy metadata in Supabase (e.g., a `strategies` table with `name`,
   `slug`, `webhook_secret`, and `status`).
2. On insert/update triggers—or a scheduled sync job—DAI reads the catalog and
   attaches FastAPI routes dynamically.
3. Each generated route follows a consistent naming convention (e.g.,
   `/webhook/dynamic-gold`, `/webhook/dynamic-forex`).
4. Respond to registrations by returning the new webhook URL to the requesting
   operator or bot.

Example helper using FastAPI's `APIRouter`:

```python
from fastapi import APIRouter


def create_webhook_route(strategy_name: str):
    router = APIRouter()

    @router.post(f"/webhook/{strategy_name}")
    async def webhook_handler(data: dict):
        # Route to the correct algo implementation
        return {"status": "ok", "strategy": strategy_name, "signal": data}

    return router
```

Mount each returned router on the main FastAPI app at boot after loading active
strategies from Supabase.

### Operational Workflow

- **Registration:** `/add_strategy DynamicGoldBreakout` (Telegram bot) or a
  Supabase UI form stores the new algo.
- **Provisioning:** DAI detects the new record, derives the slug
  (`dynamic-goldbreakout`), provisions `/webhook/dynamic-goldbreakout`, and
  persists the mapping.
- **Notification:** The provisioner shares the ready-to-use URL with TradingView
  automation or other signal sources.

## 3. Security Hardening

Regardless of routing style, lock down access so only authorized publishers can
post alerts.

- Require a query parameter token, HMAC signature, or JWT. Rotate secrets
  through Supabase and avoid embedding them in Pine Script.
- Enforce HTTPS and reject unsigned requests early to reduce load on downstream
  workers.
- Rate limit per strategy to prevent noisy or malicious senders from
  overwhelming the queue.
- Monitor for repeated auth failures and alert operators when thresholds are
  exceeded.

## 4. Migration Guidance

1. **Phase 1 – Universal Endpoint:** Ideal while the strategy catalog is small.
   Focus on message validation, logging, and queue fan-out.
2. **Phase 2 – Hybrid:** Begin provisioning dedicated routes for high-volume or
   regulated strategies while keeping others on the universal endpoint.
3. **Phase 3 – Full Automation:** All strategies register via Supabase; DAI
   auto-provisions routes, secrets, and monitoring hooks.

Document the current phase in the runbook so operations and AI assistants know
which URLs are active and how secrets are managed.
