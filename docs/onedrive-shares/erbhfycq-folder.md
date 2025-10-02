# ErBhFYCqf15AhFwIGWHjLfYB1sze-98g08jNtOzu0A3wKQ Share

This note captures the helper commands for the new OneDrive share that hosts the
latest knowledge base dataset drop.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/ErBHFYCqf15AhFwIGWHjLfYB1sze-98g08jNtOzu0A3wKQ?e=WdUfh0
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VyQkhGWUNxZjE1QWhGd0lHV0hqTGZZQjFzemUtOThnMDhqTnRPenUwQTN3S1E_ZT1XZFVmaDA`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!s801547b07faa405e845c081961e32df6`

Export an environment variable for the share URL so you can reuse it across
commands:

```bash
export ONEDRIVE_SHARE_LINK="https://1drv.ms/f/c/2ff0428a2f57c7a4/ErBHFYCqf15AhFwIGWHjLfYB1sze-98g08jNtOzu0A3wKQ?e=WdUfh0"
```

## Access notes

- A quick `curl -I` confirms the redirect chain and exposes the `resid` value
  shown above. As of 2025-10-02 at 00:37 UTC the command returned a 301 redirect
  that points at the long `onedrive.live.com/redir` URL:

  ```bash
  curl -I "${ONEDRIVE_SHARE_LINK}"
  ```

- Following the redirect anonymously still yields the HTML stub with the message
  `The request is blocked.` from `onedrive.live.com`. Capture the output when
  you re-run the command to watch for changes in the Edge `Ref` values or HTTP
  status:

  ```bash
  curl -sSL "${ONEDRIVE_SHARE_LINK}" | head
  ```

Authentication with a Microsoft account or an app-only Microsoft Graph token is
required to enumerate the folder contents. Use the helper scripts in
`scripts/onedrive/` after exporting a valid access token.

## Smoke test

Keep the following reference outputs up to date:

```bash
curl -I "${ONEDRIVE_SHARE_LINK}" | tee docs/onedrive-shares/erbhfycq-folder.headers.txt

curl -sSL "${ONEDRIVE_SHARE_LINK}" | tee docs/onedrive-shares/erbhfycq-folder.403.html | head
```

The committed `*.headers.txt` and `.403.html` files snapshot the current
behaviour (still blocked without authentication).

## Fetching metadata

1. Export a Microsoft Graph access token with permission to read the shared
   item:

   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   ```

2. Request the manifest payload with the repository helper:

   ```bash
   tsx scripts/onedrive/fetch-drive-item.ts "${ONEDRIVE_SHARE_LINK}"
   ```

3. Persist the metadata (including the child listing) to disk:

   ```bash
   tsx scripts/onedrive/dump-drive-item.ts \
     "${ONEDRIVE_SHARE_LINK}" \
     docs/onedrive-shares/erbhfycq-folder.metadata.json
   ```

   Pass `false` as the optional third argument if you only need the root item
   metadata without `expand=children`.

4. Alternatively, query Microsoft Graph directly by reusing the computed share
   identifier:

   ```bash
   export ONEDRIVE_SHARE_ID="u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VyQkhGWUNxZjE1QWhGd0lHV0hqTGZZQjFzemUtOThnMDhqTnRPenUwQTN3S1E_ZT1XZFVmaDA"
   ```

   ```bash
   curl \
     --header "Authorization: Bearer ${ONEDRIVE_ACCESS_TOKEN}" \
     --header "Accept: application/json" \
     "https://graph.microsoft.com/v1.0/shares/${ONEDRIVE_SHARE_ID}/driveItem?expand=children"
   ```

## Knowledge base sync checklist

- Mirror the authenticated download into `data/knowledge_base/` once the folder
  contents are enumerated.
- Document the new artefacts in `data/knowledge_base/README.md` and extend the
  dataset registry or manifests under `data/knowledge_base/research/` as
  appropriate.
- After syncing, rerun
  `tsx scripts/onedrive/dump-drive-item.ts "${ONEDRIVE_SHARE_LINK}" docs/onedrive-shares/erbhfycq-folder.metadata.json`
  to snapshot the updated manifest alongside the previous drops.
