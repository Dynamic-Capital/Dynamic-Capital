<!-- deno-fmt-ignore-file -->

# Telegram TL Schema Reference

The Telegram TL schema defines all MTProto and Bot API types that clients and
servers exchange. Dynamic Capital relies on these definitions to interpret
updates, issue commands, and validate payloads flowing through the Telegram bot
and Mini App. This note documents how to inspect the upstream schema at
[`core.telegram.org/schema`](https://core.telegram.org/schema), download machine
readable representations, and fold relevant updates into this repository.

## Navigating the schema portal

The schema portal exposes the TL (Type Language) definitions, grouped by
protocol layer:

- **API layer** – Bot API constructs such as `messages.sendMessage` and
  `UpdateNewMessage`. These determine which webhook payloads appear in
  `supabase/functions/telegram-webhook/index.ts` and which RPCs the bot can call.
- **MTProto core** – Low-level encrypted transport types, useful when debugging
  tonutils integrations or the Mini App's authorization flow.
- **JSON view** – A JSON-encoded representation of the current schema that is
  easier to diff or post-process than the TL text format.

When Telegram ships a new protocol layer, the site annotates each constructor
with the minimum layer so you can decide whether to upgrade client libraries.

## Downloading structured schema artifacts

The portal surfaces two machine-readable formats:

1. **TL text** – Click the **Download TL-Schema** link or run:
   ```bash
   curl -L "https://core.telegram.org/schema?type=tl" -o telegram.tl
   ```
   The TL format is suitable for feeding into TL code generators.
2. **JSON** – Use the dedicated endpoint:
   ```bash
   curl -L "https://core.telegram.org/schema/json" -o telegram-schema.json
   ```
   The JSON variant preserves layer metadata and argument types for each
   constructor, which is helpful when building analyzers or diffing upgrades.

Both endpoints return the full multi-layer schema. Expect files in the
~500–650&nbsp;KB range, so keep them out of Git history unless you genuinely need a
snapshot.

## Integrating schema updates

When Telegram publishes a new layer:

1. **Fetch the latest schema** – Store it in `/tmp` or another scratch directory.
2. **Compare against generated code** – Check whether libraries like
   `python-telegram-bot` or your TypeScript TL bindings already embed the layer.
3. **Update Dynamic Capital modules** – Audit the following areas for breaking
   changes:
   - `supabase/functions/telegram-webhook` for new update types or fields.
   - `supabase/functions/telegram-bot` handlers for new RPC capabilities.
   - `integrations/telegram_bot.py` when Python-based tooling needs expanded
     method coverage.
4. **Extend tests** – Mirror new update shapes inside
   `supabase/functions/_tests/telegram-webhook-security.test.ts` and related
   suites so CI detects regressions.

Document noteworthy changes in the release notes or runbooks to keep operators
aligned on Telegram surface behaviour.

## Additional references

- [TL Type Language overview](https://core.telegram.org/mtproto/TL) – Grammar
  documentation for the TL format.
- [Telegram Bot API documentation](https://core.telegram.org/bots/api) – Bot API
  method semantics referenced throughout Dynamic Capital's Supabase functions.
- [Schema changelog](https://core.telegram.org/schema/changelog) – Layer history
  for tracking newly introduced constructors.

