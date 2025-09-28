# Eq5pNm_TcvdNgGzwqER7MZUBpQvLwljACC8dT8IKE04U9A Share

This folder is the external **knowledge base** that augments the trading
assistant's reasoning. Store its identifiers here so automations can hydrate the
local cache when upstream documents change.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/Eq5pNm_TcvdNgGzwqER7MZUBpQvLwljACC8dT8IKE04U9A?e=3XpkSi
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VxNXBObV9UY3ZkTmdHendxRVI3TVpVQnBRdkx3bGpBQ0M4ZFQ4SUtFMDRVOUE`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!s6f3669ae72d34df7806cf0a8447b3195`

## Access notes

- Run a header-only request to reveal the `resid` parameter before Graph calls:

  ```bash
  curl -I "https://1drv.ms/f/c/2ff0428a2f57c7a4/Eq5pNm_TcvdNgGzwqER7MZUBpQvLwljACC8dT8IKE04U9A"
  ```

- As with the other shares, anonymous redirects currently return HTTP 403.
  Acquire the proper credentials before attempting to read contents.

## Fetching metadata

Use the shared scripts with this link to capture the latest manifest and child
items for offline search:

```bash
tsx scripts/onedrive/dump-drive-item.ts \
  "https://1drv.ms/f/c/2ff0428a2f57c7a4/Eq5pNm_TcvdNgGzwqER7MZUBpQvLwljACC8dT8IKE04U9A" \
  docs/onedrive-shares/eq5pnm_tcvdnggzwqer7mzubpqvlwljacc8dt8ike04u9a-folder.metadata.json
```
