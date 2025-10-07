# Codex Configuration Guide

This guide explains how to locate and maintain the shared Codex configuration file used by both the CLI and the IDE extension. Use it when you need to change the default model, adjust approval prompts, or tune sandbox access.

## Configuration file location

- **Path:** `~/.codex/config.toml`
- **IDE shortcut:** Click the gear icon in the top-right corner of the Codex IDE extension, then choose **Codex Settings → Open config.toml** to open the file directly.

The same configuration applies to both the CLI and the IDE extension, so changes you make here affect every Codex surface tied to your account.

## Common configuration options

| Setting                      | Purpose                                                         | Example `config.toml` entry                              | CLI override                              |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `model`                      | Selects the default model used by the CLI and IDE.              | `model = "gpt-5"`                                        | `codex --model gpt-5`                     |
| `model_provider`             | Chooses the backend provider referenced by the active model.    | `model_provider = "ollama"`                              | `codex --config model_provider="ollama"` |
| `approval_policy`            | Controls when Codex pauses for confirmation before executing.   | `approval_policy = "on-request"`                         | `codex --approval-policy on-request`      |
| `sandbox_mode`               | Sets the filesystem/network access level for generated commands | `sandbox_mode = "workspace-write"`                       | `codex --sandbox workspace-write`         |
| `model_reasoning_effort`     | Tunes reasoning depth for models that support adjustable effort | `model_reasoning_effort = "high"`                        | `codex --config model_reasoning_effort="high"` |
| `[shell_environment_policy]` | Restricts environment variables forwarded to spawned commands.  | `[shell_environment_policy]\ninclude_only = ["PATH", "HOME"]` | `codex --config shell_environment_policy.include_only='["PATH","HOME"]'` |

## Profiles for alternate setups

Define multiple `[profiles.<name>]` blocks in `config.toml` to switch between configurations. Launch the CLI with `codex --profile my-profile` to apply the profile-specific options without editing the base file.

## Additional resources

Consult the full Codex configuration reference on GitHub for every available key, along with IDE personalization options such as keyboard shortcuts and UI preferences (accessible via the gear icon → **IDE settings**).
