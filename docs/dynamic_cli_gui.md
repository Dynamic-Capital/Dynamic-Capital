# Dynamic CLI/CD Web Workbench

The Dynamic CLI/CD workbench exposes the Python `dynamic_framework` engine
through the Next.js application so product, platform, and operations teams can
experiment with maturity scenarios without leaving the browser. This document
summarises how the GUI maps to the existing CLI workflow and the environment
variables required for local development.

## Features

- **Scenario editor**: Pre-loaded with the default scenario blueprint and ready
  for custom history, decay, node, and pulse definitions.
- **Format selector**: Mirrors the CLI `--format` flag (`text`, `json`,
  `fine-tune`). The fine-tune option automatically enables dataset export.
- **Indent control**: Adjusts the `--indent` value, including support for `-1`
  to produce compact JSON.
- **Fine-tune tags**: Adds up to 16 default tags, forwarding them via the
  repeatable `--fine-tune-tag` CLI flag.
- **Dataset toggle**: Streams the dataset inline by invoking
  `--fine-tune-dataset -`, allowing the API to return both report text/JSON and
  the training payload.

## Admin access

The Dynamic CLI/CD workbench is restricted to admin operators. Authenticate via
the Telegram admin gate to mint a session token; the client forwards this token
to `/api/dynamic-cli` using the `x-admin-token` header (or, when necessary,
`x-telegram-init-data`), and the API validates it against `ADMIN_API_SECRET`
before executing the Python CLI. If the token expires you will see an "Admin
session required" prompt—refresh the admin control room to generate a new token.

## Next.js API bridge

`POST /api/dynamic-cli` executes `python -m dynamic_framework`, passes scenario
JSON via STDIN, and normalises the output into a JSON response:

```json
{
  "report": "…", // Text or JSON depending on --format
  "reportFormat": "text", // "text", "json", or "fine-tune"
  "dataset": { "…": "…" } // Present when dataset export is enabled
}
```

CLI exit codes propagate as HTTP statuses (exit code `2` → HTTP 400, other
non-zero codes → HTTP 500) with stderr returned as the `error` field.

## Environment variables

| Variable             | Default   | Description                                                                                                                                                          |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DYNAMIC_CLI_PYTHON` | `python3` | Optional path to the Python interpreter that exposes the `dynamic_framework` module. Set this if `python3` is not on your PATH or a virtual environment is required. |

Ensure the Python environment includes the repository (`pip install -e .`) so
that `python -m dynamic_framework` succeeds. The API route inherits the current
process environment, so activating a virtual environment before starting the
Next.js dev server is sufficient.

## Local development checklist

1. Activate the Python environment (e.g. `source .venv/bin/activate`).
2. Optionally export `DYNAMIC_CLI_PYTHON` if the interpreter is not `python3`.
3. Run `npm run dev` and navigate to `http://localhost:3000/tools/dynamic-cli`.
4. Submit the default scenario to verify the CLI report and dataset preview.

## Troubleshooting

- **"command not found" errors**: Confirm the configured `DYNAMIC_CLI_PYTHON`
  path exists and that the interpreter has the `dynamic_framework` package
  installed (`pip show dynamic-framework`). Restart the Next.js server after
  adjusting the environment so the API route inherits the new PATH.
- **Permission denied when spawning Python**: On Unix systems, ensure the
  interpreter binary is executable (`chmod +x`) and that the repository is not
  mounted with `noexec`. Running the dev server from within the activated
  virtual environment avoids this restriction.
- **Unexpected CLI exit codes**: Use the API response `error` field to inspect
  stderr output, then validate the scenario JSON with the schema documented in
  `docs/DYNAMIC_CLI_MANUAL.md`.
