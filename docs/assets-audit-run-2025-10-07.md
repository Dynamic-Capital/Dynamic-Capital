# Assets Audit Workflow Run – 2025-10-07

## Summary

- Executed `scripts/cleanup/report.sh` to mirror the **Assets Audit** GitHub
  Actions workflow locally.
- Used placeholder Supabase credentials (`https://example.com`, `dummy`) because
  production secrets are unavailable in this environment.
- No duplicate files were reported.
- 423 potential orphan documents were flagged; these are likely false positives
  because the reference map was not generated for this ad-hoc run.

## Command Log

```bash
npm ci
SUPABASE_URL=https://example.com \
SUPABASE_SERVICE_ROLE_KEY=dummy \
bash scripts/cleanup/report.sh
```

## Output Artifacts

- `.out/assets_audit_report.md`
- `.out/orphans.txt`
- `.out/removal_candidates_supabase_checked.txt`

> **Note:** The Supabase cross-check step returned HTTP 404 responses (expected
> with the placeholder URL). Production runs should use real credentials to
> avoid these warnings and to capture accurate database references.
