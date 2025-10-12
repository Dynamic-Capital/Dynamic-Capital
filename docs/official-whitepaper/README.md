# Official White Paper Archive

This directory maintains the retrieval instructions, source metadata, and
checksums for the canonical Dynamic Capital white paper PDF without checking the
binary into the repository. Keeping only lightweight collateral avoids bloating
the Git history while still allowing contributors to pull the exact artifact on
demand.

## Source

- **Document:** Official Dynamic Capital white paper (10 Nov 2025 edition)
- **Upstream URL:**
  https://qeejuomcapbdlhnjqjcc.supabase.co/storage/v1/object/public/bot-media/Official-white-paper-10-11-2025.pdf
- **Retrieved:** 2025-10-12 (UTC)

## Retrieval

Use the helper script in this directory to download and verify the PDF:

```bash
cd docs/official-whitepaper
./download-official-whitepaper.sh
```

The script accepts an optional destination path as its first argument. It will
exit with an error if neither `curl` nor `wget` is available or if the
downloaded file fails checksum verification.

## Checksum

- **SHA-256:**
  `dae8ad6065a402965a808f0172b993b3fecb7c73b61f1c9aed6eb3a8bb448ab5`

## Maintenance Notes

- Replace the download URL and checksum when a new official edition ships.
- Regenerate the Markdown white paper via `npm run docs:whitepapers` if the
  structured content in `content/whitepapers/` is updated alongside the PDF.
