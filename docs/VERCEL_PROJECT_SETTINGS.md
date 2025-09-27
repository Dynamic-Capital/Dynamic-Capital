# Vercel Project Settings Reference

This repository deploys the Next.js application in `apps/web` via Vercel. Use
this reference to align the Project Settings UI with the values checked into the
repo and to understand when to rely on automatic detection versus manual
overrides.

## Quick Reference for Dynamic Capital

| Setting                              | Project-level value           | Where configured                                                       | Notes                                                                            |
| ------------------------------------ | ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Framework Preset                     | **Next.js**                   | Project Settings → General → Framework Preset                          | Vercel usually auto-detects; choose it manually if "Other" appears.              |
| Install Command                      | `npm install`                 | Project Settings → Build & Development Settings → Install Command      | Runs from the repo root to install workspace deps.                               |
| Build Command                        | `npm run build`               | Project Settings → Build & Development Settings → Build Command        | Builds the Next.js app and captures the landing snapshot for `_static/`.         |
| Output Directory                     | `apps/web/.next`              | Project Settings → Build & Development Settings → Output Directory     | Matches the checked-in `vercel.json` so the deployment serves the Next.js build. |
| Development Command                  | `npm run dev -- --port $PORT` | Project Settings → Build & Development Settings → Development Command  | For `vercel dev`; forwards Vercel's `$PORT` to the workspace script.             |
| Root Directory                       | `.` (repository root)         | Project Settings → General → Root Directory                            | Keep at the root so the build script can reach both workspaces.                  |
| Skip deployments for unchanged files | Enabled                       | Project Settings → General → Root Directory → Skip Unaffected Projects | Prevents rebuilding when commits ignore `apps/web`.                              |

## Framework Preset

- Vercel auto-detects frameworks such as Next.js, Svelte, and Nuxt during
  deployment and chooses a preset automatically.
- If no supported framework is detected, Vercel selects **Other** and enables
  the Build Command override so you can provide a custom build script.
- Dynamic Capital default: ensure the preset is set to **Next.js** so Vercel
  applies platform-optimized defaults (Edge Functions, routing, etc.).
- Override the framework for an individual deployment by adding a `framework`
  field to `vercel.json`.

## Build Command

- With a detected preset, Vercel derives the build command from the framework's
  `package.json` scripts. If no script is defined—such as a bare Next.js
  installation—Vercel runs `next build` by default.
- Dynamic Capital default: `npm run build` executes the orchestrated build that
  compiles the Next.js app and then exports the landing snapshot for CDN
  hosting.
- Enable the Override toggle in Project Settings to supply a custom command for
  all deployments, or set `buildCommand` inside `vercel.json` to override a
  single deployment.
- Any changes to overrides take effect on the next deployment.

## Output Directory

- Framework presets automatically point to the directory whose contents are
  served statically after the build completes.
- Dynamic Capital default: serve the Next.js output produced in
  `apps/web/.next`.
- For static-only sites, choose **Other** to serve the `public/` folder (when
  present) or the repository root. You can also enable the override and leave
  the directory blank to skip the build entirely.
- Override the output directory per deployment with the `outputDirectory` field
  in `vercel.json`.

## Install Command

- During the build step, Vercel installs dependencies declared in `package.json`
  (including `devDependencies`) with the detected package manager.
- Dynamic Capital default: keep the install command at `npm install` so all
  workspace dependencies are available before the monorepo build runs.
- Manage install behavior at the project level via the Override toggle, or per
  deployment with `vercel.json`.
- Review Vercel's package manager support to confirm your preferred toolchain is
  available.

### Corepack Support

- Set the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1` to activate
  Corepack in Vercel builds.
- Pin a package manager version by adding a `packageManager` property to
  `package.json` (for example `"pnpm@7.5.1"`). Keep the pinned version in sync
  with your lockfile to avoid install mismatches.
- Corepack is experimental in Node.js, so future breaking changes are possible.

### Install Command for Vercel Functions

- The global project Install Command applies to front-end frameworks that
  include API routes.
- Vercel functions located in the native `api` directory use language-specific
  install commands that cannot be customized.

## Development Command

- `vercel dev` uses the framework's default development command unless you
  enable Override and supply your own.
- Dynamic Capital default: run `npm run dev -- --port $PORT` so the command
  forwards the port provided by Vercel to the Next.js dev server.
- Custom commands must accept the `$PORT` variable (for example
  `next dev --port $PORT`). If you omit it, `vercel dev` fails to start because
  the server binds the wrong port.
- Selecting the **Other** preset leaves the development command empty;
  `vercel dev` will fail unless you provide one.
- Ensure your local project is linked to Vercel and that at least one deployment
  exists before running `vercel dev`.
- Override the development command per deployment with the `devCommand` property
  in `vercel.json`.

## Skip Build Step

- For static projects consisting only of HTML, CSS, and vanilla JS, choose
  **Other**, enable the Build Command override, and leave the command empty to
  bypass the build phase.
- Vercel will then serve the project files directly from the configured output
  directory.

## Root Directory

- Some repositories contain multiple apps; set the Root Directory to the folder
  that houses the app you want Vercel to build.
- Files outside the root are inaccessible at build time, and `vercel` CLI
  commands assume the configured root, removing the need to pass it explicitly.
- Dynamic Capital default: keep the root at the repository base so build scripts
  can coordinate tasks across the `apps/` workspace.
- Updates to the root directory apply on the next deployment.

## Skip Unaffected Projects in Monorepos

- When using a monorepo, enable **Skip deployment** under Root Directory to
  ignore projects untouched by a commit.
- This optimization prevents unnecessary deployments for unaffected packages and
  is recommended for Dynamic Capital to avoid rebuilding when changes only touch
  backend or tooling directories.

## Example `vercel.json`

The repository ships with a `vercel.json` that mirrors the recommended settings:

```json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "apps/web/.next",
  "devCommand": "npm run dev -- --port $PORT"
}
```

Adjust the project-level settings or this file in tandem so the dashboard and
the checked-in configuration remain aligned.
