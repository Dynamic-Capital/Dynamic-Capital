# llama.cpp Vendor Snapshot

Dynamic Capital vendors a curated snapshot of
[ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) to power on-premise
language tooling. The full sources are not committed to this repository; instead
we materialize them on demand using the helper script below.

## How to Sync

```bash
# Fetch the pinned commit and populate third_party/llama.cpp/vendor
deno run -A scripts/sync-llama-cpp.ts --force
```

The script pins the checkout to commit
`72b24d96c6888c609d562779a23787304ae4609c` and prunes auxiliary assets
(bindings, docs, CI configs) so the runtime footprint stays lean. The resolved
metadata lives in `version.json` for downstream automation.

## Local Layout

After running the sync command you will have the following structure:

```
third_party/llama.cpp/
├── README.md
├── version.json
└── vendor/
    ├── CMakeLists.txt
    ├── common/
    ├── ggml/
    ├── include/
    ├── src/
    ├── examples/server/
    └── ...
```

The `vendor` directory is intentionally ignored by Git so local builds can
customize or clean the checkout without polluting commits.
