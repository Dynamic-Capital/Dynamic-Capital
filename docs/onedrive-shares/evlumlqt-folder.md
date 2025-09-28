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
remote folder. The share currently requires an authenticated access token;
anonymous requests return `InvalidAuthenticationToken`.

## Fetching metadata

1. Export a Microsoft Graph access token with permissions to read the shared
   item:

   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   ```

2. Request the manifest entry with the repository helper:

   ```bash
   tsx scripts/onedrive/fetch-drive-item.ts "https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg"
   ```

3. Persist the metadata (including the child listing) to disk for later
   inspection:

   ```bash
   tsx scripts/onedrive/dump-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/EvLuMLqTtFRPpRS6OIWWvioBcFAJdDAXHZqN8bYy3JUyyg" \
     docs/onedrive-shares/evlumlqt-folder.metadata.json
   ```

   Pass `false` as the optional third argument to skip the `expand=children`
   query parameter if you only need the root item metadata.

4. Alternatively, query Microsoft Graph directly:

   ```bash
   curl \
     --header "Authorization: Bearer ${ONEDRIVE_ACCESS_TOKEN}" \
     --header "Accept: application/json" \
     "https://graph.microsoft.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0V2THVNTHFUdEZSUHBSUzZPSVdXdmlvQmNGQUpkREFYSFpxTjhiWXkzSlV5eWc/driveItem?expand=children"
   ```

The response payload includes the item metadata and, when available, the
children of the shared folder. Save the output to
`docs/onedrive-shares/evlumlqt-folder.metadata.json` to snapshot the latest
state.
