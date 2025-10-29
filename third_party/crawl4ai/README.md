# Crawl4AI (vendored)

This directory vendors a snapshot of the [crawl4ai](https://github.com/unclecode/crawl4ai)
project so it can be used directly from the Dynamic Capital toolchain without requiring a
Git submodule checkout. The upstream revision included here is:

- Commit: `e651e045c44201c83ae68f3ef4858303533f18d9`
- Retrieved: 2025-10-01

Only the Python package under `crawl4ai/` has been copied, alongside the upstream license.
Refer to the upstream repository for documentation, release notes, and issue tracking.

## Updating

If you need a newer version:

1. Clone the upstream repository.
2. Replace the contents of `third_party/crawl4ai/crawl4ai` with the new package files.
3. Update this README with the new commit hash and retrieval date.
4. Run the Dynamic Capital formatting and test suites before committing.

