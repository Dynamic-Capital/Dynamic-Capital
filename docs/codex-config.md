# Codex Configuration Guide

Use this guide to keep your Codex configuration fast, safe, and consistent
across the CLI and IDE extension. The same `config.toml` powers both surfaces,
so an optimized setup prevents surprises when you switch contexts.

## Configuration file location

- **Path:** `~/.codex/config.toml`
- **IDE shortcut:** Click the gear icon in the top-right corner of the Codex IDE
  extension, then choose **Codex Settings → Open config.toml** to jump directly
  into the file.

## Quick optimization checklist

1. Back up the current config before making changes (copy to `config.toml.bak`).
2. Define the default model and provider together so the CLI and IDE stay in
   sync.
3. Tighten the approval policy and sandbox mode for production or shared
   machines.
4. Scope environment variables explicitly—avoid forwarding secrets you do not
   need.
5. Capture repeatable combinations as profiles so you can swap contexts without
   edits.

## Core configuration options

| Setting                         | Why it matters                                                                                                    | Optimized `config.toml` example    | Fast override                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| `model`                         | Pins the model you reach for most often. Pair with `model_provider` to avoid mismatches.                          | `model = "gpt-5"`                  | `codex --model gpt-5`                          |
| `model_provider`                | Identifies the backend that serves the active model.                                                              | `model_provider = "ollama"`        | `codex --config model_provider="ollama"`       |
| `approval_policy`               | Controls when Codex prompts before running commands. Use `on-request` or `always` on shared hardware.             | `approval_policy = "on-request"`   | `codex --approval-policy on-request`           |
| `sandbox_mode`                  | Limits filesystem and network scope. Lock down to `workspace-read`/`workspace-write` to prevent accidental leaks. | `sandbox_mode = "workspace-write"` | `codex --sandbox workspace-write`              |
| `model_reasoning_effort`        | Trades latency for deeper reasoning on compatible models.                                                         | `model_reasoning_effort = "high"`  | `codex --config model_reasoning_effort="high"` |
| `[shell_environment_policy]`    | Controls which environment variables reach spawned commands.                                                      | ```toml                            |                                                |
| [shell_environment_policy]      |                                                                                                                   |                                    |                                                |
| include_only = ["PATH", "HOME"] |                                                                                                                   |                                    |                                                |
| ```                             | `codex --config shell_environment_policy.include_only='["PATH","HOME"]'`                                          |                                    |                                                |

### Security hardening tips

- Prefer `exclude` lists only when you have tight CI coverage; otherwise stick
  to `include_only` so new secrets are not leaked automatically.
- Combine strict approval prompts (`always`) with `workspace-read` sandboxing
  when demonstrating commands live or pairing with new contributors.
- Keep a minimal profile for CI/automation that disables the sandbox only if the
  workflow requires network access.

## Profile recipes

Profiles let you switch between optimized setups without editing the root keys.
Add them to `config.toml` as dedicated blocks:

```toml
[profiles.fast-iteration]
model = "gpt-5"
model_reasoning_effort = "medium"
approval_policy = "auto"
sandbox_mode = "workspace-write"

[profiles.locked-down]
model = "gpt-4.1"
approval_policy = "always"
sandbox_mode = "workspace-read"

[profiles.batch-automation]
model = "gpt-5"
model_reasoning_effort = "high"
approval_policy = "on-request"
[profiles.batch-automation.shell_environment_policy]
include_only = ["PATH", "HOME", "CI", "SUPABASE_URL"]
```

Activate a profile on the CLI with `codex --profile fast-iteration`. In the IDE,
use the gear icon → **Codex Settings → Active profile** to toggle the same
presets.

## IDE personalization

After the agent settings are dialed in, open **Keyboard shortcuts** from the
gear menu to pin frequently used actions (e.g., _Explain diff_, _Generate
tests_) and keep the optimized workflow close at hand.

For the exhaustive key list, review the Codex configuration reference on GitHub.

## Dynamic Capital web UI OpenAI overrides

To target a self-hosted or proxy-compatible OpenAI endpoint from the Dynamic
Capital web UI, add the following environment variables to your `.env.local`:

| Variable          | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `OPENAI_BASE_URL` | Optional. Override the default `https://api.openai.com/v1`. |
| `OPENAI_API_KEY`  | Optional. API key to send as a Bearer token when required.  |

When `OPENAI_BASE_URL` is defined, requests are routed to that base URL while
preserving the standard `/chat/completions` path. If `OPENAI_API_KEY` is not
set, the Authorization header is omitted—useful for local gateways that trust
network boundaries instead of bearer tokens.
