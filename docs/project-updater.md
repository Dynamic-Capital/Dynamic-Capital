# Project Updater Automation

The Dynamic Capital repository includes a lightweight automation suite that
refreshes release documentation, metadata, and project boards after each deploy.
The tooling is intended to be idempotent so it can safely re-run without
duplicating entries.

## Responsibilities

- Collect commits using the conventional commit format between the previous tag
  and the current `HEAD`.
- Generate release notes, update the changelog, and capture a highlight summary.
- Refresh README badges and the "What's New" section.
- Maintain the public feature registry and roadmap.
- Synchronize the GitHub Projects (v2) board and annotate relevant pull
  requests.

## Running manually

```bash
VERSION=vX.Y.Z npm run proj:update-all
```

Pass the version either with the `VERSION` environment variable or via
`--version` when running the individual scripts. The scripts expect the GitHub
CLI (`gh`) to be installed when project board updates or release announcements
are required. When `GH_TOKEN`, `PROJECT_OWNER`, or `PROJECT_NUMBER` are not
present the scripts log a warning and exit without making remote changes.

## Override behavior

If the automation cannot represent a special-case release, edit the affected
document manually and add a note so future runs are aware of the exception. The
scripts avoid overwriting manual edits outside of their marked sections.
