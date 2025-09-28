# EskWDphQepxIhQmATzjdduUBkm_lSDXT-Jvm-1SmjJgFeA Share

This folder stores uploaded trading **reports** that complement the other
resource bundles. Keep its identifiers readily available for report ingestion
and auditing tasks.

## Share details

- **Original link:**
  https://1drv.ms/f/c/2ff0428a2f57c7a4/EskWDphQepxIhQmATzjdduUBkm_lSDXT-Jvm-1SmjJgFeA?e=kHBcZS
- **Graph share identifier:**
  `u!aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yZmYwNDI4YTJmNTdjN2E0L0Vza1dEcGhRZXB4SWhRbUFUempkZHVVQmttX2xTRFhULUp2bS0xU21qSmdGZUE`
- **Decoded parameters:**
  - `cid=2ff0428a2f57c7a4`
  - `resid=2FF0428A2F57C7A4!s980e16c97a50489c8509804f38dd76e5`

## Access notes

- Use a header-only request to capture the redirect metadata:

  ```bash
  curl -I "https://1drv.ms/f/c/2ff0428a2f57c7a4/EskWDphQepxIhQmATzjdduUBkm_lSDXT-Jvm-1SmjJgFeA"
  ```

- Authentication is required after redirection; anonymous browsing receives an
  HTTP 403 response.

## Fetching metadata

Export the current manifest for downstream reconciliations with:

```bash
tsx scripts/onedrive/dump-drive-item.ts \
  "https://1drv.ms/f/c/2ff0428a2f57c7a4/EskWDphQepxIhQmATzjdduUBkm_lSDXT-Jvm-1SmjJgFeA" \
  docs/onedrive-shares/eskwdphqepxihqmatzjdduubkm_lsdxt-jvm-1smjjgfea-folder.metadata.json
```
