# Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ Share

This note records the metadata helpers for the newly provided OneDrive folder
that contains the reference **books** mirrored under
`knowledge_base\\books`. Mirror the information here into any runbooks or
scripts that need to access the remote resources.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ?e=PDXXJk
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VrcWJhcmxwdjdoTGp5Yjl0Z1BkTXFjQlpweG9uQjE4SzdSSGpwMklWNm9mbVE`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!sb96a9b4abf694bb88f26fdb603dd32a7`

## Access notes

- A simple `curl -I` against the share returns a redirect that exposes the
  `resid` parameter shown above. Keep this handy when wiring the share into
  Microsoft Graph calls or S3 wrapper manifests. The redirect looks like:

  ```bash
  curl -I "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ"
  ```

  ```text
  HTTP/1.1 302 Found
  Location: https://onedrive.live.com/redir?resid=2FF0428A2F57C7A4!sb96a9b4abf694bb88f26fdb603dd32a7&authkey=!AJAc...&cid=2FF0428A2F57C7A4
  ```

- Following the redirect anonymously currently returns "The request is blocked"
  (HTTP 403) from `onedrive.live.com`. Authenticate with a Microsoft account or
  use an app-only token to enumerate the folder contents.

## Fetching metadata

1. Export a Microsoft Graph access token that can read the shared folder:

   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   ```

2. Request the manifest entry with the repository helper:

   ```bash
   tsx scripts/onedrive/fetch-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ"
   ```

3. Persist the metadata (including child items) for downstream automation or
   auditing:

   ```bash
   tsx scripts/onedrive/dump-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ekqbarlpv7hLjyb9tgPdMqcBZpxonB18K7RHjp2IV6ofmQ" \
     docs/onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.metadata.json
   ```

   Pass `false` as the optional third argument if you do **not** need the
   `expand=children` query.

4. Alternatively, query Microsoft Graph directly:

   ```bash
   curl \
     --header "Authorization: Bearer ${ONEDRIVE_ACCESS_TOKEN}" \
     --header "Accept: application/json" \
     "https://graph.microsoft.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VrcWJhcmxwdjdoTGp5Yjl0Z1BkTXFjQlpweG9uQjE4SzdSSGpwMklWNm9mbVE/driveItem?expand=children"
   ```

The Graph response will include the item metadata and any child PDF files once
valid credentials are supplied. Snapshot the payload in
`docs/onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.metadata.json`
to keep the repository's knowledge base aligned with the external share.
