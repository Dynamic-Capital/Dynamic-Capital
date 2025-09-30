# DeepSeek-V3.2-Exp vendor mirror

This folder documents how to retrieve the upstream
[deepseek-ai/DeepSeek-V3.2-Exp](https://github.com/deepseek-ai/DeepSeek-V3.2-Exp)
repository without vendoring its heavy sources directly inside the Dynamic
Capital monorepo.

## Why the sources are not vendored

The upstream project contains nearly 2,000 files and several hundred megabytes
of model tooling. Checking those assets into this repository dramatically
increases clone times, breaks shallow clones, and slows down CI jobs that only
need the Dynamic Capital codebase. By keeping the third-party project out of Git
and synchronising it on demand, the repository stays lightweight and developer
environments remain responsive.

## How to download or update the sources

Use the helper script to fetch a shallow copy of the upstream repository into
`third_party/DeepSeek-V3.2-Exp/source`:

```bash
# from the repository root
deno run -A scripts/sync-deepseek-v3-2.ts
```

The script will:

1. Create the `third_party/DeepSeek-V3.2-Exp/source` directory if it does not
   exist.
2. Clone the official repository with `--depth 1` on the first run.
3. Update the existing checkout with a fast-forward pull while keeping the
   history shallow on subsequent runs.

You can override the source repository by setting the `DEEPSEEK_V3_REPO`
environment variable before invoking the script, which is useful for testing
forks:

```bash
DEEPSEEK_V3_REPO=https://github.com/your-fork/DeepSeek-V3.2-Exp.git deno run -A scripts/sync-deepseek-v3-2.ts
```

Set `DEEPSEEK_V3_SHALLOW=false` if you need the full commit history instead of
the default shallow mirror.

## Working with the fetched repository

- The cloned contents live under `third_party/DeepSeek-V3.2-Exp/source` and are
  ignored by Git.
- Make local changes on a feature branch inside the cloned repository if needed;
  those changes will not be committed to Dynamic Capital unless explicitly
  copied over.
- Delete the `source` directory and rerun the sync script whenever you want to
  discard local changes or switch to a different fork.

Refer to the upstream project for licensing and usage guidelines.
