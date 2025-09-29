# EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg Share

This note captures the metadata helpers for the provided OneDrive share link.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0V2THVNTHFUdEZSUHBSUzZPSVdXdmlvQmNGQUpkREFYSFpxTjhiWXkzSlV5eWc`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!sba30eef2b4934f54a514ba388596be2a`

Use the identifier with Microsoft Graph or the OneDrive API to inspect the
remote folder. Export a helper variable for the share URL to avoid copying the
long string repeatedly:

```bash
export ONEDRIVE_SHARE_LINK="https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg"
```

## Access notes

- A basic `curl -I` confirms the redirect chain and exposes the `resid`
  parameter documented above:

  ```bash
  curl -I "${ONEDRIVE_SHARE_LINK}"
  ```

- Following the redirect anonymously now returns an HTML error page with the
  message "The request is blocked." (HTTP 403) from `onedrive.live.com`.
  Authenticate with a Microsoft account or use an app-only token before
  attempting to enumerate the folder contents. You can capture the final
  response (headers plus status) with:

  ```bash
  curl -sS -o /dev/null -D - -L "${ONEDRIVE_SHARE_LINK}"
  ```

## Smoke test

Run the share through both commands above to make sure the link still resolves
through OneDrive and that the anonymous access block remains in place:

```bash
curl -I "${ONEDRIVE_SHARE_LINK}"

curl -sSL "${ONEDRIVE_SHARE_LINK}" | head
```

As of 2025-09-29 the second command returns the HTML error stub with the
visible banner `The request is blocked.` along with rotating `Ref A`, `Ref B`,
and `Ref C` identifiers from Microsoft Edge. Save the output for future
comparisons when re-testing access.

## Fetching metadata

1. Export a Microsoft Graph access token with permissions to read the shared
   item:

   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   ```

2. Request the manifest entry with the repository helper:

   ```bash
   tsx scripts/onedrive/fetch-drive-item.ts "${ONEDRIVE_SHARE_LINK}"
   ```

3. Persist the metadata (including the child listing) to disk for later
   inspection:

   ```bash
   tsx scripts/onedrive/dump-drive-item.ts \
     "${ONEDRIVE_SHARE_LINK}" \
     docs/onedrive-shares/evlumlqt-folder.metadata.json
   ```

   Pass `false` as the optional third argument to skip the `expand=children`
   query parameter if you only need the root item metadata.

4. Alternatively, query Microsoft Graph directly:

   ```bash
   export ONEDRIVE_SHARE_ID="u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0V2THVNTHFUdEZSUHBSUzZPSVdXdmlvQmNGQUpkREFYSFpxTjhiWXkzSlV5eWc"
   ```

   ```bash
   curl \
     --header "Authorization: Bearer ${ONEDRIVE_ACCESS_TOKEN}" \
     --header "Accept: application/json" \
     "https://graph.microsoft.com/v1.0/shares/${ONEDRIVE_SHARE_ID}/driveItem?expand=children"
   ```

The response payload includes the item metadata and, when available, the
children of the shared folder. Save the output to
`docs/onedrive-shares/evlumlqt-folder.metadata.json` to snapshot the latest
state.
