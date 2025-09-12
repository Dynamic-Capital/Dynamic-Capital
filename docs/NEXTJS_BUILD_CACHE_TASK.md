# Enable Next.js Build Caching

## Summary
A recent Next.js build produced the warning `⚠ No build cache found. Please configure build caching for faster rebuilds.` Implement caching for the `apps/web` Next.js application so repeated builds run faster and the warning disappears.

## Acceptance Criteria
- CI and local builds persist the `apps/web/.next/cache` directory between runs.
- GitHub Actions use `actions/cache` or an equivalent approach with a cache key based on the lockfile hash.
- Documentation or configuration updates clearly describe the caching strategy.

## Notes
- Example GitHub Actions snippet:
  ```yaml
  - uses: actions/cache@v3
    with:
      path: apps/web/.next/cache
      key: ${{ runner.os }}-nextjs-${{ hashFiles('apps/web/package-lock.json') }}
  ```
- Docker builds can mount or copy `.next/cache` from a previous layer or shared volume.
- Set `NEXT_CACHE_DIR` if a custom cache location is required.
