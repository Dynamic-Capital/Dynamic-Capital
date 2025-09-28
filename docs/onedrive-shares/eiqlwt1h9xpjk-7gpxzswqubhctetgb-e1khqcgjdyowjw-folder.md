# EiQLwT1h9XpJk-7gPXzswQUBhCtETgb-e1khqcGjDYoWJw Share

This share contains supporting **documentation PDFs** for the trading agent. The
identifiers below make it easy to authenticate and mirror the folder in internal
tooling.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/EiQLwT1h9XpJk-7gPXzswQUBhCtETgb-e1khqcGjDYoWJw?e=9irW1n
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VpUUx3VDFoOVhwSmstN2dQWHpzd1FVQmhDdEVUZ2ItZTFraHFjR2pEWW9XSnc`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!s3dc10b24f561497a93eee03d7cecc105`

## Access notes

- Use `curl -I` to capture the redirect headers that reveal the `resid` value:

  ```bash
  curl -I "https://1drv.ms/f/c/2ff0428a2f57c7a4/EiQLwT1h9XpJk-7gPXzswQUBhCtETgb-e1khqcGjDYoWJw"
  ```

- Anonymous requests are blocked with HTTP 403 once redirected to
  `onedrive.live.com`. Authenticate before attempting to list the PDFs.

## Fetching metadata

Follow the same token export and helper commands outlined in the datasets share,
substituting this link:

```bash
tsx scripts/onedrive/dump-drive-item.ts \
  "https://1drv.ms/f/c/2ff0428a2f57c7a4/EiQLwT1h9XpJk-7gPXzswQUBhCtETgb-e1khqcGjDYoWJw" \
  docs/onedrive-shares/eiqlwt1h9xpjk-7gpxzswqubhctetgb-e1khqcgjdyowjw-folder.metadata.json
```

Record Graph responses to keep the PDF manifest aligned with upstream changes.
