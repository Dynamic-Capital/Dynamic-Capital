# EToElNePqHhHiis2vl7QE_ABZ618nQf2vgNrykCx0PrHwA Share

The `read_me.md` document for the trading upload is shared separately as a text
file. Use this reference to retrieve it for onboarding or archival purposes.

## Share details

- **Original link:**
  https://1drv.ms/t/c/2ff0428a2f57c7a4/EToElNePqHhHiis2vl7QE_ABZ618nQf2vgNrykCx0PrHwA?e=8efbYM
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL3QvYy8yZmYwNDI4YTJmNTdjN2E0L0VUb0VsTmVQcUhoSGlpczJ2bDdRRV9BQlo2MThuUWYydmdOcnlrQ3gwUHJId0E`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!sd794043aa88f47788a2b36be5ed013f0`
  - `ithint=file,txt`

## Access notes

- Inspect the redirect headers to copy the `resid` and `ithint` metadata:

  ```bash
  curl -I "https://1drv.ms/t/c/2ff0428a2f57c7a4/EToElNePqHhHiis2vl7QE_ABZ618nQf2vgNrykCx0PrHwA"
  ```

- The text file also requires authentication once redirected to OneDrive.

## Fetching metadata

When dumping the item metadata, target a `.file.metadata.json` path to
acknowledge the single-document scope:

```bash
tsx scripts/onedrive/dump-drive-item.ts \
  "https://1drv.ms/t/c/2ff0428a2f57c7a4/EToElNePqHhHiis2vl7QE_ABZ618nQf2vgNrykCx0PrHwA" \
  docs/onedrive-shares/etoelnepqhhhiis2vl7qe_abz618nqf2vgnrykcx0prhwa-file.metadata.json
```
