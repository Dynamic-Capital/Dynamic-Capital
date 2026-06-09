# Self-replication and Automated Releases

This guide explains how the project can now replicate itself into fresh
checkouts, produce release-ready build artifacts, and publish those artifacts
automatically whenever a new tag is pushed.

## Overview

The self-replication workflow has two cooperating pieces:

1. **`scripts/self-replication.ts`** – a Deno-based command-line utility that
   clones (or updates) the repository, installs dependencies, builds the
   workspace, optionally runs quality gates, and can package the result as a
   tarball. It also offers a "template" mode that strips Git metadata so that
   the output can serve as the foundation for a brand-new instance of Dynamic
   Capital.
2. **`self-replication.yml` GitHub Action** – an automated pipeline that
   executes on pushes to `main`, annotated tags (e.g. `v*`), or manual dispatch.
   It generates a clean tarball using the script above, uploads it as a workflow
   artifact, and automatically attaches the artifact to tagged releases.

Together they cover the three goals that were requested:

- **Automated CI/CD builds** – the workflow rebuilds the application and
  produces an artifact every time changes merge into `main`.
- **Bot-driven cloning** – the Deno script can be executed locally or in
  automation to clone or refresh downstream copies without manual intervention.
- **Templated scaffolding** – template mode removes Git history and optionally
  reinitialises a repository so teams can spin up new installations rapidly.

## Running the replication script locally

```bash
# Basic usage – clone origin, install deps, run the workspace build, and archive the output
deno run -A scripts/self-replication.ts --archive ./artifacts/dynamic-capital.tar.gz
```

Key flags:

- `--repo <url-or-path>` – source repository. Defaults to the local repo's
  `origin` remote.
- `--dest <path>` – destination directory for the replica. Defaults to
  `./replicas/dynamic-capital-<timestamp>`.
- `--branch <name>` – branch or tag to replicate.
- `--[no-]install` / `--[no-]build` – skip the dependency install or build steps
  if you simply want a working tree.
- `--lint`, `--typecheck`, `--test` – opt-in quality gates mirroring the main CI
  workflow.
- `--template` – remove `.git` from the destination to create a reusable
  scaffold. Combine with `--initGit` if you want a fresh repository initialised
  in-place.
- `--archive <path>` – output a compressed tarball of the replica (useful for
  promotions, backups, or distribution).
- `--update` – refresh an existing clone rather than recloning from scratch.
  Combine with `--force` to blow away the directory first.

The command prints a JSON summary at the end that captures the actions taken
(install, build, lint, etc.), the resolved commit hash, and the archive
location.

## GitHub Actions automation

The new workflow lives at `.github/workflows/self-replication.yml` and performs
the following steps:

1. Checks out the repository with full history so tags are available for release
   builds.
2. Installs Node.js 20 and runs the standard `npm ci` + `npm run build`
   commands.
3. Uses `denoland/setup-deno` to expose Deno 2.x and executes
   `scripts/self-replication.ts` in template mode to create a tarball.
4. Uploads the tarball as an artifact named `dynamic-capital-self-replica` for
   every run.
5. When the workflow is triggered by a tag (e.g. `v1.2.3`), a dependent job
   downloads the artifact and publishes it as a GitHub release asset
   automatically.

You can manually kick off the pipeline from the Actions tab using the **Run
workflow** button. The `workflow_dispatch` input lets you set a custom
branch/tag to replicate without creating a new commit.

## Integrating downstream

- **Automated environments** – Infrastructure scripts (Terraform, Ansible, etc.)
  can call the Deno utility to materialise the latest build artifacts on demand.
- **Custom forks** – Set up scheduled workflows in downstream repositories that
  invoke
  `scripts/self-replication.ts --repo https://github.com/dynamic-capital/dynamic-capital.git --update`
  to stay in sync with upstream.
- **Bootstrap new instances** – Run the script locally with
  `--template --initGit` to prepare a clean repository, then push it to a new
  remote.

These additions keep the project "self-replicating": every time new features or
fixes land, a fresh build and distributable bundle is available automatically,
while teams retain the option to script their own cloning and templating flows
using the shared utility.
