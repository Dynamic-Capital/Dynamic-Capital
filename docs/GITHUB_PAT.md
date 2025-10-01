# GitHub Personal Access Tokens

Use a GitHub Personal Access Token (PAT) to authenticate when pushing changes or
running CI tasks that need elevated permissions.

## Create a minimal-scope PAT

1. Visit [github.com/settings/tokens](https://github.com/settings/tokens) and
   choose **Fine-grained tokens**.
2. Select only the scopes required:
   - For local pushes and PRs: `Contents: read & write`.
   - For CI automation: `Contents`, `Pull requests`, and any additional scopes
     the workflow needs.
3. Set an expiration date and copy the token once.

## Configure local tooling

### Git CLI

```bash
# store token for this repo only
cd /path/to/clone
git config credential.helper store
# the next push will prompt for username and PAT once
```

### GitHub CLI

```bash
echo "<your PAT>" | gh auth login --with-token
```

### Environment variable

```bash
export GITHUB_TOKEN=<your PAT>
```

Avoid committing the token or embedding it in remote URLs.

## Using PAT in GitHub Actions

Workflows that require more permissions than the default `GITHUB_TOKEN` should
use the `PAT_WORKFLOW` secret:

```yaml
env:
  GH_TOKEN: ${{ secrets.PAT_WORKFLOW }}
```

Set "Require approval for third‑party access" on the secret to limit exposure.

### Rotating the token

1. Revoke the old PAT on GitHub and create a new one.
2. Update the repository secret `PAT_WORKFLOW` with the new token.
3. Re-run failed workflows to confirm the new token works.
