## GitHub Conflict Scanner

The `npm run github:scan-conflicts` helper lists every open pull request that is
currently in a conflict state. Behind the scenes it calls
`scripts/github/scan-conflicts.ts`, which queries the GitHub GraphQL API and
prints a report summarizing the conflicted branches so you can prioritize clean
up work.

### Prerequisites

- A GitHub token with `repo` scope exported as `GITHUB_PAT` or `GITHUB_TOKEN`.
- The repository slug exposed through `GITHUB_REPOSITORY` (for example
  `export GITHUB_REPOSITORY=dynamic/some-repo`) or passed explicitly with
  `--repo <owner>/<name>`.
- Optional: a writable path for the JSON artifact when you want to persist the
  results (see [Generate a JSON report](#generate-a-json-report)).

### Basic usage

Run the scanner with npm:

```bash
npm run github:scan-conflicts
```

Pass `--help` (or `-h`) to see all supported CLI flags and environment
variables:

```bash
npm run github:scan-conflicts -- --help
```

If you do not export `GITHUB_REPOSITORY`, supply the repository explicitly:

```bash
npm run github:scan-conflicts -- --repo owner/name
```

### Interpreting the output

The script prints a summary followed by detailed entries for each conflicting
pull request:

```text
Scanning pull requests for owner/name...
Total open pull requests: 18 (GitHub reports 18)
Conflicting pull requests: 4
Unknown mergeability: 2

Conflicts by base branch:
  main: 3
  release/1.2: 1

Conflict details:
- #1234: Feature flag cleanup
  https://github.com/owner/name/pull/1234
  feature/cleanup -> main | mergeable=CONFLICTING | mergeState=DIRTY
  updated 2d ago | labels: needs-attention, release-blocker
```

- **Conflicts by base branch / author** quickly highlight hotspots that may
  need coordination.
- **Unknown mergeability** indicates PRs that GitHub has not yet evaluated.
  Re-run the command after a few minutes or trigger a re-run in the GitHub UI
  if they remain in that state.

### Generate a JSON report

Add `--json ./conflicts.json` to store the structured report locally for
follow-up triage or to share with other tools:

```bash
npm run github:scan-conflicts -- --repo owner/name --json ./conflicts.json
```

The JSON file includes the repository name, generation timestamp, totals, and a
list of each conflicting pull request with metadata (title, author, labels,
branches, mergeability flags).

### Recommended remediation workflow

1. Run the scanner and identify the conflicting pull requests.
2. Check out each branch locally, update it with the latest base branch, and
   resolve merge conflicts.
3. Push the resolved branch and re-run the scanner to ensure the conflict count
   drops to zero.
4. Share the optional JSON report with stakeholders who track merge readiness.

### Troubleshooting

- **"Repository not provided"** – Ensure `GITHUB_REPOSITORY` is set or pass a
  `--repo` flag when invoking the script.
- **Authentication errors** – Confirm the GitHub token environment variable is
  present and has the required scopes.
- **GitHub GraphQL error / access denied** – Verify the token has access to the
  repository and that the slug is correct.
- **Empty results** – Confirm there are open pull requests in a conflicted
  state for the target repository or expand the query to the relevant repo.
