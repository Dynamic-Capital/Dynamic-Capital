# Ejhj6-c4fJdOpaW-PHw5zL8BWuMO2lYzHwBRHbknD4GvbQ Share

This OneDrive folder houses both the trading **logs** and archived **model
artifacts** referenced in the latest upload. Track the identifiers here so the
platform can reconcile telemetry and model updates.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/Ejhj6-c4fJdOpaW-PHw5zL8BWuMO2lYzHwBRHbknD4GvbQ?e=6oC1xb
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0VqaGo2LWM0ZkpkT3BhVy1QSHc1ekw4Qld1TU8ybFl6SHdCUkhia25ENEd2YlE`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!se7eb63387c384e97a5a5be3c7c39ccbf`

## Access notes

- Capture the redirect header to confirm `resid` before wiring automation:

  ```bash
  curl -I "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ejhj6-c4fJdOpaW-PHw5zL8BWuMO2lYzHwBRHbknD4GvbQ"
  ```

- Authentication is required to browse the combined logs/models folder after the
  redirect.

## Fetching metadata

Use the shared helper scripts to export the folder manifest and child items:

```bash
tsx scripts/onedrive/dump-drive-item.ts \
  "https://1drv.ms/f/c/2ff0428a2f57c7a4/Ejhj6-c4fJdOpaW-PHw5zL8BWuMO2lYzHwBRHbknD4GvbQ" \
  docs/onedrive-shares/ejhj6-c4fjdopaw-phw5zl8bwumo2lyzhwbrhbknd4gvbq-folder.metadata.json
```
