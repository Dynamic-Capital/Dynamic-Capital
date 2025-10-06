## GitHub Conflict Scanner

The `npm run github:scan-conflicts` helper lists every open pull request that is
currently in a conflict state. The script queries the GitHub GraphQL API and
prints a short report that includes the branch name, labels, and timestamps for
each conflicted PR.

### Prerequisites

- A GitHub token with `repo` scope exported as `GITHUB_PAT` or `GITHUB_TOKEN`.
- The repository slug exposed through `GITHUB_REPOSITORY` or passed as a CLI
  argument via `--repo <owner>/<name>`.

### Usage

Run the scanner with npm:

```bash
npm run github:scan-conflicts
```

If you do not export `GITHUB_REPOSITORY`, supply the repository explicitly:

```bash
npm run github:scan-conflicts -- --repo owner/name
```

Add `--json ./conflicts.json` to store the structured report locally for
follow-up triage:

```bash
npm run github:scan-conflicts -- --repo owner/name --json ./conflicts.json
```

### Troubleshooting

- **"Repository not provided"** – Ensure `GITHUB_REPOSITORY` is set or pass a
  `--repo` flag when invoking the script.
- **Authentication errors** – Confirm the GitHub token environment variable is
  present and has the required scopes.
- **Empty results** – Verify there are open pull requests in a conflicted state
  for the target repository.
