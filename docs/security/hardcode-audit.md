# Hardcode Audit Playbook

## Overview

The hardcode audit provides a guardrail against accidentally committing API
keys, secrets, or other high-entropy tokens. It statically scans source and
configuration files for recognizable credential patterns and suspicious string
literals, returning a non-zero exit code when potential issues are found.

## Running the audit

```bash
npm run audit:hardcodes
```

The command reports `✅ No suspicious hardcoded secrets detected.` when the scan
passes. Any detections include the file path, line, column, pattern label, and a
short description of why the value was flagged so engineers can quickly verify
and remediate. Add the `--strict` flag to review results without the built-in
allow list for known TON wallet addresses and base64 resources:

```bash
npm run audit:hardcodes -- --strict
```

## Detection coverage

The scanner currently looks for:

- OpenAI-style keys (`sk-` prefix with 20+ characters).
- Google API keys starting with `AIza`.
- GitHub PAT or fine-grained tokens (`ghp_`, `github_pat_`).
- Slack tokens (`xoxb-`, `xoxp-`, `xoxa-`, etc.).
- AWS access keys (`AKIA`, `ASIA`, and similar prefixes).
- Stripe live/test keys (`sk_`, `rk_`, `pk_`).
- SendGrid API tokens (`SG.` prefix pattern).
- Twilio secrets (`SK` followed by 32 hex characters).
- Generic high-entropy literals (32+ characters mixing case, digits, and
  symbols).

Extend `scripts/security/audit-hardcodes.ts` with additional regex patterns or
allow-list logic as the infrastructure evolves. All detections and script
behavior should remain transparent so humans can review the results and approve
any necessary exceptions.
