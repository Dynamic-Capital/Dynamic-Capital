# Ton Console Installation Guide

Ton Console provides a dashboard for managing Dynamic Capital's TON dApps,
Jettons, and payment automations. This guide explains how to bootstrap the
open-source Ton Console workspace locally so engineers can audit integrations,
extend analytics, or test new partner features.

## Prerequisites

Before installing Ton Console ensure the following tools are available:

- **Git 2.39+** — required for cloning and updating the upstream repository.
- **Node.js 20+** — matches the Ton Console runtime expectations and aligns with
  the monorepo engines.
- **npm, pnpm, or Yarn** — choose the package manager you prefer (defaults to
  npm when unspecified).
- **Access to the Ton Console web account** — needed to authenticate once the
  local UI is running.

> Tip: run `node -v`, `npm -v`, and `git --version` to confirm the binaries
> exist on your PATH before proceeding.

## Quick install script

The repository ships with a helper that clones the official
[tonkeeper/ton-console](https://github.com/tonkeeper/ton-console) project,
installs dependencies, and prepares a development `.env.local` file.

```bash
node scripts/tonconsole/install.mjs
```

The script accepts optional flags:

| Flag                  | Purpose                                                                         | Default                |
| --------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| `--dir=<path>`        | Install to a custom directory relative to the repository root.                  | `external/ton-console` |
| `--branch=<ref>`      | Checkout a specific branch or tag from the upstream repository.                 | `master`               |
| `--skip-install=true` | Skip the package installation step (useful when auditing without Node tooling). | `false`                |

Environment variables can override behaviour:

- `TON_CONSOLE_DIR` — sets the default installation directory without repeating
  `--dir`.
- `TON_CONSOLE_BRANCH` — pins the branch checked out by default.
- `TON_CONSOLE_PM` — forces the package manager (`npm`, `pnpm`, or `yarn`).

The installer is idempotent. If the target directory already exists the script
fetches the latest changes and fast-forwards to the requested branch before
running dependency installation. When a `.env.local` file is missing it is
created from `.env.development` so the UI boots with sensible defaults.

### Verifying the install

After the script prints `Ton Console workspace ready`, start the UI:

```bash
cd external/ton-console
npm run dev
```

(Replace `npm run dev` with `pnpm run dev` or `yarn dev` if you selected another
package manager.) Navigate to `http://localhost:5173` and sign in with your Ton
Console credentials. Confirm that project dashboards load and the Ton API
integrations succeed before shipping dependent changes.

## Manual installation fallback

If the scripted installer cannot be used:

1. Clone the repository manually:
   ```bash
   git clone https://github.com/tonkeeper/ton-console.git external/ton-console
   cd external/ton-console
   ```
2. Checkout the desired branch, e.g. `git checkout master`.
3. Install dependencies with your preferred package manager (`npm ci`,
   `pnpm install`, or `yarn install --immutable`).
4. Copy `.env.development` to `.env.local` and update credentials as required.
5. Run `npm run dev` (or the equivalent command) and authenticate in the
   browser.

Document any deviations (custom API endpoints, staging credentials, feature
flags) in the release notes so the automation scripts and runbooks remain
accurate.
