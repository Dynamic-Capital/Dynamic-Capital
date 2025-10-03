# EpBJVZO1-P1Llt5krgOjIsEB2gmb94Px6nI1vpqHPKtRFA Share

This note tracks the helper commands for the new OneDrive share linked above.
Use it to capture the latest headers, diagnose access issues, and drive the
corpus extraction workflow once Microsoft Graph authentication is available.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/EpBJVZO1-P1Llt5krgOjIsEB2gmb94Px6nI1vpqHPKtRFA?e=dTC5C1
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VwQkpWWk8xLVAxTGx0NWtyZ09qSXNFQjJnbWI5NFB4Nm5JMXZwcUhQS3RSRkE_ZT1kVEM1QzE`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!s93554990f8b54bfd96de64ae03a322c1`

Export the share link so that it is easy to reuse across commands:

```bash
export ONEDRIVE_SHARE_LINK="https://1drv.ms/f/c/2ff0428a2f57c7a4/EpBJVZO1-P1Llt5krgOjIsEB2gmb94Px6nI1vpqHPKtRFA?e=dTC5C1"
```

## Access notes

- `curl -I` confirms the redirect chain and exposes the `resid` value shown
  above. As of 2025-10-02 at 04:35 UTC the command returned a 301 redirect that
  points to the long `onedrive.live.com/redir` URL:

  ```bash
  curl -I "${ONEDRIVE_SHARE_LINK}"
  ```

- Following the redirect anonymously still yields the HTML stub with the message
  `The request is blocked.` from `onedrive.live.com`. Capture the output
  whenever you retry the command to watch for changes in the Edge `Ref`
  telemetry or HTTP status:

  ```bash
  curl -sSL "${ONEDRIVE_SHARE_LINK}" | head
  ```

Authentication with a Microsoft account or an app-only Microsoft Graph token is
required to enumerate the folder contents. Use the helper scripts in
`scripts/onedrive/` after exporting a valid access token.

## Smoke test

Keep the following reference outputs up to date:

```bash
curl -I "${ONEDRIVE_SHARE_LINK}" \
  | tee docs/onedrive-shares/epbjvzo1-p1llt5krgojiseb2gmb94px6ni1vpqhpktrfa-folder.headers.txt

curl -sSL "${ONEDRIVE_SHARE_LINK}" \
  | tee docs/onedrive-shares/epbjvzo1-p1llt5krgojiseb2gmb94px6ni1vpqhpktrfa-folder.403.html | head
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
     docs/onedrive-shares/epbjvzo1-p1llt5krgojiseb2gmb94px6ni1vpqhpktrfa-folder.metadata.json
   ```

4. Alternatively, query Microsoft Graph directly by reusing the computed share
   identifier:

   ```bash
   export ONEDRIVE_SHARE_ID="u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VwQkpWWk8xLVAxTGx0NWtyZ09qSXNFQjJnbWI5NFB4Nm5JMXZwcUhQS3RSRkE_ZT1kVEM1QzE"
   ```

   ```bash
   curl \
     --header "Authorization: Bearer ${ONEDRIVE_ACCESS_TOKEN}" \
     --header "Accept: application/json" \
     "https://graph.microsoft.com/v1.0/shares/${ONEDRIVE_SHARE_ID}/driveItem?expand=children"
   ```

## Corpus extraction workflow

Once the metadata dump is available (and authentication works), run the Python
helper to pull text-friendly files into a JSONL corpus:

```bash
python tools/onedrive_corpus_extractor.py \
  "${ONEDRIVE_SHARE_LINK}" \
  --output data/knowledge_base/epbjvzo1-p1llt5krgojiseb2gmb94px6ni1vpqhpktrfa.jsonl \
  --summary data/knowledge_base/epbjvzo1-p1llt5krgojiseb2gmb94px6ni1vpqhpktrfa.summary.json \
  --source epbjvzo1-share
```

The extractor honours the global limit passed by the corpus engine. Adjust the
`--limit`, `--max-file-size`, and tagging flags as needed when working through
large drops.

## Knowledge base sync checklist

- Mirror the authenticated download into `data/knowledge_base/` once the folder
  contents are enumerated.
- Document any new artefacts in `data/knowledge_base/README.md` and extend the
  dataset registry or manifests under `data/knowledge_base/research/` as
  appropriate.
- After syncing, re-run the extractor so that the JSONL corpus and summary stay
  aligned with the mirrored files.

## Unauthenticated API probes (2025-10-02)

Anonymous access is still blocked, but the OneDrive web client now exposes a
couple of useful endpoints worth capturing:

- The landing page loads when requesting the long URL directly with a modern
  browser user agent, e.g.:

  ```bash
  curl \
    --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36" \
    "https://onedrive.live.com/?cid=${CID}&id=${RESID}&authkey=${AUTHKEY}" \
    --output /tmp/epbjvzo1-landing.html
  ```

- The frontend subsequently posts to the legacy API with an `authKey`. The
  request fails with a `userContentMigrated` response, but the `Location` header
  documents the current personal-content domain:

  ```bash
  curl \
    --header "Content-Type: multipart/form-data; boundary=probe" \
    --data-binary $'--probe\r\nContent-Disposition: form-data;name=data\r\nX-HTTP-Method-Override: GET\r\nContent-Type: application/json\r\nApplication: ODC Web\r\nPrefer: Migration=EnableRedirect;FailOnMigratedFiles\r\nscenario: BrowseFiles\r\nscenarioType: AUO\r\n\r\n--probe--' \
    "https://api.onedrive.com/v1.0/drives/${CID}/items/${RESID}/children?authKey=${AUTHKEY}&$top=100"
  ```

- Following the redirect to `https://my.microsoftpersonalcontent.com/` without
  valid Microsoft credentials yields `401 Unauthenticated`. Capture the exact
  headers whenever authentication access is available.

These probes confirm that the share has been migrated to the personal content
service; once a valid token is available the same payload should enumerate the
folder without switching code paths.
