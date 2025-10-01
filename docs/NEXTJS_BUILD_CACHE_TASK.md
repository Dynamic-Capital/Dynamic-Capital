# Enable Next.js Build Caching

## Summary

A recent Next.js build produced the warning
`⚠ No build cache found. Please configure build caching for faster rebuilds.`
Caching has been implemented for the `apps/web` Next.js application so repeated
builds run faster and the warning disappears.

## Acceptance Criteria

- CI and local builds persist the `apps/web/.next/cache` directory between runs.
- GitHub Actions use `actions/cache` or an equivalent approach with a cache key
  based on the lockfile hash.
- Documentation or configuration updates clearly describe the caching strategy.

## Notes

- GitHub Actions (`ci.yml`) restores and saves `apps/web/.next/cache` via
  `actions/cache@v3` with a key based on `package-lock.json` and
  `apps/web/package.json`.
- Docker builds can mount or copy `.next/cache` from a previous layer or shared
  volume.
- Set `NEXT_CACHE_DIR` if a custom cache location is required.
