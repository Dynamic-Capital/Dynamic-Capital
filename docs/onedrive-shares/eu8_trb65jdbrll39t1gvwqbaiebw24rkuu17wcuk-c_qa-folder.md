# Eu8_tRb65JdBrLL39T1GVwQBaieBW24rkUU17Wcuk-C_QA Share

This folder hosts the external **datasets** mirrored from
`OneDrive\\DynamicAI_D\\Bdatasets` that the trading agent reviews. The notes below
capture the identifiers needed for Microsoft Graph workflows and repository
scripts that sync the folder metadata.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/Eu8_tRb65JdBrLL39T1GVwQBaieBW24rkUU17Wcuk-C_QA?e=d9WTwY
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0V1OF90UmI2NUpkQnJMTDM5VDFHVndRQmFpZUJXMjRya1VVMTdXY3VrLUNfUUE`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!s16b53fefe4fa4197acb2f7f53d465704`

## Access notes

- A `curl -I` request exposes the redirect that includes the `resid` and `cid`
  values required for Microsoft Graph calls:

  ```bash
  curl -I "https://1drv.ms/f/c/2ff0428a2f57c7a4/Eu8_tRb65JdBrLL39T1GVwQBaieBW24rkUU17Wcuk-C_QA"
  ```

- The redirect currently responds with HTTP 403 when followed anonymously.
  Authenticate with a Microsoft account or app-only token before enumerating
  child items.

## Fetching metadata

1. Export a Microsoft Graph access token that can read the shared folder:

   ```bash
   export ONEDRIVE_ACCESS_TOKEN="<token>"
   ```

2. Request the manifest entry with the repository helper:

   ```bash
   tsx scripts/onedrive/fetch-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/Eu8_tRb65JdBrLL39T1GVwQBaieBW24rkUU17Wcuk-C_QA"
   ```

3. Persist the metadata (including child items) for downstream automation or
   auditing:

   ```bash
   tsx scripts/onedrive/dump-drive-item.ts \
     "https://1drv.ms/f/c/2ff0428a2f57c7a4/Eu8_tRb65JdBrLL39T1GVwQBaieBW24rkUU17Wcuk-C_QA" \
     docs/onedrive-shares/eu8_trb65jdbrll39t1gvwqbaiebw24rkuu17wcuk-c_qa-folder.metadata.json
   ```

   Pass `false` as the optional third argument if you do **not** need the
   `expand=children` query.

4. Alternatively, query Microsoft Graph directly:

   ```bash
   curl \
     --header "Authorization: Bearer ${ONEDRIVE_ACCESS_TOKEN}" \
     --header "Accept: application/json" \
     "https://graph.microsoft.com/v1.0/shares/u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0V1OF90UmI2NUpkQnJMTDM5VDFHVndRQmFpZUJXMjRya1VVMTdXY3VrLUNfUUE/driveItem?expand=children"
   ```

The Graph response returns folder metadata and dataset files when the token is
valid. Snapshot the payload in
`docs/onedrive-shares/eu8_trb65jdbrll39t1gvwqbaiebw24rkuu17wcuk-c_qa-folder.metadata.json`
so the repository can track changes to the external share.
