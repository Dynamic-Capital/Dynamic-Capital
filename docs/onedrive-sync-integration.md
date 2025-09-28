# OneDrive Sync Integration Playbook

Codex developers can pull Microsoft OneDrive assets into the Dynamic Capital
workflow without disrupting existing GitHub or Supabase processes. Use the
guidance below to decide which integration path fits your scenario and to
configure the plumbing safely.

## 1. GitHub + OneDrive Sync

Use the desktop OneDrive client (or `onedrive` CLI on Linux) to mirror shared
folders into your local workspace and commit the relevant artifacts into this
monorepo.

1. **Sync to disk**
   - Sign in to the OneDrive desktop client with the account that owns or has
     access to the shared folders.
   - Choose a local sync directory such as `~/OneDrive/DynamicCapital`.
   - Confirm selective sync includes the folders that contain source files,
     prompts, or datasets you plan to version control.
2. **Bridge into Git**
   - Add the synced directory as a subdirectory of your local clone (for
     example, symlink or move the synced folder under
     `Dynamic-Capital/content/onedrive`).
   - Use `.gitignore` to exclude transient OneDrive metadata files (`*.tmp`,
     `~$`, `*.lnk`) before staging changes.
   - Stage and commit the synced files like normal, then push to GitHub. Codex
     agents will consume them automatically through the repository checkout.
3. **Automate updates (optional)**
   - Schedule a local script (cron, launchd, or Task Scheduler) that runs
     `onedrive --synchronize` before `git pull` to keep the Git working tree
     fresh.
   - When multiple collaborators edit the same OneDrive-backed files, coordinate
     merges through Pull Requests to avoid stomping OneDrive deltas.

## 2. Supabase + OneDrive Adapter

For server-side flows, connect Supabase edge functions to OneDrive using the
Microsoft Graph API. This allows Codex automations to read or write documents
on-demand without manual sync steps. The repository now ships a reusable
adapter:

- Edge function implementation: `supabase/functions/onedrive-proxy/index.ts`
- TypeScript helper: `apps/web/integrations/onedrive/index.ts`

### 2.1 Register the Azure AD application

1. Create an Azure AD app registration with delegated or application permissions
   for `Files.ReadWrite.All` (or the minimum scope you need).
2. Generate a client secret and capture the tenant ID, client ID, and secret in
   your vault of choice.

### 2.2 Configure environment variables

Populate the shared `.env` template or Supabase project secrets with the
following keys:

```env
ONEDRIVE_TENANT_ID="<tenant-guid>"
ONEDRIVE_CLIENT_ID="<app-client-id>"
ONEDRIVE_CLIENT_SECRET="<client-secret>"
ONEDRIVE_SCOPE="https://graph.microsoft.com/.default" # optional override
ONEDRIVE_DEFAULT_DRIVE_ID="<drive-id>"                # optional default
```

The edge function uses these values to request tokens and fall back to the
default drive when an invocation does not provide one explicitly.

### 2.3 Call the edge function

The `onedrive-proxy` function exchanges the client credentials for a Graph
token, caches it briefly, and executes scoped operations (`list`, `get`,
`download`, and `upload`). Responses are normalised to the `OneDriveDriveItem`
shape.

Use the helper under `apps/web/integrations/onedrive` to keep Supabase
invocations type-safe:

```ts
import {
  getDriveItem,
  getDriveItemDownloadUrl,
  listDriveItems,
  uploadDriveItem,
} from "@/integrations/onedrive";

// List the contents of a knowledge folder
const { items } = await listDriveItems({ path: "knowledge" });

// Upload a UTF-8 document and retrieve its metadata
const metadata = await uploadDriveItem({
  path: "knowledge/new-note.md",
  content: "# Notes\nCodex automation update",
});

// Request a time-limited download URL
const { downloadUrl } = await getDriveItemDownloadUrl({ itemId: metadata.id });
```

Gate access to the helper behind existing auth flows (for example, server-only
Supabase clients or middleware) so only authorised automations can interact with
OneDrive.

### 2.4 Operational guardrails

- Rotate the client secret regularly and enforce least-privilege scopes.
- Log every read/write in Supabase (Postgres tables or Log Drains) to monitor
  usage and detect anomalies.
- Document allowed folders and naming conventions so Codex automations know
  where to place generated assets.

## 3. Troubleshooting Checklist

- **Authentication failures** – Re-run the OAuth client credential flow manually
  to confirm the Azure AD app still has valid permissions.
- **Sync conflicts** – Resolve merge conflicts locally and re-upload the cleaned
  result to OneDrive before committing to Git.
- **Rate limits** – Batch Graph API requests and implement exponential backoff
  inside edge functions. The `onedrive-proxy` helper centralises retries, so
  extend it rather than duplicating Graph access in multiple services.
- **File format mismatches** – Normalize encodings (UTF-8 for text, PNG/JPEG for
  images) so Git diffs and Codex previews behave predictably.

Keep this playbook updated as the OneDrive surface area expands—add new folders,
Supabase functions, or automation patterns as they launch.
