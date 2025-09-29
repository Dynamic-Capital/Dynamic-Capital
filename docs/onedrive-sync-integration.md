# OneDrive Sync Integration Playbook

Codex developers can pull Microsoft OneDrive assets into the Dynamic Capital
workflow without disrupting existing GitHub or Supabase processes. Use the
guidance below to decide which integration path fits your scenario and to
configure the plumbing safely.

## 1. Manual GitHub ⇄ OneDrive Handoff

Local syncing is still the fastest way to pull OneDrive assets into the
repository when you are iterating on prompts, datasets, or reference documents.

1. **Sync to disk**
   - Sign in to the OneDrive desktop client (or the open-source `onedrive` CLI
     on Linux) with an account that can access the shared workspace.
   - Choose a local sync directory such as `~/OneDrive/DynamicCapital` and
     enable selective sync for the folders you plan to track in Git.
2. **Bridge into Git**
   - Add or symlink the synced directory into your local clone—for example,
     `Dynamic-Capital/content/onedrive`.
   - Extend `.gitignore` to filter transient OneDrive artefacts (`*.tmp`, `~$`,
     `*.lnk`) before you stage files.
   - Commit the curated files and push them to GitHub so other agents receive
     the updates through normal repository checkouts.
3. **Schedule refreshes (optional)**
   - Use cron, launchd, or Task Scheduler to run `onedrive --synchronize`
     shortly before `git pull`. This keeps the local mirror and repository in
     step.
   - Coordinate merges with pull requests when multiple collaborators touch the
     same files to prevent OneDrive conflict copies.

## 2. Automation Design Considerations

When you move beyond manual syncs, decide early how credentials, rate limits,
and audit trails will be handled. Use the checklist below before locking in a
tooling choice:

- **Identity** – Prefer service principals or app passwords scoped to the
  minimum set of folders. Avoid personal accounts for long-lived automations.
- **Secrets management** – Store tokens in your vault or CI secret store rather
  than committing configuration files such as `rclone.conf`.
- **Change control** – Document which branch triggers uploads and who approves
  access to new folders so governance is clear.
- **Observability** – Emit logs or notifications when uploads succeed or fail to
  keep stakeholders in the loop.

## 3. Troubleshooting Checklist

- **Authentication failures** – Re-run the OAuth client credential flow (or
  refresh tokens for the desktop client) to confirm the account still has valid
  permissions.
- **Sync conflicts** – Resolve merge conflicts locally, then re-upload the
  cleaned result to OneDrive before committing to Git.
- **Rate limits** – Batch Microsoft Graph requests and implement exponential
  backoff if your automation triggers errors such as `HTTP 429`.
- **File format mismatches** – Normalise encodings (UTF-8 for text, PNG/JPEG for
  images) so Git diffs and previews remain readable.

Keep this playbook updated as new OneDrive surfaces or automation patterns go
live.

## 4. Automation Tooling Cheat Sheet

Accelerate GitHub ⇄ OneDrive workflows with the automation options below. Mix
and match them with the manual baseline described above.

### 4.1 rclone (CLI)

Use `rclone` when you need deterministic, scriptable syncs between build
artefacts and OneDrive.

1. **Configure the remote**
   - Install `rclone` on the runner or workstation that already has access to
     the repository checkout.
   - Run `rclone config` → `n` (new remote) → `onedrive` and authenticate with
     Graph scopes such as `Files.ReadWrite`.
2. **Author the sync script**
   - Example:
     `rclone sync ./build onedrive:DynamicCapital/build --create-empty-src-dirs`.
   - Store credentials in the shared vault; never commit `rclone.conf`.
   - Wrap the sync in retry logic and log summaries to `stdout` for CI
     telemetry.
3. **Schedule execution**
   - Add a GitHub Actions workflow step or a cron job on a self-hosted runner to
     run the script after successful builds.
   - Gate the sync on branch filters (for example, only `main` or tagged
     releases) to avoid pushing unstable artefacts to shared folders.

### 4.2 Zapier / Make.com (No-code)

Zapier and Make.com provide low-code automation for teams that prefer visual
builders over scripts.

1. **Trigger on GitHub**
   - Use the “New Commit” (Zapier) or “Watch Repository” (Make.com) triggers to
     receive payloads whenever a monitored branch updates.
   - Scope the trigger to the directory that contains OneDrive-bound assets to
     reduce noise.
2. **Transform the payload**
   - Parse the commit files array and filter for extensions that should land in
     OneDrive (for example, `.md`, `.csv`).
   - Optionally call a lightweight webhook (Supabase edge function, serverless
     worker, etc.) to enrich metadata before upload.
3. **Upload to OneDrive**
   - Use the native OneDrive/SharePoint actions to create or update files in the
     target folder hierarchy.
   - Enable path-building helpers so folders are created automatically the first
     time a new artefact appears.

### 4.3 Microsoft Power Automate

Power Automate offers the tightest integration with OneDrive for Business and is
ideal when the automation must live entirely within the Microsoft 365 estate.

1. **Create an automated flow**
   - Start with the “When a HTTP request is received” or “When a file is
     created” trigger. Pair it with a GitHub webhook that posts commit metadata
     or a scheduled `rclone` job that drops files into a staging folder.
2. **Implement governance**
   - Add condition steps that enforce repository branch checks, file type
     policies, or mandatory approvals via Microsoft Teams adaptive cards.
   - Log audit trails to Dataverse or SharePoint lists for compliance review.
3. **Deliver the payload**
   - Use the “Create file” or “Update file” actions to push changes into the
     appropriate OneDrive directory.
   - Configure notifications or adaptive card updates so stakeholders know when
     fresh builds arrive.

Document the chosen automation approach in project runbooks to keep Codex
contributors aligned on how OneDrive mirrors stay current.
