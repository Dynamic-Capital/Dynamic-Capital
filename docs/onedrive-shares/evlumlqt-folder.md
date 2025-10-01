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
  parameter documented above. A successful run on 2025-09-29 at 18:53 UTC
  produced the following response headers:

  ```bash
  curl -I "${ONEDRIVE_SHARE_LINK}"
  ```

  ```text
  HTTP/1.1 200 OK
  date: Mon, 29 Sep 2025 18:53:10 GMT
  server: envoy

  HTTP/1.1 301 Moved Permanently
  content-length: 0
  location: https://onedrive.live.com/redir?cid=2ff0428a2f57c7a4&resid=2FF0428A2F57C7A4!sba30eef2b4934f54a514ba388596be2a&ithint=folder&migratedtospo=true&redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0V2THVNTHFUdEZSUHBSUzZPSVdXdmlvQmNGQUpkREFYSFpxTjhiWXkzSlV5eWc
  x-msedge-ref: Ref A: AB6B92E3B34F4362B76717E987D436CD Ref B: DM2AA1091214009 Ref C: 2025-09-29T18:53:10Z
  ```

- Following the redirect anonymously now returns an HTML error page with the
  message "The request is blocked." (HTTP 403) from `onedrive.live.com`. The
  first few lines currently look like:

  ```html
  <!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'><html xmlns='http://www.w3.org/1999/xhtml'><head>...
  <h2>The request is blocked.</h2>
  <span>Ref A: 20627BAA206842EF9D9CA0FC5C0BAEC9 Ref B: DM2EDGE0508 Ref C: 2025-09-29T18:53:15Z</span>
  ```

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
curl -I "${ONEDRIVE_SHARE_LINK}" | tee docs/onedrive-shares/evlumlqt-folder.headers.txt

curl -sSL "${ONEDRIVE_SHARE_LINK}" | tee docs/onedrive-shares/evlumlqt-folder.403.html | head
```

As of 2025-09-29 the second command returns the HTML error stub with the visible
banner `The request is blocked.` along with rotating `Ref A`, `Ref B`, and
`Ref C` identifiers from Microsoft Edge. Save the output for future comparisons
when re-testing access.

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

## `knowledge_base/` drop overview

- The share now contains a `knowledge_base/` directory with freshly uploaded
  training corpora. Sync the folder whenever new drops are announced so the
  repository and Supabase mirrors stay aligned.
- Use `tsx scripts/onedrive/list-drive-contents.ts` with the share link above to
  enumerate the hierarchy. Expect markdown, CSV, and JSON artefacts sized for
  retrieval-augmented model runs.
- After each sync, rerun
  `tsx scripts/onedrive/dump-drive-item.ts "<share>" docs/onedrive-shares/evlumlqt-folder.metadata.json`
  to capture the updated manifest and commit the diff.
- Mirror the downloaded files into `data/knowledge_base/` locally and document
  provenance in `data/knowledge_base/README.md`. This keeps experiment tracking
  consistent across GitHub, Supabase Storage, and the OneDrive source.
